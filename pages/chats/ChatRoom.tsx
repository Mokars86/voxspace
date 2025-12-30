import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Phone, Video, MoreVertical, Loader2, ShieldAlert,
    Info, Users, Image as ImageIcon, VolumeX, LogOut, CheckCircle2
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';
import MessageBubble, { ChatMessage } from '../../components/chat/MessageBubble';
import ChatInput from '../../components/chat/ChatInput';

interface Message extends ChatMessage { }

const ChatRoom: React.FC = () => {
    const { id: chatId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [chatName, setChatName] = useState('Chat');
    const [chatAvatar, setChatAvatar] = useState('');
    const [loading, setLoading] = useState(true);
    const [participantStatus, setParticipantStatus] = useState<'accepted' | 'pending' | 'rejected' | 'blocked'>('accepted');
    const [replyTo, setReplyTo] = useState<any>(null);
    const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
    const listRef = useRef<HTMLDivElement>(null);
    const channelRef = useRef<any>(null);
    const [isBuzzing, setIsBuzzing] = useState(false);
    const typingTimeoutRef = useRef<any>(null);

    useEffect(() => {
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
    }, [messages.length]);

    useEffect(() => {
        if (!user || !chatId) return;

        const fetchChatDetails = async () => {
            setLoading(true);
            try {
                // Fetch Chat Info
                const { data: chatData, error: chatError } = await supabase
                    .from('chats')
                    .select('name, is_group')
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
                } else {
                    const { data: participants } = await supabase
                        .from('chat_participants')
                        .select('profiles(full_name, avatar_url)')
                        .eq('chat_id', chatId)
                        .neq('user_id', user.id)
                        .single();

                    if (participants?.profiles) {
                        const profile: any = Array.isArray(participants.profiles) ? participants.profiles[0] : participants.profiles;
                        setChatName(profile.full_name);
                        setChatAvatar(profile.avatar_url);
                    }
                }

                await fetchMessages();

                // Subscribe to real-time updates for messages and presence
                const channel = supabase
                    .channel(`chat:${chatId}`)
                    .on('postgres_changes',
                        { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` },
                        (payload) => handleNewMessage(payload.new)
                    )
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

        const incomingMsg: Message = {
            id: newMsgRaw.id,
            text: newMsgRaw.content,
            sender: 'them',
            time: new Date(newMsgRaw.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            type: newMsgRaw.type || 'text',
            status: 'read',
            mediaUrl: newMsgRaw.media_url,
            metadata: newMsgRaw.metadata,
            replyTo: newMsgRaw.reply_to_id ? getLastMessage(newMsgRaw.reply_to_id) : undefined
        };
        if (newMsgRaw.type === 'buzz') {
            triggerBuzz();
        }
        setMessages(prev => [...prev, incomingMsg]);
    };

    const triggerBuzz = () => {
        setIsBuzzing(true);
        if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200]);
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
                    time: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    type: m.type || 'text',
                    status: 'read',
                    mediaUrl: m.media_url,
                    metadata: m.metadata,
                    reactions: reactions,
                    isDeleted: m.is_deleted
                };
            });
            setMessages(formatted);
        }
    };

    const handleSend = async (content: string, type: 'text' | 'image' | 'video' | 'voice' | 'buzz', file?: File, duration?: number, extras?: any) => {
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

        const optimisticMsg: Message = {
            id: Date.now().toString(),
            text: content,
            sender: 'me',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            type: type,
            status: 'sent',
            mediaUrl: mediaUrl,
            metadata: { duration },
            replyTo: replyTo ? { id: replyTo.id, text: replyTo.text, sender: replyTo.sender } : undefined
        };

        setMessages([...messages, optimisticMsg]);
        setReplyTo(null); // Clear reply context

        try {
            const { error } = await supabase.from('messages').insert({
                chat_id: chatId,
                sender_id: user.id,
                content: content,
                type: type,
                media_url: mediaUrl,
                metadata: { duration },
                reply_to_id: replyTo?.id
            });

            if (error) throw error;

            // Allow immediate re-typing trigger if needed, but typically sending stops typing
            if (channelRef.current) {
                await channelRef.current.track({ user_id: user.id, full_name: user.user_metadata?.full_name, typing: false });
            }

        } catch (error) {
            console.error("Failed to send message", error);
        }
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

    return (
        <div className={cn("flex flex-col h-[100dvh] bg-[#e5ddd5] transition-transform fixed inset-0 overflow-hidden", isBuzzing && "animate-[spin_0.5s_ease-in-out]")}>
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
            <div className={cn("flex flex-col h-full", isBuzzing && "animate-[shake_0.5s_ease-in-out_infinite]")}>
                {/* Header */}
                <header className="px-4 py-3 bg-white flex items-center justify-between shadow-sm z-10">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate(-1)} className="text-gray-600">
                            <ArrowLeft size={24} />
                        </button>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-500 overflow-hidden">
                                {chatAvatar ? <img src={chatAvatar} className="w-full h-full object-cover" alt="avatar" /> : chatName[0]}
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 leading-tight">{chatName}</h3>
                                <p className="text-xs text-green-500 font-medium">Online</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 text-[#ff1744]">
                        <Video size={24} />
                        <Phone size={22} />
                        <button className="p-1 rounded-full hover:bg-gray-100"><MoreVertical size={24} className="text-gray-500" /></button>
                    </div>
                </header>

                {/* Messages Area */}
                <div
                    ref={listRef}
                    className="flex-1 overflow-y-auto p-4 bg-[url('https://i.pinimg.com/originals/8c/98/99/8c98994518b575bfd8c949e91d20548b.png')] bg-repeat opacity-95"
                >
                    {loading ? (
                        <div className="flex justify-center pt-10"><Loader2 className="animate-spin text-gray-500" /></div>
                    ) : (
                        <>
                            {messages.map((msg) => (
                                <MessageBubble
                                    key={msg.id}
                                    message={msg}
                                    onReact={handleReaction}
                                    onSwipeReply={(m: any) => setReplyTo(m)}
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
                {participantStatus === 'accepted' ? (
                    <ChatInput
                        onSend={handleSend}
                        onTyping={handleTyping}
                        replyTo={replyTo}
                        onCancelReply={() => setReplyTo(null)}
                    />
                ) : (
                    <div className="p-6 bg-white border-t border-gray-200 text-center safe-bottom">
                        {participantStatus === 'blocked'
                            ? <p className="text-gray-500">You have blocked this user.</p>
                            : <p className="text-gray-500">Request pending.</p>
                        }
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatRoom;
