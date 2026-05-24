import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  userNames: string[];
}

export default function ChatTypingIndicator({ userNames }: Props) {
  if (userNames.length === 0) return null;
  const label = userNames.length === 1
    ? `${userNames[0]} đang nhập...`
    : 'Nhiều người đang nhập...';

  return (
    <View style={styles.wrapper}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { paddingHorizontal: 16, paddingVertical: 4 },
  text: { fontSize: 13, color: '#9CA3AF', fontStyle: 'italic' },
});
