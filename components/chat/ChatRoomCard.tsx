import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ChatRoom } from '@/store/chat-store';

interface Props {
  room: ChatRoom;
  currentUserId: string;
  onPress: (roomId: string) => void;
}

export default function ChatRoomCard({ room, currentUserId, onPress }: Props) {
  const other = room.participants?.find((p: any) => p.userId !== currentUserId);
  const name = other?.user?.name || 'Unknown';
  const lastMsg = room.lastMessage;
  const time = lastMsg
    ? new Date(lastMsg.createdAt).toLocaleDateString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(room.id)}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>{name}</Text>
        {lastMsg && (
          <Text style={styles.preview} numberOfLines={1}>
            {lastMsg.type === 'IMAGE' ? '📷 Hình ảnh' : lastMsg.content}
          </Text>
        )}
      </View>
      <View style={styles.meta}>
        <Text style={styles.time}>{time}</Text>
        {room.unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{room.unreadCount > 99 ? '99+' : room.unreadCount}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: '#E5E7EB' },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#0156A7', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  content: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  preview: { fontSize: 14, color: '#6B7280', marginTop: 2 },
  meta: { alignItems: 'flex-end', marginLeft: 8 },
  time: { fontSize: 12, color: '#9CA3AF' },
  badge: { backgroundColor: '#EF4444', borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6, marginTop: 4 },
  badgeText: { color: '#FFF', fontSize: 11, fontWeight: 'bold' },
});
