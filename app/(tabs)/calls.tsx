import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PhoneMissed, PhoneIncoming, PhoneOutgoing, Phone, Video, Search, X } from 'lucide-react-native';
import { useAuthStore, useCallStore } from '@/store';
import { callApi, CallLog } from '@/lib/call-api';
import { employeeApi, Employee } from '@/lib/employee-api';
import { Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants/Tokens';

type Tab = 'history' | 'employees';

export default function CallScreen() {
  const user = useAuthStore((s) => s.user);
  const { startCall } = useCallStore();
  const [tab, setTab] = useState<Tab>('history');
  const [logs, setLogs] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const history = await callApi.getHistory();
      setLogs(history);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setEmployees([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    try {
      const result = await employeeApi.searchEmployees(query.trim());
      setEmployees(result);
    } catch {
      setEmployees([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleCall = (employee: Employee, type: 'VOICE' | 'VIDEO') => {
    if (!employee.userId) {
      Alert.alert('Thông báo', 'Nhân viên này chưa có tài khoản');
      return;
    }
    startCall(employee.userId, type);
  };

  const renderHistoryItem = ({ item }: { item: CallLog }) => {
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

  const renderEmployeeItem = ({ item }: { item: Employee }) => {
    const name = item.fullName || item.User?.name || '';
    const position = item.Position?.name || item.position || '';
    const department = item.Team?.name || item.department;

    return (
      <TouchableOpacity style={styles.empCard}>
        <View style={styles.empAvatar}>
          <Text style={styles.empAvatarText}>{name.charAt(0).toUpperCase() || '?'}</Text>
        </View>
        <View style={styles.empInfo}>
          <Text style={styles.empName}>{name}</Text>
          {position ? <Text style={styles.empPosition}>{position}</Text> : null}
          {department ? <Text style={styles.empDept}>{department}</Text> : null}
        </View>
        <View style={styles.callActions}>
          <TouchableOpacity
            style={[styles.callBtn, styles.callBtnVoice]}
            onPress={() => handleCall(item, 'VOICE')}
          >
            <Phone size={18} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.callBtn, styles.callBtnVideo]}
            onPress={() => handleCall(item, 'VIDEO')}
          >
            <Video size={18} color="#FFF" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Tab selector */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, tab === 'history' && styles.tabActive]}
          onPress={() => setTab('history')}
        >
          <Text style={[styles.tabText, tab === 'history' && styles.tabTextActive]}>
            Lịch sử
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'employees' && styles.tabActive]}
          onPress={() => setTab('employees')}
        >
          <Text style={[styles.tabText, tab === 'employees' && styles.tabTextActive]}>
            Nhân viên
          </Text>
        </TouchableOpacity>
      </View>

      {tab === 'history' ? (
        <FlatList
          data={logs}
          keyExtractor={(item) => item.id}
          renderItem={renderHistoryItem}
          refreshing={loading}
          onRefresh={loadHistory}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Chưa có cuộc gọi nào</Text>
            </View>
          }
          contentContainerStyle={logs.length === 0 ? styles.emptyList : styles.list}
        />
      ) : (
        <View style={styles.empContainer}>
          {/* Search bar */}
          <View style={styles.searchBar}>
            <Search size={18} color="#9CA3AF" />
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm kiếm nhân viên..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={handleSearch}
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => { setSearchQuery(''); setEmployees([]); }}>
                <X size={18} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>

          {searching ? (
            <View style={styles.empty}>
              <ActivityIndicator size="small" color="#0156A7" />
            </View>
          ) : (
            <FlatList
              data={employees}
              keyExtractor={(item) => item.id}
              renderItem={renderEmployeeItem}
              ListEmptyComponent={
                searchQuery.trim() ? (
                  <View style={styles.empty}>
                    <Text style={styles.emptyText}>Không tìm thấy nhân viên</Text>
                  </View>
                ) : (
                  <View style={styles.empty}>
                    <Text style={styles.emptyText}>Nhập tên nhân viên để gọi</Text>
                  </View>
                )
              }
              contentContainerStyle={employees.length === 0 ? styles.emptyList : styles.list}
            />
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const s = Spacing;
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  list: { paddingBottom: 100 },
  emptyList: { flexGrow: 1, paddingBottom: 100 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#9CA3AF', fontSize: FontSizes.md },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginVertical: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    padding: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: { backgroundColor: '#FFF' },
  tabText: { fontSize: FontSizes.md, fontWeight: '500', color: '#6B7280' },
  tabTextActive: { color: '#0156A7', fontWeight: '600' },

  // History card
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E7EB',
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#0156A7',
    justifyContent: 'center', alignItems: 'center',
    marginRight: 12,
  },
  avatarText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  content: { flex: 1 },
  name: { fontSize: 16, fontWeight: '500' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  type: { fontSize: 13 },
  time: { fontSize: 12, color: '#9CA3AF' },

  // Employee search
  empContainer: { flex: 1 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 12,
    height: 40,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: FontSizes.md, color: '#1F2937' },

  // Employee card
  empCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E7EB',
  },
  empAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#10B981',
    justifyContent: 'center', alignItems: 'center',
    marginRight: 12,
  },
  empAvatarText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  empInfo: { flex: 1 },
  empName: { fontSize: 15, fontWeight: '600', color: '#1F2937' },
  empPosition: { fontSize: 13, color: '#6B7280', marginTop: 1 },
  empDept: { fontSize: 12, color: '#9CA3AF', marginTop: 1 },

  // Call action buttons
  callActions: { flexDirection: 'row', gap: 8 },
  callBtn: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
  },
  callBtnVoice: { backgroundColor: '#10B981' },
  callBtnVideo: { backgroundColor: '#0156A7' },
});
