

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
    const [isVideoEnabled, setIsVideoEnabled] = useState(false); // Default false, set to true if video call
    const [isVideoCall, setIsVideoCall] = useState(false);       // Tracks if the CURRENT call session is video

    const peerConnection = useRef<RTCPeerConnection | null>(null);

    // Instead of Refs for streams, we might want state to force re-render if stream changes, 
    // but typically we attach the ref.current to video element. 
    // However, to let the UI know we HAVE a stream, state is useful.
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

    const localStreamRef = useRef<MediaStream | null>(null);

    const [callerInfo, setCallerInfo] = useState<{ id: string, name: string, avatar: string } | null>(null);
    const [callId, setCallId] = useState<string | null>(null);
    const startTimeRef = useRef<number | null>(null);

    useEffect(() => {
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
            if (event.streams && event.streams[0]) {
                setRemoteStream(event.streams[0]);
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

    const getLocalStream = async (video: boolean) => {
        try {
            // If we already have a stream and it matches requirements, reuse? 
            // Usually simpler to get new one.
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: video });
            localStreamRef.current = stream;
            setLocalStream(stream);
            setIsVideoEnabled(video);
            return stream;
        } catch (error: any) {
            console.error("Error accessing media devices", error);
            if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
                alert("Permission denied. Please enable microphone/camera.");
            } else {
                alert(`Media Error: ${error.name} - ${error.message}`);
            }
            return null;
        }
    };

    const sendSignal = async (payload: any) => {
        if (!chatId || !user) return;
        await supabase.channel(`chat:${chatId}`).send({
            type: 'broadcast',
            event: 'signal',
            payload: {
                ...payload,
                senderId: user.id,
                senderName: user.user_metadata?.full_name || 'User',
                senderAvatar: user.user_metadata?.avatar_url
            }
        });
    };

    const startCall = async (video: boolean = false) => {
        const stream = await getLocalStream(video);
        if (!stream) return;

        setIsVideoCall(video);
        setCallState('outgoing');
        const pc = createPeerConnection();
        stream.getTracks().forEach(track => pc.addTrack(track, stream));

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        await sendSignal({ type: 'offer', sdp: offer, isVideo: video });

        // Log Call Start
        if (chatId && user) {
            const { data } = await supabase.from('call_logs').insert({
                chat_id: chatId,
                caller_id: user.id,
                status: 'missed',
                type: video ? 'video' : 'audio' // Ensure DB has 'type' col or ignore if not strict
            }).select().single();

            if (data) {
                setCallId(data.id);
                startTimeRef.current = Date.now();
            }
        }
    };

    const answerCall = async () => {
        // Answer with same video capability as offer? Or user choice?
        // Usually if incoming is video, we ask user. For now assume answer accepts video if requested.
        const stream = await getLocalStream(isVideoCall);
        if (!stream) return;

        const pc = createPeerConnection(); // Should exist
        stream.getTracks().forEach(track => pc.addTrack(track, stream));

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        await sendSignal({ type: 'answer', sdp: answer });
        setCallState('connected');
    };

    const handleSignal = async (payload: any) => {
        if (payload.senderId === user?.id) return;

        // If specific user target needed, check here. For now broadcast to chat room.

        const pc = peerConnection.current || createPeerConnection();

        try {
            if (payload.type === 'offer') {
                setCallState('incoming');
                setIsVideoCall(payload.isVideo || false);
                setCallerInfo({
                    id: payload.senderId,
                    name: payload.senderName,
                    avatar: payload.senderAvatar || ''
                });
                await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
            } else if (payload.type === 'answer') {
                if (callState === 'outgoing') {
                    await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
                    setCallState('connected');
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

        if (callId && startTimeRef.current) {
            const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
            await supabase.from('call_logs').update({
                ended_at: new Date().toISOString(),
                duration: duration
            }).eq('id', callId);
        }

        startTimeRef.current = null;
        setCallId(null);
        setRemoteStream(null);

        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
            localStreamRef.current = null;
        }
        setLocalStream(null); // Clear state

        if (peerConnection.current) {
            peerConnection.current.close();
            peerConnection.current = null;
        }
        setCallState('idle');
        setCallerInfo(null);
        setIsVideoCall(false);
    };

    const toggleMute = () => {
        if (localStreamRef.current) {
            localStreamRef.current.getAudioTracks().forEach(track => {
                track.enabled = isMuted;
            });
            setIsMuted(!isMuted);
        }
    };

    const toggleVideo = () => {
        if (localStreamRef.current) {
            localStreamRef.current.getVideoTracks().forEach(track => {
                track.enabled = !isVideoEnabled;
            });
            setIsVideoEnabled(!isVideoEnabled);
        }
    };

    return {
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
    };
};
