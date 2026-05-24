import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Phone, PhoneOff } from 'lucide-react-native';
import { useCallStore } from '@/store/call-store';

export default function IncomingCallOverlay() {
  const { incomingCaller, callType, acceptCall, rejectCall } = useCallStore();

  if (!incomingCaller) return null;

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {incomingCaller.name?.charAt(0).toUpperCase() || '?'}
          </Text>
        </View>
        <Text style={styles.name}>{incomingCaller.name}</Text>
        <Text style={styles.type}>
          Cuộc gọi {callType === 'VIDEO' ? 'video' : 'thoại'} đến...
        </Text>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.rejectBtn} onPress={rejectCall}>
            <PhoneOff size={28} color="#FFF" />
            <Text style={styles.btnLabel}>Từ chối</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.acceptBtn}
            onPress={async () => {
              try {
                await acceptCall();
              } catch {
                Alert.alert(
                  'Không thể nhận cuộc gọi',
                  callType === 'VIDEO'
                    ? 'Vui lòng cấp quyền camera và micro rồi thử lại.'
                    : 'Vui lòng cấp quyền micro rồi thử lại.',
                );
              }
            }}
          >
            <Phone size={28} color="#FFF" />
            <Text style={styles.btnLabel}>Trả lời</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: { alignItems: 'center' },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#0156A7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarText: { color: '#FFF', fontSize: 40, fontWeight: 'bold' },
  name: { fontSize: 28, fontWeight: '600', color: '#FFF', marginBottom: 8 },
  type: { fontSize: 16, color: 'rgba(255,255,255,0.7)', marginBottom: 60 },
  actions: { flexDirection: 'row', gap: 60 },
  rejectBtn: { alignItems: 'center' },
  acceptBtn: { alignItems: 'center' },
  btnLabel: { color: '#FFF', fontSize: 12, marginTop: 8 },
});
