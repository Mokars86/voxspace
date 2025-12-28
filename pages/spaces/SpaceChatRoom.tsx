import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, Send, Upload, MoreVertical, Loader2 } from 'lucide-react';
import ErrorBoundary from '../../components/ErrorBoundary';

interface SpaceMessage {
    id: string;
    content: string;
    sender_id: string;
    created_at: string;
    sender: {
        full_name: string;
        avatar_url: string;
        username: string;
    };
}

const formatDate = (dateString: string) => {
    try {
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return "Now";
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
        return "Now";
    }
};

const SpaceChatRoomContent: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [messages, setMessages] = useState<SpaceMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [spaceName, setSpaceName] = useState('');
    const [isMember, setIsMember] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        try {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        } catch (e) {
            console.warn("Scroll error:", e);
        }
    };

    useEffect(() => {
        console.log("ChatRoom mounted. ID:", id);
        if (!id) return;

        const fetchSpaceAndMessages = async () => {
            try {
                // 1. Fetch Space Name
                const { data: spaceData } = await supabase.from('spaces').select('name').eq('id', id).single();
                if (spaceData) setSpaceName(spaceData.name);

                // 2. Check Membership
                if (user) {
                    const { data: memberData } = await supabase
                        .from('space_members')
                        .select('user_id')
                        .eq('space_id', id)
                        .eq('user_id', user.id)
                        .maybeSingle();
                    setIsMember(!!memberData);
                }

                // 3. Fetch Messages
                const { data: msgsData, error } = await supabase
                    .from('space_messages')
                    .select(`
                        id,
                        content,
                        sender_id,
                        created_at,
                        sender:sender_id(full_name, avatar_url, username)
                    `)
                    .eq('space_id', id)
                    .order('created_at', { ascending: true });

                if (error) {
                    console.error("Supabase error messages:", error);
                    throw error;
                }

                console.log("Messages fetched:", msgsData?.length);

                const formattedMessages = (msgsData || []).map((m: any) => ({
                    id: m.id,
                    content: m.content || "",
                    sender_id: m.sender_id,
                    created_at: m.created_at || new Date().toISOString(),
                    sender: {
                        full_name: m.sender?.full_name || 'Unknown User',
                        avatar_url: m.sender?.avatar_url || '',
                        username: m.sender?.username || 'unknown'
                    }
                }));

                setMessages(formattedMessages);
            } catch (error) {
                console.error("Error loading chat:", error);
            } finally {
                setLoading(false);
                setTimeout(scrollToBottom, 100);
            }
        };

        fetchSpaceAndMessages();

        const channel = supabase
            .channel(`space_chat:${id}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'space_messages',
                filter: `space_id=eq.${id}`
            }, async (payload) => {
                console.log("Realtime payload:", payload);
                const { data: senderData } = await supabase
                    .from('profiles')
                    .select('full_name, avatar_url, username')
                    .eq('id', payload.new.sender_id)
                    .single();

                const newMsg: SpaceMessage = {
                    id: payload.new.id,
                    content: payload.new.content,
                    sender_id: payload.new.sender_id,
                    created_at: payload.new.created_at,
                    sender: senderData || { full_name: 'Unknown', avatar_url: '', username: 'unknown' }
                };

                setMessages(prev => [...prev, newMsg]);
                setTimeout(scrollToBottom, 100);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [id, user]);

    const handleJoinSpace = async () => {
        if (!user || !id) return;
        try {
            const { error } = await supabase
                .from('space_members')
                .insert({ space_id: id, user_id: user.id });

            if (error) throw error;
            setIsMember(true);
        } catch (error) {
            console.error("Error joining space:", error);
            alert("Could not join space.");
        }
    };

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !user || !id) return;

        if (!isMember) {
            alert("You must join the space to send messages.");
            return;
        }

        const msgToSend = newMessage.trim();
        setNewMessage('');

        try {
            const { error } = await supabase
                .from('space_messages')
                .insert({
                    space_id: id,
                    sender_id: user.id,
                    content: msgToSend
                });

            if (error) throw error;
        } catch (error) {
            console.error("Error sending message:", error);
            alert("Message failed to send.");
        }
    };

    return (
        <div className="flex flex-col h-screen bg-[#f5f7fb]">
            {/* Header */}
            <div className="bg-white p-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full text-gray-600">
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h2 className="font-bold text-lg leading-tight">{spaceName || "Space"}</h2>
                        <div className="flex items-center gap-1">
                            <p className="text-xs text-green-500 font-medium">● Online</p>
                            {!isMember && <span className="text-xs text-gray-400">• You are viewing as guest</span>}
                        </div>
                    </div>
                </div>
                <button className="p-2 hover:bg-gray-100 rounded-full text-gray-600">
                    <MoreVertical size={24} />
                </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {loading ? (
                    <div className="flex justify-center py-10"><Loader2 className="animate-spin text-gray-400" /></div>
                ) : messages.length === 0 ? (
                    <div className="text-center text-gray-400 py-10">
                        <p>Welcome to the chat room!</p>
                        <p className="text-sm">Be the first to say hello.</p>
                    </div>
                ) : (
                    messages.map((msg, index) => {
                        const isMe = msg.sender_id === user?.id;
                        const isSequential = index > 0 && messages[index - 1]?.sender_id === msg.sender_id;

                        return (
                            <div key={msg.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''} ${isSequential ? 'mt-1' : 'mt-4'}`}>
                                {!isMe && !isSequential && (
                                    <img
                                        src={msg.sender.avatar_url || `https://ui-avatars.com/api/?name=${msg.sender.full_name}`}
                                        className="w-8 h-8 rounded-full object-cover border border-gray-100 self-end mb-1"
                                    />
                                )}
                                {isMe && !isSequential && <div className="w-8" />}
                                {isSequential && <div className="w-8" />}

                                <div className={`max-w-[75%] px-4 py-2 rounded-2xl ${isMe
                                        ? 'bg-[#ff1744] text-white rounded-br-none'
                                        : 'bg-white text-gray-800 shadow-sm rounded-bl-none'
                                    }`}>
                                    {!isMe && !isSequential && (
                                        <p className="text-[10px] font-bold opacity-60 mb-1">{msg.sender.full_name}</p>
                                    )}
                                    <p className="text-sm leading-relaxed">{msg.content}</p>
                                    <span className={`text-[10px] block text-right mt-1 ${isMe ? 'text-white/70' : 'text-gray-400'}`}>
                                        {formatDate(msg.created_at)}
                                    </span>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area or Join Prompt */}
            <div className="p-4 bg-white border-t border-gray-100">
                {isMember ? (
                    <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-2xl border border-gray-100 focus-within:ring-2 ring-[#ff1744]/20 transition-all">
                        <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full transition-colors">
                            <Upload size={20} />
                        </button>
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                            placeholder="Message #general..."
                            className="flex-1 bg-transparent border-none outline-none text-gray-900 placeholder:text-gray-400"
                        />
                        <button
                            onClick={handleSendMessage}
                            disabled={!newMessage.trim()}
                            className="p-2 bg-[#ff1744] text-white rounded-xl shadow-md disabled:opacity-50 disabled:shadow-none transition-all hover:bg-red-600 active:scale-95"
                        >
                            <Send size={20} />
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={handleJoinSpace}
                        className="w-full py-3 bg-[#ff1744] text-white font-bold rounded-xl shadow-lg active:scale-95 transition-transform"
                    >
                        Join Space to Chat
                    </button>
                )}
            </div>
        </div>
    );
};

const SpaceChatRoom = () => (
    <ErrorBoundary>
        <SpaceChatRoomContent />
    </ErrorBoundary>
);

export default SpaceChatRoom;
