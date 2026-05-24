import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PhoneMissed, PhoneIncoming, PhoneOutgoing } from 'lucide-react-native';
import { useAuthStore } from '@/store';
import { callApi, CallLog } from '@/lib/call-api';

export default function CallHistory() {
  const user = useAuthStore((s) => s.user);
  const [logs, setLogs] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const history = await callApi.getHistory();
      setLogs(history);
    } catch (error: any) {
      console.warn(
        '[Calls] Failed to load history:',
        error?.response?.status,
        error?.response?.data?.message || error?.message,
      );
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: CallLog }) => {
    const isOutgoing = item.callerId === user?.id;
    const other = isOutgoing ? item.receiver : item.caller;
    const Icon = item.status === 'MISSED' ? PhoneMissed : isOutgoing ? PhoneOutgoing : PhoneIncoming;
    const statusColor = item.status === 'MISSED' ? '#EF4444' : '#1F2937';

    return (
      <TouchableOpacity style={styles.card}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{other.name?.charAt(0).toUpperCase() || '?'}</Text>
        </View>
        <View style={styles.content}>
          <Text style={[styles.name, { color: statusColor }]}>{other.name}</Text>
          <View style={styles.meta}>
            <Icon size={14} color={statusColor} />
            <Text style={[styles.type, { color: statusColor }]}>
              {item.callType === 'VIDEO' ? 'Cuộc gọi video' : 'Cuộc gọi thoại'}
              {item.duration ? ` · ${Math.floor(item.duration / 60)}:${(item.duration % 60).toString().padStart(2, '0')}` : ''}
            </Text>
          </View>
        </View>
        <Text style={styles.time}>
          {new Date(item.startedAt).toLocaleDateString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={logs}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshing={loading}
        onRefresh={loadHistory}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Chưa có cuộc gọi nào</Text>
          </View>
        }
        contentContainerStyle={logs.length === 0 ? styles.emptyList : styles.list}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  list: { paddingBottom: 100 },
  emptyList: { flexGrow: 1, paddingBottom: 100 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#9CA3AF' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E7EB',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0156A7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  content: { flex: 1 },
  name: { fontSize: 16, fontWeight: '500' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  type: { fontSize: 13 },
  time: { fontSize: 12, color: '#9CA3AF' },
});
