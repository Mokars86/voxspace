import { useState, useRef, useEffect } from 'react';
import { supabase } from '../services/supabase';

const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:global.stun.twilio.com:3478' }
    ]
};

export const useWebRTC = (user: any, chatId: string | undefined) => {
    const [callState, setCallState] = useState<'idle' | 'outgoing' | 'incoming' | 'connected' | 'ending'>('idle');
    const [isMuted, setIsMuted] = useState(false);
    const peerConnection = useRef<RTCPeerConnection | null>(null);
    const localStream = useRef<MediaStream | null>(null);
    const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
    const [callerInfo, setCallerInfo] = useState<{ id: string, name: string, avatar: string } | null>(null);
    const [callId, setCallId] = useState<string | null>(null);
    const startTimeRef = useRef<number | null>(null);

    useEffect(() => {
        // Initialize invisible audio element for remote stream
        remoteAudioRef.current = new Audio();
        remoteAudioRef.current.autoplay = true;

        return () => {
            endCall();
        };
    }, []);

    const createPeerConnection = () => {
        if (peerConnection.current) return peerConnection.current;

        const pc = new RTCPeerConnection(ICE_SERVERS);

        pc.onicecandidate = (event) => {
            if (event.candidate && chatId) {
                sendSignal({ type: 'ice-candidate', candidate: event.candidate });
            }
        };

        pc.ontrack = (event) => {
            if (remoteAudioRef.current && event.streams[0]) {
                remoteAudioRef.current.srcObject = event.streams[0];
                remoteAudioRef.current.play().catch(e => console.error("Error playing audio", e));
            }
        };

        pc.onconnectionstatechange = () => {
            if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
                endCall();
            } else if (pc.connectionState === 'connected') {
                setCallState('connected');
            }
        };

        peerConnection.current = pc;
        return pc;
    };

    const getLocalStream = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            localStream.current = stream;
            return stream;
        } catch (error: any) {
            console.error("Error accessing microphone", error);
            if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
                alert("Microphone permission denied. Please enable it in Settings.");
            } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
                alert("No microphone found on this device.");
            } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
                alert("Microphone is already in use by another app.");
            } else {
                alert(`Microphone Error: ${error.name} - ${error.message}`);
            }
            return null;
        }
    };

    const sendSignal = async (payload: any) => {
        if (!chatId || !user) return;
        await supabase.channel(`chat:${chatId}`).send({
            type: 'broadcast',
            event: 'signal',
            payload: { ...payload, senderId: user.id, senderName: user.user_metadata?.full_name || 'User' }
        });
    };

    const startCall = async () => {
        const stream = await getLocalStream();
        if (!stream) return;

        setCallState('outgoing');
        const pc = createPeerConnection();
        stream.getTracks().forEach(track => pc.addTrack(track, stream));

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        await sendSignal({ type: 'offer', sdp: offer });

        // Log Call Start
        if (chatId && user) {
            const { data, error } = await supabase.from('call_logs').insert({
                chat_id: chatId,
                caller_id: user.id,
                status: 'missed' // Default until answered/ended
            }).select().single();

            if (data) {
                setCallId(data.id);
                startTimeRef.current = Date.now();
            }
        }
    };

    const answerCall = async () => {
        const stream = await getLocalStream();
        if (!stream) return;

        const pc = createPeerConnection(); // Should already exist from handleSignal, but safety check
        stream.getTracks().forEach(track => pc.addTrack(track, stream));

        // Create Answer (remote desc should have been set in handleSignal)
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        await sendSignal({ type: 'answer', sdp: answer });
        setCallState('connected');

        // Note: receiver logic for update call log would happen here if we knew the call ID. 
        // For simplicity, we might let the caller handle the final status update or rely on triggers.
        // But better: Caller listens for 'answer' and updates status to 'completed' (or 'active').
        // We'll update status to 'completed' (meaning connected) on the caller side when they receive 'answer'.
    };

    const handleSignal = async (payload: any) => {
        if (payload.senderId === user?.id) return; // Ignore own signals

        const pc = peerConnection.current || createPeerConnection();

        try {
            if (payload.type === 'offer') {
                setCallState('incoming');
                setCallerInfo({
                    id: payload.senderId,
                    name: payload.senderName,
                    avatar: payload.senderAvatar || ''
                });
                await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
                // We could grab callId from payload if sent, but for now we won't log 'received' calls strictly unless answered.
            } else if (payload.type === 'answer') {
                if (callState === 'outgoing') {
                    await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
                    setCallState('connected');

                    // Update Log to 'completed' (connected)
                    if (callId) {
                        await supabase.from('call_logs').update({ status: 'completed' }).eq('id', callId);
                    }
                }
            } else if (payload.type === 'ice-candidate') {
                if (payload.candidate) {
                    await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
                }
            } else if (payload.type === 'hangup') {
                endCall();
            }
        } catch (error) {
            console.error("Signal handling error", error);
        }
    };

    const endCall = async () => {
        if (callState !== 'idle') {
            sendSignal({ type: 'hangup' });
        }

        // Log End
        if (callId && startTimeRef.current) {
            const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
            await supabase.from('call_logs').update({
                ended_at: new Date().toISOString(),
                duration: duration
            }).eq('id', callId);
        }

        // Reset refs
        startTimeRef.current = null;
        setCallId(null);

        if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = null;
        }
        if (localStream.current) {
            localStream.current.getTracks().forEach(track => track.stop());
            localStream.current = null;
        }
        if (peerConnection.current) {
            peerConnection.current.close();
            peerConnection.current = null;
        }
        setCallState('idle');
        setCallerInfo(null);
    };

    const toggleMute = () => {
        if (localStream.current) {
            localStream.current.getAudioTracks().forEach(track => {
                track.enabled = !isMuted;
            });
            setIsMuted(!isMuted);
        }
    };

    return {
        callState,
        callerInfo,
        isMuted,
        startCall,
        answerCall,
        endCall,
        handleSignal,
        toggleMute
    };
};
