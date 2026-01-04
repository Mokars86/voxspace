import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Phone, Video, MoreVertical, Loader2, Clock, Trash2
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../services/supabase';
import MessageBubble, { ChatMessage } from '../../components/chat/MessageBubble';
import ChatInput from '../../components/chat/ChatInput';
import ForwardModal from '../../components/chat/ForwardModal';
import CallOverlay from '../../components/chat/CallOverlay';

import { useWebRTC } from '../../hooks/useWebRTC';
import { useNotifications } from '../../context/NotificationContext';

interface Message extends ChatMessage { }

interface ErrorBoundaryProps {
    children: React.ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: any;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    public state: ErrorBoundaryState = { hasError: false, error: null };


    static getDerivedStateFromError(error: any) {
        return { hasError: true, error };
    }

    componentDidCatch(error: any, errorInfo: any) {
        console.error("ChatRoom Error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="p-4 text-center text-red-500">
                    <h2>Something went wrong.</h2>
                    <pre className="text-xs text-left overflow-auto mt-2 bg-gray-100 p-2 border">
                        {this.state.error?.toString()}
                    </pre>
                    <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded">
                        Reload
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

const safeDate = (dateStr: string) => {
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return "";
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
        return "";
    }
};

const ChatRoom: React.FC = () => {
    const { id: chatId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [chatName, setChatName] = useState('Chat');
    const [chatAvatar, setChatAvatar] = useState('');
    const [otherUserId, setOtherUserId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [participantStatus, setParticipantStatus] = useState<'accepted' | 'pending' | 'rejected' | 'blocked'>('accepted');
    const [replyTo, setReplyTo] = useState<any>(null);
    const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
    const listRef = useRef<HTMLDivElement>(null);
    const channelRef = useRef<any>(null);
    const [isBuzzing, setIsBuzzing] = useState(false);
    const typingTimeoutRef = useRef<any>(null);
    const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);
    const [previewMedia, setPreviewMedia] = useState<{ url: string, type: 'image' | 'video' } | null>(null);
    const [disappearingDuration, setDisappearingDuration] = useState(0); // in minutes

    const {
        callState,
        callerInfo,
        isMuted,
        isVideoEnabled,
        isVideoCall,
        localStream,
        remoteStream,
        startCall,
        answerCall,
        endCall,
        handleSignal,
        toggleMute,
        toggleVideo
    } = useWebRTC(user, chatId);
    const { sentMessageSound } = useNotifications();

    // Use useLayoutEffect for smoother initial scroll preventing flash
    React.useLayoutEffect(() => {
        if (listRef.current) {
            // If it's the first load (or very big change), we might want immediate scroll
            // For now, keeping smooth for new messages, but we could detect "initial load" logic more robustly if needed.
            // Actually for "opening the chat", instant is better.
            const isInitialLoad = messages.length > 0 && loading;
            listRef.current.scrollTop = listRef.current.scrollHeight;
        }
    }, [messages, loading]);

    useEffect(() => {
        if (!user || !chatId) {
            setLoading(false);
            return;
        }

        const fetchChatDetails = async () => {
            setLoading(true);
            try {
                // Fetch Chat Info
                const { data: chatData, error: chatError } = await supabase
                    .from('chats')
                    .select('name, is_group, disappearing_duration')
                    .eq('id', chatId)
                    .single();

                if (chatError) throw chatError;

                // Fetch MY status
                const { data: myParticipant } = await supabase
                    .from('chat_participants')
                    .select('status')
                    .eq('chat_id', chatId)
                    .eq('user_id', user.id)
                    .single();

                if (myParticipant) setParticipantStatus(myParticipant.status);

                if (chatData.is_group) {
                    setChatName(chatData.name);
                    // Group logic simplified/removed for now
                }

                if (chatData.disappearing_duration) {
                    setDisappearingDuration(chatData.disappearing_duration);
                }

                else {
                    const { data: participants } = await supabase
                        .from('chat_participants')
                        .select('user_id, profiles(full_name, avatar_url)')
                        .eq('chat_id', chatId)
                        .neq('user_id', user.id)
                        .single();

                    if (participants?.profiles) {
                        const profile: any = Array.isArray(participants.profiles) ? participants.profiles[0] : participants.profiles;
                        setChatName(profile.full_name);
                        setChatAvatar(profile.avatar_url);
                        setOtherUserId(participants.user_id);
                    }
                }

                await fetchMessages();

                // Mark as Read
                await supabase
                    .from('chat_participants')
                    .update({ last_read_at: new Date().toISOString() })
                    .eq('chat_id', chatId)
                    .eq('user_id', user.id);

                // Subscribe to real-time updates for messages and presence
                const channel = supabase
                    .channel(`chat:${chatId}`)
                    .on('postgres_changes',
                        { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` },
                        (payload) => handleNewMessage(payload.new)
                    )
                    .on('broadcast', { event: 'signal' }, (payload) => handleSignal(payload.payload))
                    .on('broadcast', { event: 'new_message' }, (payload) => handleNewMessage(payload.payload))
                    .on('presence', { event: 'sync' }, () => {
                        const state = channel.presenceState();
                        const typing = new Set<string>();
                        Object.values(state).forEach((presences: any) => {
                            presences.forEach((p: any) => {
                                if (p.typing && p.user_id !== user.id) {
                                    typing.add(p.full_name || 'Someone');
                                }
                            });
                        });
                        setTypingUsers(typing);
                    })
                    .subscribe(async (status) => {
                        if (status === 'SUBSCRIBED') {
                            await channel.track({
                                user_id: user.id,
                                full_name: user.user_metadata?.full_name || 'User',
                                typing: false
                            });
                        }
                    });

                channelRef.current = channel;

                return () => {
                    supabase.removeChannel(channel);
                };

            } catch (error) {
                console.error("Error loading chat:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchChatDetails();
    }, [user, chatId]);

    const handleNewMessage = (newMsgRaw: any) => {
        if (newMsgRaw.sender_id === user?.id) return; // handled locally

        // Check expiration
        if (newMsgRaw.expires_at && new Date(newMsgRaw.expires_at) < new Date()) return;

        setMessages(prev => {
            if (prev.some(m => m.id === newMsgRaw.id)) return prev;

            const incomingMsg: Message = {
                id: newMsgRaw.id,
                text: newMsgRaw.content,
                sender: 'them',
                time: safeDate(newMsgRaw.created_at),
                type: newMsgRaw.type || 'text',
                status: 'read',
                mediaUrl: newMsgRaw.media_url,
                metadata: newMsgRaw.metadata,
                expiresAt: newMsgRaw.expires_at,
                viewOnce: newMsgRaw.view_once,
                isViewed: newMsgRaw.is_viewed,
                replyTo: newMsgRaw.reply_to_id ? getLastMessage(newMsgRaw.reply_to_id) : undefined
            };
            if (newMsgRaw.type === 'buzz') {
                triggerBuzz();
            }
            return [...prev, incomingMsg];
        });
    };

    const triggerBuzz = () => {
        setIsBuzzing(true);
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate([400, 100, 400]); // Stronger vibration
        }
        setTimeout(() => setIsBuzzing(false), 1000);
    };

    // Helper to find reply context locally (simplified)
    const getLastMessage = (id: string) => {
        // In real app, might need to fetch if not in current list
        return undefined; // Placeholder
    };

    const fetchMessages = async () => {
        if (!chatId || !user) return;

        // Join with reactions if possible or fetch separately. 
        // For simplicity, fetching messages raw.
        const { data, error } = await supabase
            .from('messages')
            .select(`
                *,
                message_reactions(reaction, user_id)
            `)
            .eq('chat_id', chatId)
            .order('created_at', { ascending: true });

        if (!error && data) {
            const formatted: Message[] = data.map((m: any) => {
                // Process Reactions
                const reactions: { [key: string]: number } = {};
                m.message_reactions?.forEach((r: any) => {
                    reactions[r.reaction] = (reactions[r.reaction] || 0) + 1;
                });

                return {
                    id: m.id,
                    text: m.content,
                    sender: m.sender_id === user.id ? 'me' : 'them',
                    time: safeDate(m.created_at),
                    type: m.type || 'text',
                    status: 'read',
                    mediaUrl: m.media_url,
                    metadata: m.metadata,
                    reactions: reactions,
                    isDeleted: m.is_deleted,
                    expiresAt: m.expires_at,
                    viewOnce: m.view_once,
                    isViewed: m.is_viewed
                };
            });
            setMessages(formatted);
        }
    };

    const handleSend = async (content: string, type: 'text' | 'image' | 'video' | 'voice' | 'buzz' | 'location' | 'audio' | 'file', file?: File, duration?: number, metadata?: any) => {
        if (!user || !chatId) return;

        let mediaUrl = '';

        // 1. Upload File if present
        if (file) {
            const ext = file.name.split('.').pop();
            const fileName = `${Date.now()}.${ext}`;
            const filePath = `${chatId}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('chat-attachments')
                .upload(filePath, file);

            if (uploadError) {
                console.error("Upload failed", uploadError);
                return;
            }

            const { data } = supabase.storage.from('chat-attachments').getPublicUrl(filePath);
            mediaUrl = data.publicUrl;
        }

        // Construct metadata object
        const finalMetadata = { ...metadata };
        if (duration) finalMetadata.duration = duration;

        // Disappearing Messages
        let expiresAt = null;
        if (disappearingDuration > 0) {
            expiresAt = new Date(Date.now() + disappearingDuration * 60 * 1000).toISOString();
        }

        const messageId = crypto.randomUUID();

        const optimisticMsg: Message = {
            id: messageId,
            text: content,
            sender: 'me',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            type: type,
            status: 'sent',
            mediaUrl: mediaUrl,
            metadata: finalMetadata,
            expiresAt: expiresAt || undefined,
            replyTo: replyTo ? { id: replyTo.id, text: replyTo.text, sender: replyTo.sender } : undefined
        };

        setMessages([...messages, optimisticMsg]);
        setReplyTo(null); // Clear reply context

        // Broadcast immediately for speed
        if (channelRef.current) {
            channelRef.current.send({
                type: 'broadcast',
                event: 'new_message',
                payload: {
                    id: messageId,
                    chat_id: chatId,
                    sender_id: user.id,
                    content: content,
                    type: type,
                    media_url: mediaUrl,
                    metadata: finalMetadata,
                    expires_at: expiresAt,
                    view_once: finalMetadata.viewOnce, // Will be set in next step
                    reply_to_id: replyTo?.id,
                    created_at: new Date().toISOString()
                }
            });
        }

        try {
            const { error } = await supabase.from('messages').insert({
                id: messageId,
                chat_id: chatId,
                sender_id: user.id,
                content: content,
                type: type,
                media_url: mediaUrl,
                metadata: finalMetadata,
                expires_at: expiresAt,
                view_once: finalMetadata.viewOnce,
                reply_to_id: replyTo?.id
            });

            if (error) throw error;

            // Allow immediate re-typing trigger if needed, but typically sending stops typing
            if (channelRef.current) {
                await channelRef.current.track({ user_id: user.id, full_name: user.user_metadata?.full_name, typing: false });
            }

            // Play Sound
            if (sentMessageSound && sentMessageSound !== 'none') {
                const audio = new Audio(`/sounds/${sentMessageSound}.mp3`);
                audio.play().catch(e => console.error("Error playing sent sound", e));
            }
        } catch (error: any) {
            console.error("Failed to send message", error);
            alert(`Message failed to send: ${error?.message || 'Unknown error'}`);
        }
    };

    const handleDeleteMessage = async (msgId: string) => {
        if (!confirm("Delete this message?")) return;
        setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isDeleted: true } : m));
        await supabase.from('messages').update({ is_deleted: true, deleted_at: new Date().toISOString() }).eq('id', msgId);
    };

    const handleEditMessage = async (msgId: string, newText: string) => {
        setMessages(prev => prev.map(m => m.id === msgId ? { ...m, text: newText, isEdited: true } : m));
        await supabase.from('messages').update({ content: newText, is_edited: true }).eq('id', msgId);
    };

    const handleReaction = async (msgId: string, reaction: string) => {
        // Optimistic UI update could go here
        try {
            const { error } = await supabase.rpc('toggle_reaction', {
                p_message_id: msgId,
                p_reaction: reaction
            });
            if (error) throw error;
            // Refetch or wait for realtime subscription to update reactions (needs detailed subscription)
        } catch (e) {
            console.error("Reaction failed", e);
        }
    };

    const handleForwardToChats = async (targetChatIds: string[]) => {
        if (!forwardingMessage || !user) return;

        const promises = targetChatIds.map(targetId => {
            return supabase.from('messages').insert({
                chat_id: targetId,
                sender_id: user.id,
                content: forwardingMessage.text,
                type: forwardingMessage.type,
                media_url: forwardingMessage.mediaUrl,
                metadata: { ...forwardingMessage.metadata, forwarded: true }
            });
        });

        await Promise.all(promises);
        setReplyTo(null); // Just close/reset things
        alert("Message forwarded!");
    };

    const handleTyping = async () => {
        if (!channelRef.current || !user) return;

        // If no timer is running, it means we weren't previously marked as typing.
        // So we send the "true" status now.
        if (!typingTimeoutRef.current) {
            await channelRef.current.track({
                user_id: user.id,
                full_name: user.user_metadata?.full_name || 'User',
                typing: true
            });
        }

        // Clear any existing timer to restart the countdown
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        // Set a new timer to mark as "not typing" after 3 seconds of inactivity
        typingTimeoutRef.current = setTimeout(async () => {
            if (channelRef.current) {
                await channelRef.current.track({
                    user_id: user.id,
                    full_name: user.user_metadata?.full_name || 'User',
                    typing: false
                });
                typingTimeoutRef.current = null;
            }
        }, 3000);
    };

    // Theme Context
    // const { colorTheme, setColorTheme } = useTheme();
    const [showMenu, setShowMenu] = useState(false);
    // const [showThemePicker, setShowThemePicker] = useState(false);

    const handleViewOnce = async (msg: Message) => {
        if (!msg.mediaUrl) return;

        // Mark as viewed immediately
        if (!msg.isViewed && msg.sender !== 'me') {
            // Optimistic update
            setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isViewed: true } : m));

            await supabase.from('messages').update({ is_viewed: true, metadata: { ...msg.metadata, is_viewed: true } }).eq('id', msg.id);
        }

        // Open Preview
        setPreviewMedia({
            url: msg.mediaUrl,
            type: msg.type === 'video' ? 'video' : 'image'
        });
    };

    const handleClearChat = async () => {
        if (!confirm("Are you sure you want to clear this chat? This will remove all messages for everyone (prototype behavior).")) return;

        try {
            // Simplified: utilizing existing 'is_deleted' flag or deleting rows
            // For a prototype, we'll mark all fetched messages as deleted
            const promises = messages.map(m =>
                supabase.from('messages').update({ is_deleted: true }).eq('id', m.id)
            );
            await Promise.all(promises);
            setMessages([]); // clear locally
            setShowMenu(false);
        } catch (e) {
            console.error("Clear chat failed", e);
            alert("Failed to clear chat");
        }
    };

    return (
        <ErrorBoundary>
            <div className={cn("flex flex-col h-[100dvh] w-full max-w-full bg-[#f0f2f5] dark:bg-black transition-transform fixed inset-0 overflow-hidden", isBuzzing && "animate-[spin_0.5s_ease-in-out]")}>
                <style>{`
                @keyframes shake {
                    0% { transform: translate(1px, 1px) rotate(0deg); }
                    10% { transform: translate(-1px, -2px) rotate(-1deg); }
                    20% { transform: translate(-3px, 0px) rotate(1deg); }
                    30% { transform: translate(3px, 2px) rotate(0deg); }
                    40% { transform: translate(1px, -1px) rotate(1deg); }
                    50% { transform: translate(-1px, 2px) rotate(-1deg); }
                    60% { transform: translate(-3px, 1px) rotate(0deg); }
                    70% { transform: translate(3px, 1px) rotate(-1deg); }
                    80% { transform: translate(-1px, -1px) rotate(1deg); }
                    90% { transform: translate(1px, 2px) rotate(0deg); }
                    100% { transform: translate(1px, -2px) rotate(-1deg); }
                }
            `}</style>
                <div className={cn("flex flex-col h-full bg-inherit", isBuzzing && "animate-[shake_0.5s_ease-in-out_infinite]")}>
                    {/* Header */}
                    <header className="px-4 py-3 bg-white dark:bg-gray-900 flex items-center justify-between shadow-sm z-50 border-b border-gray-100 dark:border-gray-800 absolute top-0 w-full">
                        <div className="flex items-center gap-3">
                            <button onClick={() => navigate(-1)} className="hover:bg-gray-100 dark:hover:bg-gray-800 p-2 rounded-full transition-colors">
                                <ArrowLeft size={24} className="text-gray-900 dark:text-gray-100" />
                            </button>
                            <div className="flex items-center gap-3">
                                <div
                                    className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center font-bold text-gray-500 dark:text-gray-300 overflow-hidden cursor-pointer"
                                    onClick={() => otherUserId && navigate(`/user/${otherUserId}`)}
                                >
                                    {chatAvatar ? <img src={chatAvatar} className="w-full h-full object-cover" alt="avatar" /> : chatName[0]}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-gray-900 dark:text-gray-100 leading-tight truncate">{chatName}</h3>
                                    <p className="text-xs text-green-500 font-medium">Online</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <button onClick={() => startCall(true)} className="hover:bg-gray-100 dark:hover:bg-gray-800 p-2 rounded-full transition-colors">
                                <Video size={24} className="text-[#ff1744]" />
                            </button>
                            <button onClick={() => startCall(false)} className="hover:bg-gray-100 dark:hover:bg-gray-800 p-2 rounded-full transition-colors">
                                <Phone size={22} className="text-[#ff1744]" />
                            </button>

                            <div className="relative">
                                <button
                                    onClick={() => setShowMenu(!showMenu)}
                                    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                >
                                    <MoreVertical size={24} className="text-gray-900 dark:text-gray-100" />
                                </button>

                                {showMenu && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                                        <div className="absolute top-10 right-0 z-50 bg-white dark:bg-gray-800 rounded-xl shadow-xl w-64 border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in duration-200 overflow-hidden">

                                            <div className="py-1">
                                                <button
                                                    onClick={async () => {
                                                        const input = prompt("Set disappearing messages (minutes)? Enter 0 to disable.", disappearingDuration.toString());
                                                        if (input !== null) {
                                                            const duration = parseInt(input);
                                                            if (!isNaN(duration)) {
                                                                setDisappearingDuration(duration);
                                                                await supabase.from('chats').update({ disappearing_duration: duration }).eq('id', chatId);
                                                                alert(`Disappearing messages set to ${duration} minutes.`);
                                                            }
                                                        }
                                                        setShowMenu(false);
                                                    }}
                                                    className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 text-sm text-gray-700 dark:text-gray-200"
                                                >
                                                    <Clock size={16} /> Disappearing Messages
                                                </button>
                                                <button
                                                    onClick={handleClearChat}
                                                    className="w-full text-left px-4 py-3 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-3 text-sm text-red-500"
                                                >
                                                    <Trash2 size={16} /> Clear Chat
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </header>

                    {/* Messages Area */}
                    <div
                        ref={listRef}
                        className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-4 pt-20 bg-[#e5ddd5] dark:bg-black"
                    >
                        {loading ? (
                            <div className="flex justify-center pt-24"><Loader2 className="animate-spin text-gray-500" /></div>
                        ) : (
                            <>
                                {messages.map((msg) => (
                                    <MessageBubble
                                        key={msg.id}
                                        message={msg}
                                        onReact={handleReaction}
                                        onSwipeReply={(m: any) => setReplyTo(m)}
                                        onEdit={handleEditMessage}
                                        onDelete={handleDeleteMessage}
                                        onForward={(m) => setForwardingMessage(m)}
                                        onMediaClick={(url, type) => setPreviewMedia({ url, type: type as 'image' | 'video' })}
                                        onViewOnce={handleViewOnce}
                                    />
                                ))}
                                {typingUsers.size > 0 && (
                                    <div className="flex items-center gap-2 text-xs text-gray-500 ml-4 mb-2 animate-pulse">
                                        <div className="flex gap-1">
                                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-0" />
                                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-100" />
                                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-200" />
                                        </div>
                                        <span>{Array.from(typingUsers).join(', ')} is typing...</span>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* Input Area */}
                    {!loading && participantStatus === 'accepted' ? (
                        <ChatInput
                            onSend={handleSend}
                            onTyping={handleTyping}
                            replyTo={replyTo}
                            onCancelReply={() => setReplyTo(null)}
                        />
                    ) : !loading && (
                        <div className="p-6 bg-white border-t border-gray-200 text-center safe-bottom">
                            {participantStatus === 'blocked'
                                ? <p className="text-gray-500">You have blocked this user.</p>
                                : <p className="text-gray-500">Request pending.</p>
                            }
                        </div>
                    )}
                </div>

                <ForwardModal
                    isOpen={!!forwardingMessage}
                    onClose={() => setForwardingMessage(null)}
                    onSend={handleForwardToChats}
                />

                <CallOverlay
                    isOpen={callState !== 'idle'}
                    state={callState}
                    callerName={callerInfo?.name || chatName}
                    callerAvatar={callerInfo?.avatar || chatAvatar}
                    isAudioEnabled={!isMuted}
                    isVideoEnabled={isVideoEnabled}
                    isVideoCall={isVideoCall || false}
                    localStream={localStream}
                    remoteStream={remoteStream}
                    onToggleAudio={toggleMute}
                    onToggleVideo={toggleVideo}
                    onAccept={answerCall}
                    onReject={endCall}
                    onHangup={endCall}
                />

                {/* Media Preview Modal */}
                {previewMedia && (
                    <div
                        className="fixed inset-0 z-[60] bg-black flex items-center justify-center animate-in fade-in duration-200"
                        onClick={() => setPreviewMedia(null)}
                    >
                        <button className="absolute top-4 right-4 text-white p-2 rounded-full bg-black/50 hover:bg-black/70">
                            <ArrowLeft size={24} />
                        </button>
                        {previewMedia.type === 'video' ? (
                            <video
                                src={previewMedia.url}
                                controls
                                autoPlay
                                className="max-w-full max-h-screen"
                                onClick={(e) => e.stopPropagation()}
                            />
                        ) : (
                            <img
                                src={previewMedia.url}
                                className="max-w-full max-h-screen object-contain"
                                alt="Preview"
                            />
                        )}
                    </div>
                )}
            </div>
        </ErrorBoundary>
    );
};
export default ChatRoom;
