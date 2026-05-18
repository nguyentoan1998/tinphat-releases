// Chat page — Simple placeholder
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ThemeColors } from '@/constants/ThemeColors';

export default function ChatPage() {
  const colors = ThemeColors.light;
  
  return (
    <View style={[styles.container, { backgroundColor: colors.screenBg }]}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Chat</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>Tin nhắn và hội thoại</Text>
        </View>
        <View style={styles.empty}>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>Chưa có tin nhắn nào</Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  header: { padding: 20, paddingTop: 10 },
  title: { fontSize: 28, fontWeight: 'bold' },
  subtitle: { fontSize: 14, marginTop: 4 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16 },
});
