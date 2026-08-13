'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

export default function InRideCallModal({
  socket,
  rideId,
  currentUserId,
  currentUserName,
  currentUserRole,
  otherUserId,
  otherUserName,
  otherUserRole,
  isOpen,
  onClose,
  isInitiator = false,
}) {
  // Call States: 'IDLE' | 'OUTGOING' | 'INCOMING' | 'CONNECTING' | 'CONNECTED' | 'ENDED'
  const [callState, setCallState] = useState('IDLE');
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [activePartner, setActivePartner] = useState({
    id: otherUserId || null,
    name: otherUserName || 'Ride Partner',
    role: otherUserRole || 'USER',
  });

  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const iceCandidatesQueue = useRef([]);
  const incomingOfferRef = useRef(null);

  // Sync active partner info if props change
  useEffect(() => {
    if (otherUserId || otherUserName) {
      setActivePartner({
        id: otherUserId || null,
        name: otherUserName || 'Ride Partner',
        role: otherUserRole || 'USER',
      });
    }
  }, [otherUserId, otherUserName, otherUserRole]);

  // Format Call Timer (MM:SS)
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Timer Management for Active Call
  useEffect(() => {
    if (callState === 'CONNECTED') {
      setCallDuration(0);
      timerIntervalRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [callState]);

  // Cleanup WebRTC & Audio Resources
  const cleanupCall = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      localStreamRef.current = null;
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.onicecandidate = null;
      peerConnectionRef.current.ontrack = null;
      peerConnectionRef.current.onconnectionstatechange = null;
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }

    iceCandidatesQueue.current = [];
    incomingOfferRef.current = null;
    setIsMuted(false);
    setCallDuration(0);
  }, []);

  // Initialize Microphone Audio Stream
  const getLocalAudioStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
      localStreamRef.current = stream;
      return stream;
    } catch (err) {
      console.error('Audio permission error:', err);
      toast.error('Microphone access denied or not available.');
      throw err;
    }
  };

  // Initialize RTCPeerConnection Instance
  const createPeerConnection = useCallback((targetUserId) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    // ICE Candidate generation -> Send to remote peer
    pc.onicecandidate = (event) => {
      if (event.candidate && socket && rideId) {
        socket.emit('call:ice-candidate', {
          rideId,
          toUserId: targetUserId,
          candidate: event.candidate,
        });
      }
    };

    // Remote Audio Track listener
    pc.ontrack = (event) => {
      if (remoteAudioRef.current && event.streams && event.streams[0]) {
        remoteAudioRef.current.srcObject = event.streams[0];
        remoteAudioRef.current.play().catch((err) => {
          console.warn('Remote audio playback autoplay blocked:', err);
        });
      }
    };

    // Connection state changes
    pc.onconnectionstatechange = () => {
      if (!pc) return;
      console.log('WebRTC Connection State:', pc.connectionState);

      if (pc.connectionState === 'connected') {
        setCallState('CONNECTED');
      } else if (
        pc.connectionState === 'disconnected' ||
        pc.connectionState === 'failed' ||
        pc.connectionState === 'closed'
      ) {
        toast('Call disconnected', { icon: '📴' });
        handleEndCall(false);
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  }, [socket, rideId]);

  // Process any ICE Candidates that arrived before remoteDescription was set
  const processQueuedCandidates = async (pc) => {
    while (iceCandidatesQueue.current.length > 0) {
      const candidate = iceCandidatesQueue.current.shift();
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error('Error adding queued ICE candidate:', err);
      }
    }
  };

  // 1. Initiate Outgoing Call (Caller)
  const startCall = useCallback(async () => {
    const targetId = activePartner.id || otherUserId;
    if (!socket || !targetId || !rideId) {
      toast.error('Unable to establish call. Missing user connection.');
      return;
    }

    try {
      setCallState('OUTGOING');
      const stream = await getLocalAudioStream();
      const pc = createPeerConnection(targetId);

      // Add local audio tracks to peer connection
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      // Create WebRTC SDP Offer
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false,
      });
      await pc.setLocalDescription(offer);

      // Emit signaling event to backend
      socket.emit('call:user', {
        rideId,
        toUserId: targetId,
        callerName: currentUserName || 'Ride Partner',
        callerRole: currentUserRole || 'USER',
        offer: offer,
      });
    } catch (err) {
      console.error('Error initiating audio call:', err);
      cleanupCall();
      setCallState('IDLE');
      if (onClose) onClose();
    }
  }, [
    socket,
    rideId,
    activePartner.id,
    otherUserId,
    currentUserName,
    currentUserRole,
    createPeerConnection,
    cleanupCall,
    onClose,
  ]);

  // 2. Answer Incoming Call (Callee)
  const acceptCall = async () => {
    if (!incomingOfferRef.current || !activePartner.id) {
      toast.error('No active incoming call data.');
      return;
    }

    try {
      setCallState('CONNECTING');
      const stream = await getLocalAudioStream();
      const pc = createPeerConnection(activePartner.id);

      // Add local audio tracks
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      // Set Remote Description (Caller's Offer)
      await pc.setRemoteDescription(new RTCSessionDescription(incomingOfferRef.current));

      // Process any early arrived ICE candidates
      await processQueuedCandidates(pc);

      // Create SDP Answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // Emit signaling answer to backend
      socket.emit('call:answer', {
        rideId,
        toUserId: activePartner.id,
        answer: answer,
      });
    } catch (err) {
      console.error('Error answering call:', err);
      toast.error('Failed to connect call');
      handleEndCall(true);
    }
  };

  // 3. Reject Incoming Call (Callee)
  const rejectCall = () => {
    if (socket && activePartner.id && rideId) {
      socket.emit('call:reject', {
        rideId,
        toUserId: activePartner.id,
      });
    }
    cleanupCall();
    setCallState('IDLE');
    if (onClose) onClose();
  };

  // 4. End / Hangup Active Call (Either Party)
  const handleEndCall = useCallback((emitSocket = true) => {
    if (emitSocket && socket && activePartner.id && rideId) {
      socket.emit('call:end', {
        rideId,
        toUserId: activePartner.id,
      });
    }
    cleanupCall();
    setCallState('IDLE');
    if (onClose) onClose();
  }, [socket, activePartner.id, rideId, cleanupCall, onClose]);

  // Toggle Microphone Mute
  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  // Toggle Audio Output Volume / Speaker
  const toggleSpeaker = () => {
    if (remoteAudioRef.current) {
      const nextSpeakerState = !isSpeakerOn;
      remoteAudioRef.current.muted = !nextSpeakerState;
      setIsSpeakerOn(nextSpeakerState);
    }
  };

  // Socket Signaling Listeners
  useEffect(() => {
    if (!socket) return;

    // Incoming Call Handler
    const handleIncomingCall = (data) => {
      const { fromUserId, callerName, callerRole, offer } = data;

      // If already in a call, notify busy/reject
      if (callState !== 'IDLE') {
        socket.emit('call:reject', { rideId, toUserId: fromUserId });
        return;
      }

      incomingOfferRef.current = offer;
      setActivePartner({
        id: fromUserId,
        name: callerName || 'Ride Partner',
        role: callerRole || 'USER',
      });
      setCallState('INCOMING');
    };

    // Caller receives Call Accepted
    const handleCallAccepted = async (data) => {
      const { answer } = data;
      const pc = peerConnectionRef.current;

      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
          await processQueuedCandidates(pc);
          setCallState('CONNECTING');
        } catch (err) {
          console.error('Failed to set remote description on acceptance:', err);
        }
      }
    };

    // Receive Remote ICE Candidate
    const handleRemoteIceCandidate = async (data) => {
      const { candidate } = data;
      const pc = peerConnectionRef.current;

      if (!candidate) return;

      if (pc && pc.remoteDescription && pc.remoteDescription.type) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error('Error adding remote ICE candidate:', err);
        }
      } else {
        // Queue until remoteDescription is set
        iceCandidatesQueue.current.push(candidate);
      }
    };

    // Remote Peer Rejected Call
    const handleCallRejected = () => {
      toast.error('Call declined / user busy.');
      cleanupCall();
      setCallState('IDLE');
      if (onClose) onClose();
    };

    // Remote Peer Ended Call
    const handleCallEnded = () => {
      toast('Call ended by partner.', { icon: '📴' });
      cleanupCall();
      setCallState('IDLE');
      if (onClose) onClose();
    };

    socket.on('call:incoming', handleIncomingCall);
    socket.on('call:accepted', handleCallAccepted);
    socket.on('call:ice-candidate', handleRemoteIceCandidate);
    socket.on('call:rejected', handleCallRejected);
    socket.on('call:ended', handleCallEnded);

    return () => {
      socket.off('call:incoming', handleIncomingCall);
      socket.off('call:accepted', handleCallAccepted);
      socket.off('call:ice-candidate', handleRemoteIceCandidate);
      socket.off('call:rejected', handleCallRejected);
      socket.off('call:ended', handleCallEnded);
    };
  }, [socket, rideId, callState, cleanupCall, onClose]);

  // Trigger Outgoing Call when modal is opened as initiator
  useEffect(() => {
    if (isOpen && isInitiator && callState === 'IDLE' && (otherUserId || activePartner.id)) {
      startCall();
    }
  }, [isOpen, isInitiator, callState, otherUserId, activePartner.id, startCall]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      cleanupCall();
    };
  }, [cleanupCall]);

  // Do not render anything if modal is closed and no incoming call
  const isVisible = isOpen || callState !== 'IDLE';
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      {/* Hidden HTML5 Audio Element for Remote Voice */}
      <audio ref={remoteAudioRef} autoPlay playsInline />

      {/* Modal Container */}
      <div className="w-full max-w-sm bg-gray-900 border border-white/15 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center relative overflow-hidden">
        {/* Background Ambient Glow */}
        <div className="absolute -top-16 -left-16 w-36 h-36 bg-orange-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-36 h-36 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Partner Avatar / Pulse Wave */}
        <div className="relative my-4 flex items-center justify-center">
          {callState === 'CONNECTED' && (
            <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
          )}
          {(callState === 'OUTGOING' || callState === 'INCOMING') && (
            <div className="absolute -inset-3 rounded-full border border-orange-500/40 animate-pulse" />
          )}

          <div
            className={`w-24 h-24 rounded-full flex items-center justify-center text-3xl font-extrabold text-white shadow-xl transition-all ${
              callState === 'CONNECTED'
                ? 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/30'
                : 'bg-gradient-to-br from-orange-500 to-amber-600 shadow-orange-500/30'
            }`}
          >
            {activePartner.name ? activePartner.name.charAt(0).toUpperCase() : '📞'}
          </div>
        </div>

        {/* Partner Details */}
        <h3 className="text-xl font-bold text-white mt-2">
          {activePartner.name || 'Ride Partner'}
        </h3>
        <p className="text-xs uppercase tracking-wider text-orange-400 font-semibold mt-0.5">
          {activePartner.role || 'IN-RIDE AUDIO CALL'}
        </p>

        {/* Dynamic Status / Timer */}
        <div className="mt-3 py-1.5 px-4 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-gray-300">
          {callState === 'OUTGOING' && 'Calling...'}
          {callState === 'INCOMING' && 'Incoming Audio Call...'}
          {callState === 'CONNECTING' && 'Connecting audio...'}
          {callState === 'CONNECTED' && (
            <span className="text-emerald-400 font-mono font-bold tracking-wider">
              {formatTime(callDuration)}
            </span>
          )}
          {callState === 'IDLE' && 'Ready'}
        </div>

        {/* Interactive Controls */}
        <div className="w-full mt-8 flex items-center justify-center gap-4">
          {/* INCOMING CALL ACTIONS */}
          {callState === 'INCOMING' && (
            <div className="flex items-center gap-8">
              {/* Decline Button */}
              <button
                type="button"
                onClick={rejectCall}
                className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 active:scale-95 text-white text-xl flex items-center justify-center shadow-lg shadow-red-500/30 transition-all cursor-pointer"
                title="Decline Call"
              >
                ✕
              </button>

              {/* Accept Button */}
              <button
                type="button"
                onClick={acceptCall}
                className="w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white text-xl flex items-center justify-center shadow-lg shadow-emerald-500/30 transition-all animate-bounce cursor-pointer"
                title="Accept Call"
              >
                📞
              </button>
            </div>
          )}

          {/* OUTGOING / ACTIVE CALL CONTROLS */}
          {(callState === 'OUTGOING' ||
            callState === 'CONNECTING' ||
            callState === 'CONNECTED') && (
            <div className="flex items-center gap-4">
              {/* Mute Toggle */}
              <button
                type="button"
                onClick={toggleMute}
                className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-semibold transition-all cursor-pointer ${
                  isMuted
                    ? 'bg-red-500/20 border border-red-500 text-red-400'
                    : 'bg-white/10 hover:bg-white/20 text-gray-200'
                }`}
                title={isMuted ? 'Unmute Mic' : 'Mute Mic'}
              >
                {isMuted ? '🔇' : '🎙️'}
              </button>

              {/* End Call Button */}
              <button
                type="button"
                onClick={() => handleEndCall(true)}
                className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 active:scale-95 text-white text-xl flex items-center justify-center shadow-lg shadow-red-500/40 transition-all cursor-pointer"
                title="End Call"
              >
                📴
              </button>

              {/* Speaker Toggle */}
              <button
                type="button"
                onClick={toggleSpeaker}
                className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-semibold transition-all cursor-pointer ${
                  !isSpeakerOn
                    ? 'bg-white/5 text-gray-500'
                    : 'bg-white/10 hover:bg-white/20 text-gray-200'
                }`}
                title={isSpeakerOn ? 'Mute Speaker' : 'Enable Speaker'}
              >
                {isSpeakerOn ? '🔊' : '🔈'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
