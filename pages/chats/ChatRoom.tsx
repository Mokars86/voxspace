import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Phone, Video, MoreVertical,
    Smile, Mic, Paperclip, Send, Image as ImageIcon,
    Check, CheckCheck, Loader2, ShieldAlert, CheckCircle
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';

interface Message {
    id: string;
    text: string;
    sender: 'me' | 'them';
    time: string;
    type: 'text' | 'image' | 'voice' | 'video';
    status: 'sent' | 'delivered' | 'read';
    mediaUrl?: string;
}

const ChatRoom: React.FC = () => {
    const { id: chatId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [chatName, setChatName] = useState('Chat');
    const [chatAvatar, setChatAvatar] = useState('');
    const [loading, setLoading] = useState(true);
    const [participantStatus, setParticipantStatus] = useState<'accepted' | 'pending' | 'rejected' | 'blocked'>('accepted');
    const listRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (!user || !chatId) return;

        const fetchChatDetails = async () => {
            setLoading(true);
            try {
                // 1. Fetch Chat Info & Participants to determine name
                const { data: chatData, error: chatError } = await supabase
                    .from('chats')
                    .select('name, is_group')
                    .eq('id', chatId)
                    .single();

                if (chatError) throw chatError;

                // 1.5 Fetch MY status
                const { data: myParticipant, error: myPartError } = await supabase
                    .from('chat_participants')
                    .select('status')
                    .eq('chat_id', chatId)
                    .eq('user_id', user.id)
                    .single();

                if (!myPartError && myParticipant) {
                    setParticipantStatus(myParticipant.status);
                }

                if (chatData.is_group) {
                    setChatName(chatData.name);
                } else {
                    // Fetch other participant
                    const { data: participants } = await supabase
                        .from('chat_participants')
                        .select('profiles(full_name, avatar_url)')
                        .eq('chat_id', chatId)
                        .neq('user_id', user.id)
                        .single();

                    if (participants && participants.profiles) {
                        const profile: any = Array.isArray(participants.profiles)
                            ? participants.profiles[0]
                            : participants.profiles;

                        if (profile) {
                            setChatName(profile.full_name);
                            setChatAvatar(profile.avatar_url);
                        }
                    }
                }

                // 2. Fetch Messages
                await fetchMessages();

                // 3. Subscribe to new messages
                const channel = supabase
                    .channel(`chat:${chatId}`)
                    .on('postgres_changes',
                        { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` },
                        (payload) => {
                            const newMsgRaw = payload.new;
                            // Only add if not from me (optimistic update handles me) or if I want to confirm receipt
                            if (newMsgRaw.sender_id !== user.id) {
                                const incomingMsg: Message = {
                                    id: newMsgRaw.id,
                                    text: newMsgRaw.content,
                                    sender: 'them',
                                    time: new Date(newMsgRaw.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                                    type: newMsgRaw.type || 'text',
                                    status: 'read', // auto-read for now
                                    mediaUrl: newMsgRaw.media_url
                                };
                                setMessages(prev => [...prev, incomingMsg]);
                            }
                        }
                    )
                    .subscribe();

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

    const fetchMessages = async () => {
        if (!chatId || !user) return;
        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .eq('chat_id', chatId)
            .order('created_at', { ascending: true });

        if (!error && data) {
            const formatted: Message[] = data.map((m: any) => ({
                id: m.id,
                text: m.content,
                sender: m.sender_id === user.id ? 'me' : 'them',
                time: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                type: m.type || 'text',
                status: 'read',
                mediaUrl: m.media_url
            }));
            setMessages(formatted);
        }
    };

    const handleSend = async () => {
        if (!inputValue.trim() || !user || !chatId) return;

        const optimisticMsg: Message = {
            id: Date.now().toString(),
            text: inputValue,
            sender: 'me',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            type: 'text',
            status: 'sent'
        };
        setMessages([...messages, optimisticMsg]);
        setInputValue('');

        try {
            const { error } = await supabase.from('messages').insert({
                chat_id: chatId,
                sender_id: user.id,
                content: optimisticMsg.text,
                type: 'text'
            });

            if (error) throw error;
        } catch (error) {
            console.error("Failed to send message", error);
            // Optionally show error state on message
        }
    };

    const handleAccept = async () => {
        if (!user || !chatId) return;
        try {
            const { error } = await supabase
                .from('chat_participants')
                .update({ status: 'accepted' })
                .eq('chat_id', chatId)
                .eq('user_id', user.id);

            if (error) throw error;
            setParticipantStatus('accepted');
        } catch (error) {
            console.error("Error accepting chat:", error);
            alert("Failed to accept.");
        }
    };

    const handleBlock = async () => {
        if (!user || !chatId) return;
        if (!confirm("Are you sure you want to block this user?")) return;
        try {
            const { error } = await supabase
                .from('chat_participants')
                .update({ status: 'blocked' })
                .eq('chat_id', chatId)
                .eq('user_id', user.id);

            if (error) throw error;
            setParticipantStatus('blocked');
            navigate('/chats'); // Go back to list
        } catch (error) {
            console.error("Error blocking chat:", error);
            alert("Failed to block.");
        }
    };

    return (
        <div className="flex flex-col h-screen bg-[#e5ddd5]">
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
                    <MoreVertical size={24} className="text-gray-500" />
                </div>
            </header>

            {/* Messages Area */}
            <div
                ref={listRef}
                className="flex-1 overflow-y-auto p-4 space-y-4 bg-[url('https://i.pinimg.com/originals/8c/98/99/8c98994518b575bfd8c949e91d20548b.png')] bg-repeat opacity-95"
            >
                {loading ? (
                    <div className="flex justify-center pt-10"><Loader2 className="animate-spin text-gray-500" /></div>
                ) : (
                    messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={cn(
                                "flex w-full mb-2",
                                msg.sender === 'me' ? "justify-end" : "justify-start"
                            )}
                        >
                            <div className={cn(
                                "max-w-[75%] rounded-2xl px-4 py-2 relative shadow-sm",
                                msg.sender === 'me'
                                    ? "bg-[#ff1744] text-white rounded-tr-none"
                                    : "bg-white text-gray-900 rounded-tl-none"
                            )}>
                                {msg.type === 'text' && (
                                    <p className="text-[15px] leading-relaxed">{msg.text}</p>
                                )}

                                {msg.type === 'image' && msg.mediaUrl && (
                                    <div className="mb-1 overflow-hidden rounded-lg">
                                        <img src={msg.mediaUrl} alt="Shared" className="w-full h-auto" />
                                    </div>
                                )}

                                <div className={cn(
                                    "flex items-center justify-end gap-1 mt-1 text-[10px]",
                                    msg.sender === 'me' ? "text-white/80" : "text-gray-400"
                                )}>
                                    <span>{msg.time}</span>
                                    {msg.sender === 'me' && (
                                        <>
                                            {msg.status === 'sent' && <Check size={12} />}
                                            {msg.status === 'delivered' && <CheckCheck size={12} />}
                                            {msg.status === 'read' && <CheckCheck size={12} className="text-blue-200" />}
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    )))}
            </div>

            {/* Conditional Input Area */}
            {participantStatus === 'accepted' ? (
                <div className="p-3 bg-white flex items-end gap-2 safe-bottom">
                    <div className="flex-1 bg-gray-100 rounded-3xl flex items-center px-4 py-2 transition-all focus-within:ring-1 focus-within:ring-[#ff1744] focus-within:bg-white">
                        <button className="p-1 mr-2 text-gray-400 hover:text-gray-600">
                            <Smile size={24} />
                        </button>
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="Message"
                            className="flex-1 bg-transparent border-none outline-none text-gray-900 placeholder:text-gray-500 max-h-32 py-1"
                        />
                        <button className="p-1 ml-2 text-gray-400 hover:text-gray-600 rotate-45">
                            <Paperclip size={22} />
                        </button>
                        {!inputValue && (
                            <button className="p-1 ml-2 text-gray-400 hover:text-gray-600">
                                <ImageIcon size={22} />
                            </button>
                        )}
                    </div>

                    <div className="h-12 w-12 flex-shrink-0">
                        {inputValue ? (
                            <button
                                onClick={handleSend}
                                className="w-full h-full bg-[#ff1744] hover:bg-[#d50000] text-white rounded-full flex items-center justify-center shadow-md transition-all active:scale-95"
                            >
                                <Send size={20} className="ml-1" />
                            </button>
                        ) : (
                            <button className="w-full h-full bg-[#ff1744] hover:bg-[#d50000] text-white rounded-full flex items-center justify-center shadow-md transition-all active:scale-95">
                                <Mic size={22} />
                            </button>
                        )}
                    </div>
                </div>
            ) : participantStatus === 'pending' ? (
                <div className="p-4 bg-white border-t border-gray-200 safe-bottom">
                    <div className="bg-gray-50 p-4 rounded-xl text-center mb-4">
                        <ShieldAlert className="inline-block text-gray-400 mb-2" size={32} />
                        <h4 className="font-bold text-gray-900 mb-1">Message Request</h4>
                        <p className="text-sm text-gray-500">
                            You don't follow this person. Do you want to accept their message invitation?
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={handleBlock}
                            className="flex-1 py-3 text-red-500 font-bold bg-gray-100 rounded-xl hover:bg-gray-200 active:scale-95 transition-all"
                        >
                            Block
                        </button>
                        <button
                            onClick={handleAccept}
                            className="flex-1 py-3 bg-[#ff1744] text-white font-bold rounded-xl shadow-md hover:bg-red-600 active:scale-95 transition-all"
                        >
                            Accept
                        </button>
                    </div>
                </div>
            ) : (
                <div className="p-6 bg-white border-t border-gray-200 text-center safe-bottom">
                    <p className="text-gray-500 font-medium">You have blocked this user.</p>
                </div>
            )}
        </div>
    );
};

export default ChatRoom;
