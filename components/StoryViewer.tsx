import React, { useState, useEffect, useRef } from 'react';
import { X, Heart, Send } from 'lucide-react';
import { Story } from '../types';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';

interface StoryViewerProps {
    stories: Story[];
    initialIndex: number;
    onClose: () => void;
}

const StoryViewer: React.FC<StoryViewerProps> = ({ stories, initialIndex, onClose }) => {
    const { user } = useAuth();
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [progress, setProgress] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [duration, setDuration] = useState(5000); // Default duration 5s
    const videoRef = useRef<HTMLVideoElement>(null);

    // Interaction State
    const [replyText, setReplyText] = useState('');
    const [sending, setSending] = useState(false);
    const [liked, setLiked] = useState(false);

    const currentStory = stories[currentIndex];

    // Reset progress & state on story change
    useEffect(() => {
        setProgress(0);
        setDuration(5000);
        setReplyText('');
        setLiked(false);
        setSending(false);

        if (currentStory?.type === 'video') {
            setIsPaused(true);
        } else {
            setIsPaused(false);
        }

        // Check if liked (In a real app, fetch this)
        // checkLikeStatus();
    }, [currentIndex, currentStory]);

    // Timer Logic
    useEffect(() => {
        if (currentStory?.type === 'video' && videoRef.current) {
            if (isPaused) {
                videoRef.current.pause();
                return;
            } else {
                videoRef.current.play().catch(() => { });
            }
        }

        if (isPaused) return;

        const interval = 50;
        const step = 100 / (duration / interval);

        const timer = setInterval(() => {
            setProgress(prev => {
                if (prev >= 100) {
                    handleNext();
                    return 0;
                }
                return prev + step;
            });
        }, interval);

        return () => clearInterval(timer);
    }, [currentIndex, isPaused, duration, currentStory]);

    const handleVideoLoad = (e: React.SyntheticEvent<HTMLVideoElement>) => {
        const vidDuration = e.currentTarget.duration * 1000;
        if (vidDuration && !isNaN(vidDuration)) {
            setDuration(vidDuration);
            setIsPaused(false);
        }
    };

    const handleNext = () => {
        if (currentIndex < stories.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            onClose();
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
        }
    };

    const handleLike = async () => {
        if (!currentStory || !user) return;
        setLiked(true);
        try {
            const { error } = await supabase
                .from('story_interactions')
                .insert({
                    story_id: currentStory.id,
                    user_id: user.id,
                    reaction_type: 'like'
                });
            if (error && error.code !== '23505') throw error;
        } catch (e) {
            console.error(e);
            setLiked(false);
        }
    };

    const handleSendReply = async () => {
        if (!replyText.trim() || !user || !currentStory) return;
        setSending(true);
        setIsPaused(true);

        try {
            const { data: chatId, error: chatError } = await supabase
                .rpc('get_or_create_dm', { target_user_id: currentStory.user_id });

            if (chatError) throw chatError;

            const context = currentStory.type === 'image' || currentStory.type === 'video'
                ? 'Replied to your story'
                : `Replied to your story: "${currentStory.content?.substring(0, 20)}..."`;

            const { error: msgError } = await supabase
                .from('messages')
                .insert({
                    chat_id: chatId,
                    sender_id: user.id,
                    content: `${context}\n\n${replyText}`
                });

            if (msgError) throw msgError;

            setReplyText('');
            alert('Reply sent!');
            setIsPaused(false);

        } catch (e) {
            console.error(e);
            alert('Failed to send reply');
            setIsPaused(false);
        } finally {
            setSending(false);
        }
    };

    if (!currentStory) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
            {/* Progress Bar */}
            <div className="absolute top-0 left-0 right-0 p-2 z-10 flex gap-1">
                {stories.map((_, idx) => (
                    <div key={idx} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
                        <div
                            className={`h-full bg-white transition-all duration-100 ease-linear ${idx < currentIndex ? 'w-full' : idx === currentIndex ? '' : 'w-0'
                                }`}
                            style={{ width: idx === currentIndex ? `${progress}%` : undefined }}
                        />
                    </div>
                ))}
            </div>

            {/* Header */}
            <div className="absolute top-4 left-0 right-0 p-4 z-10 flex justify-between items-center text-white mt-4">
                <div className="flex items-center gap-3">
                    <img
                        src={currentStory.user?.avatar_url || `https://ui-avatars.com/api/?name=${currentStory.user?.username}`}
                        className="w-10 h-10 rounded-full border border-white/20"
                        alt="User"
                    />
                    <span className="font-bold text-shadow">{currentStory.user?.username}</span>
                    <span className="text-white/70 text-sm">{new Date(currentStory.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <button onClick={onClose}>
                    <X size={28} />
                </button>
            </div>

            {/* Content */}
            <div
                className="flex-1 flex items-center justify-center relative bg-gray-900"
                onMouseDown={() => setIsPaused(true)}
                onMouseUp={() => setIsPaused(false)}
                onTouchStart={() => setIsPaused(true)}
                onTouchEnd={() => setIsPaused(false)}
            >
                {/* Navigation Hit Areas */}
                <div className="absolute inset-y-0 left-0 w-1/3 z-20" onClick={(e) => { e.stopPropagation(); handlePrev(); }} />
                <div className="absolute inset-y-0 right-0 w-1/3 z-20" onClick={(e) => { e.stopPropagation(); handleNext(); }} />

                {currentStory.type === 'video' ? (
                    <video
                        ref={videoRef}
                        src={currentStory.media_url}
                        className="w-full h-full object-contain"
                        playsInline
                        onLoadedMetadata={handleVideoLoad}
                        onEnded={handleNext}
                    />
                ) : currentStory.type === 'image' ? (
                    <img src={currentStory.media_url} className="w-full h-full object-contain" alt="Story" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center p-8 text-center bg-gradient-to-br from-purple-600 to-blue-500">
                        <p className="text-2xl font-bold text-white">{currentStory.content}</p>
                    </div>
                )}
            </div>

            {/* Footer / Reply */}
            <div className="absolute bottom-0 left-0 right-0 p-4 z-10 bg-gradient-to-t from-black/80 to-transparent pt-10">
                <div className="flex gap-4 items-center max-w-lg mx-auto w-full">
                    <input
                        type="text"
                        value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                        onFocus={() => setIsPaused(true)}
                        onBlur={() => setIsPaused(false)}
                        placeholder="Send a message..."
                        className="flex-1 bg-transparent border border-white/50 rounded-full px-4 py-3 text-white placeholder-white/70 outline-none focus:border-white transition-colors backdrop-blur-sm"
                        onKeyDown={e => e.key === 'Enter' && handleSendReply()}
                    />
                    <button
                        onClick={handleLike}
                        className={`text-white hover:scale-110 transition-transform ${liked ? 'text-red-500 fill-red-500' : ''}`}
                    >
                        <Heart size={28} fill={liked ? "currentColor" : "none"} />
                    </button>
                    {replyText && (
                        <button
                            onClick={handleSendReply}
                            disabled={sending}
                            className="text-[#ff1744] hover:scale-110 transition-transform"
                        >
                            <Send size={28} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StoryViewer;
