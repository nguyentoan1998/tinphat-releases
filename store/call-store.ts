import { create } from 'zustand';
import { getSocket } from '@/lib/socket';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    ...(process.env.EXPO_PUBLIC_TURN_URL
      ? [
          {
            urls: process.env.EXPO_PUBLIC_TURN_URL,
            username: process.env.EXPO_PUBLIC_TURN_USERNAME,
            credential: process.env.EXPO_PUBLIC_TURN_CREDENTIAL,
          },
        ]
      : []),
  ],
};

let _callListeners = false;
let _durationInterval: ReturnType<typeof setInterval> | null = null;
let _pendingLocalCandidates: any[] = [];

interface CallState {
  status: 'idle' | 'calling' | 'ringing' | 'connected';
  callType: 'VOICE' | 'VIDEO' | null;
  callId: string | null;
  remoteUserId: string | null;
  localStream: any | null;
  remoteStream: any | null;
  peerConnection: any | null;
  incomingCaller: { id: string; name: string; sdp?: any } | null;
  duration: number;
  isMuted: boolean;
  isSpeakerOn: boolean;
  isCameraOn: boolean;

  startCall: (targetUserId: string, callType: 'VOICE' | 'VIDEO') => Promise<void>;
  acceptCall: () => Promise<void>;
  endCall: () => void;
  rejectCall: () => void;
  toggleMute: () => void;
  toggleSpeaker: () => void;
  toggleCamera: () => void;
  switchCamera: () => void;
  initSocket: () => void;
  destroySocket: () => void;
  reset: () => void;
}

