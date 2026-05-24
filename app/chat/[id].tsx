import React, { useEffect, useRef, useCallback } from 'react';
import { View, FlatList, Text, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Phone, Video } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useChatStore } from '@/store/chat-store';
import { useAuthStore } from '@/store';
import { getSocket } from '@/lib/socket';
import ChatBubble from '@/components/chat/ChatBubble';
import ChatInput from '@/components/chat/ChatInput';
import ChatTypingIndicator from '@/components/chat/ChatTypingIndicator';
import { uploadFile } from '@/lib/upload-api';
import { useCallStore } from '@/store/call-store';

export default function ChatDetail() {
  const { id: roomId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    messages, loadMessages, loadMoreMessages, sendMessage, markRead, setTyping, typingUsers,
  } = useChatStore();
  const startCall = useCallStore((s) => s.startCall);

  const roomMessages = messages[roomId!] || [];
  const typing = typingUsers[roomId!] || [];
  const otherUserId = roomMessages.find((m) => m.senderId !== user?.id)?.senderId;

  useEffect(() => {
    if (roomId) {
      loadMessages(roomId);
      markRead(roomId);
      getSocket().emit('chat:join', roomId);
    }
    return () => {
      if (roomId) getSocket().emit('chat:leave', roomId);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (roomId) setTyping(roomId, false);
    };
  }, [roomId, loadMessages, markRead, setTyping]);

  const handleSend = useCallback(async (text: string) => {
    if (!roomId) return;
    sendMessage(roomId, text);
  }, [roomId, sendMessage]);

  const handleImagePick = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });
    if (!result.canceled && roomId) {
      const asset = result.assets[0];
      try {
        const uploaded = await uploadFile(asset.uri, asset.fileName || 'image.jpg', asset.mimeType || 'image/jpeg');
        sendMessage(roomId, '', uploaded);
      } catch (e) {
        Alert.alert('Lỗi', 'Không thể tải ảnh lên');
      }
    }
  }, [roomId, sendMessage]);

  const handleFilePick = useCallback(async () => {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (!result.canceled && roomId) {
      const asset = result.assets[0];
      try {
        const uploaded = await uploadFile(
          asset.uri,
          asset.name || 'file',
          asset.mimeType || 'application/octet-stream',
        );
        sendMessage(roomId, '', uploaded);
      } catch {
        Alert.alert('Lỗi', 'Không thể tải tệp lên');
      }
    }
  }, [roomId, sendMessage]);

  const handleAttachPress = useCallback(() => {
    Alert.alert('Đính kèm', undefined, [
      { text: 'Ảnh', onPress: handleImagePick },
      { text: 'Tệp', onPress: handleFilePick },
      { text: 'Hủy', style: 'cancel' },
    ]);
  }, [handleFilePick, handleImagePick]);

  const handleTyping = useCallback((isTyping: boolean) => {
    if (!roomId) return;
    setTyping(roomId, isTyping);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (isTyping) {
      typingTimeoutRef.current = setTimeout(() => {
        setTyping(roomId, false);
      }, 2500);
    }
  }, [roomId, setTyping]);

  const handleStartCall = useCallback(async (callType: 'VOICE' | 'VIDEO') => {
    if (!otherUserId) {
      Alert.alert('Không thể gọi', 'Chưa xác định được người nhận trong cuộc trò chuyện này.');
      return;
    }
    try {
      await startCall(otherUserId, callType);
    } catch {
      Alert.alert(
        'Không thể bắt đầu cuộc gọi',
        callType === 'VIDEO'
          ? 'Vui lòng cấp quyền camera và micro rồi thử lại.'
          : 'Vui lòng cấp quyền micro rồi thử lại.',
      );
    }
  }, [otherUserId, startCall]);

  const handleLoadMore = useCallback(() => {
    loadMoreMessages(roomId!);
  }, [roomId, loadMoreMessages]);

  const renderItem = useCallback(({ item }: any) => (
    <ChatBubble
      message={item}
      isOwn={item.senderId === user?.id}
    />
  ), [user?.id]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chat</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.callBtn}
            onPress={() => handleStartCall('VOICE')}
          >
            <Phone size={20} color="#0156A7" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.callBtn}
            onPress={() => handleStartCall('VIDEO')}
          >
            <Video size={20} color="#0156A7" />
          </TouchableOpacity>
        </View>
      </View>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
        <FlatList
          ref={flatListRef}
          data={[...roomMessages].reverse()}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.1}
          style={styles.list}
          ListFooterComponent={<ChatTypingIndicator userNames={typing} />}
        />
        <ChatInput onSend={handleSend} onAttachPress={handleAttachPress} onTyping={handleTyping} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  headerActions: { flexDirection: 'row', gap: 8, marginLeft: 'auto' },
  callBtn: { padding: 8 },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#1F2937', marginLeft: 8 },
  list: { flex: 1 },
});
