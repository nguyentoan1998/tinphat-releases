import React, { useEffect, useCallback, useMemo, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Plus, Search, X } from 'lucide-react-native';
import { useAuthStore } from '@/store';
import { useChatStore } from '@/store/chat-store';
import ChatRoomCard from '@/components/chat/ChatRoomCard';
import { userApi, AppUser } from '@/lib/user-api';
import { chatApi } from '@/lib/chat-api';
import { getErrorMessage } from '@/lib/api-client';

export default function ChatRoomList() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { rooms, loadingRooms, loadRooms, initSocket, destroySocket } = useChatStore();
  const [pickerVisible, setPickerVisible] = useState(false);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    initSocket();
    loadRooms();
    return () => { destroySocket(); };
  }, []);

  const handlePress = useCallback((roomId: string) => {
    router.push(`/(tabs)/chat/${roomId}` as any);
  }, [router]);

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const allUsers = await userApi.getAll();
      setUsers(allUsers.filter((item) => item.id !== user?.id && item.isActive));
    } catch {
      Alert.alert('Lỗi', 'Không thể tải danh sách người dùng');
    } finally {
      setLoadingUsers(false);
    }
  }, [user?.id]);

  const openUserPicker = useCallback(async () => {
    setPickerVisible(true);
    if (users.length > 0) return;
    await loadUsers();
  }, [loadUsers, users.length]);

  const filteredUsers = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return users;
    return users.filter((item) =>
      `${item.name || ''} ${item.email}`.toLowerCase().includes(keyword)
    );
  }, [query, users]);

  const handleCreateRoom = useCallback(async (targetUserId: string) => {
    try {
      const room = await chatApi.createRoom([targetUserId]);
      setPickerVisible(false);
      setQuery('');
      await loadRooms();
      router.push(`/(tabs)/chat/${room.id}` as any);
    } catch (error: any) {
      console.warn(
        '[Chat] Failed to create room:',
        error?.response?.status,
        error?.response?.data?.message || error?.message,
      );
      Alert.alert('Lỗi', getErrorMessage(error, 'Không thể tạo cuộc trò chuyện'));
    }
  }, [loadRooms, router]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Tin nhắn</Text>
        <TouchableOpacity style={styles.newBtn} onPress={openUserPicker}>
          <Plus size={22} color="#FFF" />
        </TouchableOpacity>
      </View>
      <FlatList
        data={rooms}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ChatRoomCard
            room={item}
            currentUserId={user?.id || ''}
            onPress={handlePress}
          />
        )}
        refreshing={loadingRooms}
        onRefresh={loadRooms}
        contentContainerStyle={rooms.length === 0 ? styles.emptyList : styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Chưa có tin nhắn</Text>
          </View>
        }
      />
      <Modal visible={pickerVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Tạo cuộc trò chuyện</Text>
            <TouchableOpacity onPress={() => setPickerVisible(false)} style={styles.closeBtn}>
              <X size={22} color="#1F2937" />
            </TouchableOpacity>
          </View>
          <View style={styles.searchBox}>
            <Search size={18} color="#6B7280" />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Tìm theo tên hoặc email"
              placeholderTextColor="#9CA3AF"
              style={styles.searchInput}
              autoCapitalize="none"
            />
          </View>
          <FlatList
            data={filteredUsers}
            keyExtractor={(item) => item.id}
            refreshing={loadingUsers}
            onRefresh={loadUsers}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={styles.emptyUsers}>
                <Text style={styles.emptyText}>{loadingUsers ? 'Đang tải...' : 'Không tìm thấy người dùng'}</Text>
              </View>
            }
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.userRow} onPress={() => handleCreateRoom(item.id)}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{(item.name || item.email).charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.userInfo}>
                  <Text style={styles.userName} numberOfLines={1}>{item.name || item.email}</Text>
                  {!!item.name && <Text style={styles.userEmail} numberOfLines={1}>{item.email}</Text>}
                </View>
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: { fontSize: 22, fontWeight: '700', color: '#1F2937' },
  list: { paddingBottom: 100 },
  emptyList: { flexGrow: 1, paddingBottom: 100 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#9CA3AF' },
  newBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0156A7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modal: { flex: 1, backgroundColor: '#FFF' },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937' },
  closeBtn: { padding: 8 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 15, color: '#1F2937' },
  emptyUsers: { paddingVertical: 40, alignItems: 'center' },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E7EB',
  },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#0156A7', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  userInfo: { flex: 1 },
  userName: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  userEmail: { fontSize: 13, color: '#6B7280', marginTop: 2 },
});