export const useCallStore = create<CallState>((set, get) => ({
  status: 'idle',
  callType: null,
  callId: null,
  remoteUserId: null,
  localStream: null,
  remoteStream: null,
  peerConnection: null,
  incomingCaller: null,
  duration: 0,
  isMuted: false,
  isSpeakerOn: false,
  isCameraOn: true,

  startCall: async (targetUserId, callType) => {
    const { mediaDevices, RTCPeerConnection } = require('react-native-webrtc');
    let stream: any;
    try {
      stream = await mediaDevices.getUserMedia({
        audio: true,
        video: callType === 'VIDEO',
      });
    } catch (error) {
      set({ status: 'idle', callType: null, remoteUserId: null });
      throw error;
    }
    set({ localStream: stream, remoteUserId: targetUserId, callType, status: 'calling' });

    const pc = new RTCPeerConnection(ICE_SERVERS);
    stream.getTracks().forEach((track: any) => pc.addTrack(track, stream));

    pc.onicecandidate = (e: any) => {
      if (e.candidate) {
        const currentCallId = get().callId;
        if (currentCallId) {
          getSocket().emit('call:ice-candidate', {
            callId: currentCallId,
            candidate: e.candidate,
          });
        } else {
          _pendingLocalCandidates.push(e.candidate);
        }
      }
    };

    pc.ontrack = (e: any) => {
      set({ remoteStream: e.streams[0] });
      set({ status: 'connected' });
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    set({ peerConnection: pc });

    getSocket().emit('call:offer', {
      targetUserId,
      callType,
      sdp: offer,
    });
  },

  acceptCall: async () => {
    const { incomingCaller, callId, callType } = get();
    if (!incomingCaller) return;

    const { mediaDevices, RTCPeerConnection, RTCSessionDescription } = require('react-native-webrtc');
    let stream: any;
    try {
      stream = await mediaDevices.getUserMedia({
        audio: true,
        video: callType === 'VIDEO',
      });
    } catch (error) {
      set({ status: 'idle', incomingCaller: null, callId: null, callType: null });
      throw error;
    }
    set({ localStream: stream });

    const pc = new RTCPeerConnection(ICE_SERVERS);
    stream.getTracks().forEach((track: any) => pc.addTrack(track, stream));

    pc.onicecandidate = (e: any) => {
      if (e.candidate) {
        getSocket().emit('call:ice-candidate', {
          callId,
          candidate: e.candidate,
        });
      }
    };

    pc.ontrack = (e: any) => {
      set({ remoteStream: e.streams[0] });
      set({ status: 'connected' });
    };

    await pc.setRemoteDescription(new RTCSessionDescription(incomingCaller.sdp));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    set({ peerConnection: pc });
    getSocket().emit('call:accept', { callId, sdp: answer });

    _durationInterval = setInterval(() => {
      set((s) => ({ duration: s.duration + 1 }));
    }, 1000);
  },

  endCall: () => {
    const { callId, peerConnection, localStream, duration } = get();
    getSocket().emit('call:end', { callId, duration });

    if (peerConnection) {
      peerConnection.close();
    }
    if (localStream) {
      localStream.getTracks().forEach((t: any) => t.stop());
    }
    if (_durationInterval) {
      clearInterval(_durationInterval);
      _durationInterval = null;
    }
    _pendingLocalCandidates = [];
    set({
      status: 'idle',
      callType: null,
      callId: null,
      remoteUserId: null,
      localStream: null,
      remoteStream: null,
      peerConnection: null,
      incomingCaller: null,
      duration: 0,
      isMuted: false,
      isSpeakerOn: false,
      isCameraOn: true,
    });
  },

  rejectCall: () => {
    const { callId } = get();
    if (callId) getSocket().emit('call:reject', { callId });
    _pendingLocalCandidates = [];
    set({ status: 'idle', incomingCaller: null, callId: null });
  },

  toggleMute: () => {
    const { localStream, isMuted } = get();
    if (localStream) {
      localStream.getAudioTracks().forEach((t: any) => {
        t.enabled = isMuted;
      });
    }
    set({ isMuted: !isMuted });
  },

  toggleSpeaker: () => {
    set((s) => ({ isSpeakerOn: !s.isSpeakerOn }));
  },

  toggleCamera: () => {
    const { localStream, isCameraOn } = get();
    if (localStream) {
      localStream.getVideoTracks().forEach((t: any) => {
        t.enabled = !isCameraOn;
      });
    }
    set({ isCameraOn: !isCameraOn });
  },

  switchCamera: () => {
    const { localStream } = get();
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack._switchCamera();
      }
    }
  },

  initSocket: () => {
    if (_callListeners) return;
    _callListeners = true;
    const socket = getSocket();

    socket.on('call:offer', ({ callId, callerId, callerName, callType, sdp }) => {
      const { status } = get();
      if (status !== 'idle') {
        getSocket().emit('call:reject', { callId });
        return;
      }
      set({
        status: 'ringing',
        callId,
        callType,
        incomingCaller: { id: callerId, name: callerName, sdp },
      });
    });

    socket.on('call:offered', ({ callId }) => {
      set({ callId });
      _pendingLocalCandidates.forEach((candidate) => {
        getSocket().emit('call:ice-candidate', { callId, candidate });
      });
      _pendingLocalCandidates = [];
    });

    socket.on('call:accepted', async ({ callId, sdp }) => {
      const { peerConnection } = get();
      if (peerConnection && sdp) {
        const { RTCSessionDescription } = require('react-native-webrtc');
        await peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
        set({ status: 'connected' });
        _durationInterval = setInterval(() => {
          set((s) => ({ duration: s.duration + 1 }));
        }, 1000);
      }
    });

    socket.on('call:ice-candidate', async ({ callId, candidate }) => {
      const { peerConnection } = get();
      if (peerConnection && candidate) {
        const { RTCIceCandidate } = require('react-native-webrtc');
        try {
          await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          // ignore invalid candidates
        }
      }
    });

    socket.on('call:ended', ({ callId: endedCallId }) => {
      const { callId, peerConnection, localStream } = get();
      if (callId === endedCallId) {
        if (peerConnection) peerConnection.close();
        if (localStream) localStream.getTracks().forEach((t: any) => t.stop());
        if (_durationInterval) {
          clearInterval(_durationInterval);
          _durationInterval = null;
        }
        _pendingLocalCandidates = [];
        set({
          status: 'idle',
          callType: null,
          callId: null,
          remoteUserId: null,
          localStream: null,
          remoteStream: null,
          peerConnection: null,
          incomingCaller: null,
          duration: 0,
        });
      }
    });

    socket.on('call:rejected', ({ callId: rejectedCallId }) => {
      const { callId, peerConnection, localStream } = get();
      if (callId === rejectedCallId) {
        if (peerConnection) peerConnection.close();
        if (localStream) localStream.getTracks().forEach((t: any) => t.stop());
        _pendingLocalCandidates = [];
        set({
          status: 'idle',
          callType: null,
          callId: null,
          remoteUserId: null,
          localStream: null,
          remoteStream: null,
          peerConnection: null,
          incomingCaller: null,
          duration: 0,
        });
      }
    });
  },

  destroySocket: () => {
    if (!_callListeners) return;
    const socket = getSocket();
    socket.off('call:offer');
    socket.off('call:offered');
    socket.off('call:accepted');
    socket.off('call:ice-candidate');
    socket.off('call:ended');
    socket.off('call:rejected');
    _callListeners = false;
  },

  reset: () => {
    get().destroySocket();
    if (_durationInterval) {
      clearInterval(_durationInterval);
      _durationInterval = null;
    }
    _pendingLocalCandidates = [];
    set({
      status: 'idle',
      callType: null,
      callId: null,
      remoteUserId: null,
      localStream: null,
      remoteStream: null,
      peerConnection: null,
      incomingCaller: null,
      duration: 0,
      isMuted: false,
      isSpeakerOn: false,
      isCameraOn: true,
    });
  },
}));
