import React, { useState, useRef } from 'react';
import {
    Smile, Paperclip, Mic, Send, Image as ImageIcon, Video, X, Trash2, StopCircle, Zap, Camera, MapPin, FileText, Music
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { supabase } from '../../services/supabase';

interface ChatInputProps {
    onSend: (content: string, type: 'text' | 'image' | 'video' | 'voice' | 'buzz' | 'location' | 'audio' | 'file', file?: File, duration?: number, metadata?: any) => void;
    onTyping?: () => void;
    replyTo?: any; // The message being replied to
    onCancelReply?: () => void;
}

const COMMON_EMOJIS = ["😀", "😂", "🥰", "😍", "😭", "😮", "😡", "👍", "👎", "🔥", "✨", "🎉", "💯", "🙏", "👋", "🤔", "👀", "🧠", "💀", "👻", "💩", "🤡", "❤️", "🧡", "💛", "💚", "💙", "💜", "🚀", "🌟"];

const ChatInput: React.FC<ChatInputProps> = ({ onSend, onTyping, replyTo, onCancelReply }) => {
    const [inputValue, setInputValue] = useState('');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showAttachMenu, setShowAttachMenu] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const mediaRecorder = useRef<MediaRecorder | null>(null);
    const audioChunks = useRef<Blob[]>([]);
    const timerRef = useRef<any>(null);

    // File Inputs
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const docInputRef = useRef<HTMLInputElement>(null);
    const audioInputRef = useRef<HTMLInputElement>(null);

    const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(e.target.value);
        if (onTyping) onTyping();
    };

    const handleEmojiClick = (emoji: string) => {
        setInputValue(prev => prev + emoji);
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder.current = new MediaRecorder(stream);
            audioChunks.current = [];

            mediaRecorder.current.ondataavailable = (event) => {
                if (event.data.size > 0) audioChunks.current.push(event.data);
            };

            mediaRecorder.current.start();
            setIsRecording(true);
            setRecordingDuration(0);
            timerRef.current = setInterval(() => {
                setRecordingDuration(d => d + 1);
            }, 1000);

        } catch (err) {
            console.error("Mic access denied", err);
            alert("Microphone access is needed for voice notes.");
        }
    };

    const stopRecording = (shouldSend: boolean) => {
        if (mediaRecorder.current && isRecording) {
            mediaRecorder.current.onstop = () => {
                const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
                const audioFile = new File([audioBlob], `voice_${Date.now()}.webm`, { type: 'audio/webm' });

                if (shouldSend) {
                    onSend('', 'voice', audioFile, recordingDuration);
                }

                // Cleanup
                const tracks = mediaRecorder.current?.stream.getTracks();
                tracks?.forEach(track => track.stop());
            };
            mediaRecorder.current.stop();
        }

        setIsRecording(false);
        clearInterval(timerRef.current);
    };

    // Generic File Handler
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, typeOverride?: 'image' | 'video' | 'file' | 'audio') => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            let type: any = typeOverride;

            if (!type) {
                if (file.type.startsWith('image/')) type = 'image';
                else if (file.type.startsWith('video/')) type = 'video';
                else if (file.type.startsWith('audio/')) type = 'audio';
                else type = 'file';
            }

            onSend(file.name, type, file);
            setShowAttachMenu(false);
        }
    };

    const handleLocation = () => {
        if (!navigator.geolocation) {
            alert("Geolocation is not supported by your browser");
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                // We send location as a special "message" with metadata
                onSend(`Location: ${latitude}, ${longitude}`, 'location', undefined, undefined, {
                    lat: latitude,
                    lng: longitude
                });
                setShowAttachMenu(false);
            },
            (error) => {
                console.error("Error getting location", error);
                alert("Unable to retrieve your location");
            }
        );
    };

    const handleSendClick = () => {
        if (inputValue.trim()) {
            onSend(inputValue, 'text');
            setInputValue('');
        }
    };

    const formatDuration = (sec: number) => {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    return (
        <div className="flex flex-col w-full">
            {replyTo && (
                <div className="flex items-center justify-between p-2 mx-4 mb-1 bg-gray-50 border-l-4 border-[#ff1744] rounded-r-lg shadow-sm animate-in slide-in-from-bottom-2">
                    <div className="overflow-hidden">
                        <span className="text-xs font-bold text-[#ff1744]">Replying to {replyTo.sender}</span>
                        <p className="text-sm truncate text-gray-600">{replyTo.text || 'Media'}</p>
                    </div>
                    <button onClick={onCancelReply} className="p-1 hover:bg-gray-200 rounded-full">
                        <X size={16} />
                    </button>
                </div>
            )}

            <div className="bg-white w-full safe-bottom shadow-sm z-20 border-t border-gray-100 dark:border-gray-800">
                <div className="flex items-end gap-2 p-2 relative">
                    {/* Attachment Menu */}
                    {showAttachMenu && (
                        <>
                            <div className="fixed inset-0 z-30" onClick={() => setShowAttachMenu(false)} />
                            <div className="absolute bottom-16 left-2 z-40 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-2 grid grid-cols-3 gap-2 w-64 animate-in slide-in-from-bottom-5 duration-200">
                                <button onClick={() => cameraInputRef.current?.click()} className="flex flex-col items-center gap-1 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-colors">
                                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-500 flex items-center justify-center"><Camera size={20} /></div>
                                    <span className="text-xs font-medium dark:text-gray-300">Camera</span>
                                </button>
                                <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center gap-1 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-colors">
                                    <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-500 flex items-center justify-center"><ImageIcon size={20} /></div>
                                    <span className="text-xs font-medium dark:text-gray-300">Gallery</span>
                                </button>
                                <button onClick={() => docInputRef.current?.click()} className="flex flex-col items-center gap-1 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-colors">
                                    <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-500 flex items-center justify-center"><FileText size={20} /></div>
                                    <span className="text-xs font-medium dark:text-gray-300">Document</span>
                                </button>
                                <button onClick={() => audioInputRef.current?.click()} className="flex flex-col items-center gap-1 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-colors">
                                    <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-500 flex items-center justify-center"><Music size={20} /></div>
                                    <span className="text-xs font-medium dark:text-gray-300">Audio</span>
                                </button>
                                <button onClick={handleLocation} className="flex flex-col items-center gap-1 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-colors">
                                    <div className="w-10 h-10 rounded-full bg-green-100 text-green-500 flex items-center justify-center"><MapPin size={20} /></div>
                                    <span className="text-xs font-medium dark:text-gray-300">Location</span>
                                </button>
                                <button onClick={() => { (onSend as any)("BUZZ!", 'buzz'); setShowAttachMenu(false); }} className="flex flex-col items-center gap-1 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-colors">
                                    <div className="w-10 h-10 rounded-full bg-[#FFD700] hover:bg-[#FFC000] text-white flex items-center justify-center shadow-md transition-all active:scale-95"><Zap size={20} className="fill-current" /></div>
                                    <span className="text-xs font-medium dark:text-gray-300">Buzz</span>
                                </button>
                            </div>
                        </>
                    )}

                    {/* Hidden Inputs */}
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*" onChange={(e) => handleFileSelect(e)} />
                    <input type="file" ref={cameraInputRef} className="hidden" accept="image/*" capture="environment" onChange={(e) => handleFileSelect(e, 'image')} />
                    <input type="file" ref={docInputRef} className="hidden" accept=".pdf,.doc,.docx,.txt" onChange={(e) => handleFileSelect(e, 'file')} body-append="true" />
                    <input type="file" ref={audioInputRef} className="hidden" accept="audio/*" onChange={(e) => handleFileSelect(e, 'audio')} />

                    {isRecording ? (
                        <div className="flex-1 bg-red-50 rounded-3xl flex items-center justify-between px-4 py-3 animate-pulse border border-red-100">
                            <div className="flex items-center gap-3 text-red-500 font-medium">
                                <div className="w-3 h-3 bg-red-500 rounded-full animate-ping" />
                                <span>Recording {formatDuration(recordingDuration)}</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <button onClick={() => stopRecording(false)} className="text-gray-400 hover:text-red-500">
                                    <Trash2 size={24} />
                                </button>
                                <button onClick={() => stopRecording(true)} className="w-10 h-10 bg-[#ff1744] text-white rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform">
                                    <Send size={20} className="ml-1" />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="flex-1 min-w-0 bg-gray-100 rounded-3xl flex items-center px-3 py-2 transition-all focus-within:ring-1 focus-within:ring-[#ff1744] focus-within:bg-white relative">
                                {showEmojiPicker && (
                                    <div className="absolute bottom-full left-0 mb-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-xl rounded-2xl p-4 grid grid-cols-6 gap-2 w-64 h-48 overflow-y-auto z-50 animate-in fade-in zoom-in-95 duration-200">
                                        {COMMON_EMOJIS.map(emoji => (
                                            <button
                                                key={emoji}
                                                onClick={() => handleEmojiClick(emoji)}
                                                className="text-2xl hover:bg-gray-100 dark:hover:bg-gray-700 rounded p-1 transition-colors"
                                            >
                                                {emoji}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                <button
                                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                    className={cn("p-1 mr-1 text-gray-400 hover:text-gray-600 flex-shrink-0 transition-colors", showEmojiPicker && "text-[#ff1744]")}
                                >
                                    <Smile size={24} />
                                </button>

                                <input
                                    type="text"
                                    value={inputValue}
                                    onChange={handleTextChange}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSendClick();
                                    }}
                                    placeholder="Message..."
                                    className="flex-1 bg-transparent border-none outline-none text-gray-900 placeholder:text-gray-500 max-h-32 py-1 min-w-0"
                                />

                                <button
                                    onClick={() => setShowAttachMenu(!showAttachMenu)}
                                    className={cn("p-1 ml-2 text-gray-400 hover:text-gray-600 transition-colors rotate-45", showAttachMenu && "text-[#ff1744]")}
                                >
                                    <Paperclip size={22} />
                                </button>
                            </div>

                            <div className="h-12 w-12 flex-shrink-0">
                                {inputValue ? (
                                    <button
                                        onClick={handleSendClick}
                                        className="w-full h-full bg-[#ff1744] hover:bg-[#d50000] text-white rounded-full flex items-center justify-center shadow-md transition-all active:scale-95"
                                    >
                                        <Send size={20} className="ml-1" />
                                    </button>
                                ) : (
                                    <button
                                        onClick={startRecording}
                                        className="w-full h-full bg-[#ff1744] hover:bg-[#d50000] text-white rounded-full flex items-center justify-center shadow-md transition-all active:scale-95"
                                    >
                                        <Mic size={22} />
                                    </button>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ChatInput;
