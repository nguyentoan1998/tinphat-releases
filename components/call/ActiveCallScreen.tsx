import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { PhoneOff, Mic, MicOff, Camera, CameraOff, MonitorSpeaker } from 'lucide-react-native';
import { RTCView } from 'react-native-webrtc';
import { useCallStore } from '@/store/call-store';

export default function ActiveCallScreen() {
  const {
    status, callType, duration, localStream, remoteStream,
    isMuted, isSpeakerOn, isCameraOn,
    endCall, toggleMute, toggleSpeaker, toggleCamera, switchCamera,
  } = useCallStore();

  if (status !== 'connected' && status !== 'calling') return null;

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      {callType === 'VIDEO' && remoteStream ? (
        <RTCView streamURL={remoteStream.toURL()} style={styles.remoteVideo} objectFit="cover" />
      ) : (
        <View style={styles.voiceBg}>
          <View style={styles.largeAvatar}>
            <Text style={styles.largeAvatarText}>?</Text>
          </View>
        </View>
      )}

      {callType === 'VIDEO' && localStream && (
        <View style={styles.pipContainer}>
          <RTCView streamURL={localStream.toURL()} style={styles.pip} objectFit="cover" zOrder={1} />
          <TouchableOpacity style={styles.switchCamBtn} onPress={switchCamera}>
            <Camera size={16} color="#FFF" />
          </TouchableOpacity>
        </View>
      )}

      <Text style={styles.timer}>{formatTime(duration)}</Text>

      <View style={styles.controls}>
        <TouchableOpacity style={styles.controlBtn} onPress={toggleMute}>
          {isMuted ? <MicOff size={24} color="#FFF" /> : <Mic size={24} color="#FFF" />}
          <Text style={styles.controlLabel}>Tắt mic</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.endCallBtn} onPress={endCall}>
          <PhoneOff size={32} color="#FFF" />
        </TouchableOpacity>

        {callType === 'VIDEO' && (
          <TouchableOpacity style={styles.controlBtn} onPress={toggleCamera}>
            {isCameraOn ? <Camera size={24} color="#FFF" /> : <CameraOff size={24} color="#FFF" />}
            <Text style={styles.controlLabel}>Camera</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.controlBtn} onPress={toggleSpeaker}>
          <MonitorSpeaker size={24} color={isSpeakerOn ? '#0156A7' : '#FFF'} />
          <Text style={styles.controlLabel}>Loa</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFillObject, backgroundColor: '#1a1a2e', zIndex: 9998 },
  remoteVideo: { ...StyleSheet.absoluteFillObject },
  voiceBg: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  largeAvatar: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: '#0156A7', justifyContent: 'center', alignItems: 'center',
  },
  largeAvatarText: { color: '#FFF', fontSize: 48, fontWeight: 'bold' },
  pipContainer: {
    position: 'absolute', top: 60, right: 20,
    width: 120, height: 180, borderRadius: 12, overflow: 'hidden',
  },
  pip: { width: 120, height: 180 },
  switchCamBtn: {
    position: 'absolute', bottom: 8, alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 16, padding: 6,
  },
  timer: {
    position: 'absolute', top: 60, alignSelf: 'center',
    fontSize: 16, color: '#FFF', fontWeight: '600',
  },
  controls: {
    position: 'absolute', bottom: 50, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'center', gap: 24, alignItems: 'center',
  },
  controlBtn: { alignItems: 'center', width: 60 },
  endCallBtn: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center',
  },
  controlLabel: { color: '#FFF', fontSize: 11, marginTop: 4 },
});
