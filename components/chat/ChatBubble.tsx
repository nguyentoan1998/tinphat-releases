import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { FileText } from 'lucide-react-native';
import { ChatMessage } from '@/store/chat-store';
import { buildApiUrl } from '@/lib/api-client';

interface Props {
  message: ChatMessage;
  isOwn: boolean;
  onImagePress?: (url: string) => void;
}

export default function ChatBubble({ message, isOwn, onImagePress }: Props) {
  const fileUrl = buildApiUrl(message.fileUrl);
  const time = new Date(message.createdAt).toLocaleTimeString('vi-VN', {
    hour: '2-digit', minute: '2-digit',
  });
  const fileSize = typeof message.fileSize === 'number'
    ? `${(message.fileSize / 1024 / 1024).toFixed(message.fileSize > 1024 * 1024 ? 1 : 2)} MB`
    : '';

  return (
    <View style={[styles.wrapper, isOwn ? styles.own : styles.other]}>
      <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
        {message.type === 'TEXT' && (
          <Text style={[styles.text, { color: isOwn ? '#FFF' : '#111827' }]}>
            {message.content}
          </Text>
        )}
        {message.type === 'IMAGE' && fileUrl && (
          <TouchableOpacity onPress={() => onImagePress?.(fileUrl)}>
            <Image
              source={{ uri: fileUrl }}
              style={styles.image}
              resizeMode="cover"
            />
          </TouchableOpacity>
        )}
        {message.type === 'FILE' && (
          <TouchableOpacity
            style={styles.fileRow}
            disabled={!fileUrl}
            onPress={() => fileUrl && Linking.openURL(fileUrl)}
          >
            <FileText size={20} color={isOwn ? '#FFF' : '#374151'} />
            <View style={styles.fileMeta}>
              <Text style={[styles.fileName, { color: isOwn ? '#FFF' : '#111827' }]} numberOfLines={2}>
                {message.fileName || 'Tệp đính kèm'}
              </Text>
              {!!fileSize && (
                <Text style={[styles.fileSize, { color: isOwn ? 'rgba(255,255,255,0.7)' : '#6B7280' }]}>
                  {fileSize}
                </Text>
              )}
            </View>
          </TouchableOpacity>
        )}
        <View style={styles.timeRow}>
          <Text style={[styles.time, { color: isOwn ? 'rgba(255,255,255,0.8)' : '#6B7280' }]}>
            {time}
          </Text>
          {isOwn && <Text style={styles.seenIcon}>✓✓</Text>}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginVertical: 3, paddingHorizontal: 12, flexDirection: 'row', alignSelf: 'stretch' },
  own: { justifyContent: 'flex-end' },
  other: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '75%', padding: 10, borderRadius: 16 },
  bubbleOwn: {
    backgroundColor: '#0156A7',
    borderBottomRightRadius: 4,
    boxShadow: '0px 2px 4px rgba(1,86,167,0.2)',
    elevation: 3,
  },
  bubbleOther: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  text: { fontSize: 15, lineHeight: 20 },
  image: { width: 200, height: 200, borderRadius: 12 },
  fileRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  fileMeta: { flexShrink: 1 },
  fileName: { fontSize: 14, flexShrink: 1 },
  fileSize: { fontSize: 11, marginTop: 2 },
  timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 4, gap: 4 },
  time: { fontSize: 11 },
  seenIcon: { fontSize: 10, color: 'rgba(255,255,255,0.8)', letterSpacing: -1 },
});
