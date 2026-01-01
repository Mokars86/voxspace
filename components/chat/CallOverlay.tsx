import React, { useState, useEffect } from 'react';
import { Phone, PhoneOff, Mic, MicOff, User } from 'lucide-react';
import { cn } from '../../lib/utils';

export type CallState = 'idle' | 'outgoing' | 'incoming' | 'connected' | 'ending';

interface CallOverlayProps {
    isOpen: boolean;
    state: CallState;
    callerName: string;
    callerAvatar?: string | null;
    isAudioEnabled: boolean;
    onToggleAudio: () => void;
    onAccept: () => void;
    onReject: () => void;
    onHangup: () => void;
}

const CallOverlay: React.FC<CallOverlayProps> = ({
    isOpen,
    state,
    callerName,
    callerAvatar,
    isAudioEnabled,
    onToggleAudio,
    onAccept,
    onReject,
    onHangup
}) => {
    const [duration, setDuration] = useState(0);

    useEffect(() => {
        let interval: any;
        if (state === 'connected') {
            interval = setInterval(() => {
                setDuration(d => d + 1);
            }, 1000);
        } else {
            setDuration(0);
        }
        return () => clearInterval(interval);
    }, [state]);

    const formatDuration = (sec: number) => {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    if (!isOpen || state === 'idle') return null;

    return (
        <div className="fixed inset-0 z-[100] bg-gray-900/95 backdrop-blur-sm flex flex-col items-center justify-center text-white animate-in fade-in duration-300">
            {/* Caller Info */}
            <div className="flex flex-col items-center gap-6 mb-12">
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white/20 shadow-2xl bg-gray-800 flex items-center justify-center">
                    {callerAvatar ? (
                        <img src={callerAvatar} alt={callerName} className="w-full h-full object-cover" />
                    ) : (
                        <User size={64} className="text-gray-400" />
                    )}
                </div>
                <div className="text-center">
                    <h2 className="text-3xl font-bold mb-2">{callerName}</h2>
                    <p className="text-lg text-gray-300 font-medium opacity-80">
                        {state === 'incoming' && 'Incoming Audio Call...'}
                        {state === 'outgoing' && 'Calling...'}
                        {state === 'connected' && formatDuration(duration)}
                        {state === 'ending' && 'Call Ended'}
                    </p>
                </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-8">
                {state === 'incoming' ? (
                    <>
                        <button
                            onClick={onReject}
                            className="flex flex-col items-center gap-2 group"
                        >
                            <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center shadow-lg group-active:scale-95 transition-transform">
                                <PhoneOff size={32} />
                            </div>
                            <span className="text-sm font-medium">Decline</span>
                        </button>
                        <button
                            onClick={onAccept}
                            className="flex flex-col items-center gap-2 group"
                        >
                            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center shadow-lg group-active:scale-95 transition-transform animate-pulse">
                                <Phone size={32} />
                            </div>
                            <span className="text-sm font-medium">Accept</span>
                        </button>
                    </>
                ) : (
                    <>
                        {state === 'connected' && (
                            <button
                                onClick={onToggleAudio}
                                className={cn(
                                    "w-14 h-14 rounded-full flex items-center justify-center transition-all",
                                    isAudioEnabled ? "bg-gray-700 hover:bg-gray-600" : "bg-white text-gray-900"
                                )}
                            >
                                {isAudioEnabled ? <Mic size={24} /> : <MicOff size={24} />}
                            </button>
                        )}

                        <button
                            onClick={onHangup}
                            className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform"
                        >
                            <PhoneOff size={32} />
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

export default CallOverlay;
