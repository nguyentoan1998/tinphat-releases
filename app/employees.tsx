// Employees Screen — Glassmorphism + Full CRUD
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
    View, Text, StyleSheet, Pressable, ScrollView, RefreshControl,
    TextInput, Linking,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import { Users, ChevronLeft, RefreshCw, Search, Plus, PhoneCall, Trash2, UserCheck, UserX, Briefcase } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';

import { employeeApi, Employee, CreateEmployeeDto, UpdateEmployeeDto } from '@/lib/employee-api';
import { teamApi, Team } from '@/lib/team-api';
import { Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants/Tokens';
import { StatusBadge } from '@/components/ui/GlassDataScreen';
import { useAuthStore, useThemeStore } from '@/store';
import { ThemeColors } from '@/constants/ThemeColors';
import { useDarkDialog } from '@/components/ui/DarkDialog';
import EmployeeViewModal from '@/components/ui/EmployeeViewModal';
import EmployeeFormModal from '@/components/ui/EmployeeFormModal';

const STATUS_MAP: Record<string, { label: string; color: string }> = {
    ACTIVE: { label: 'Đang làm', color: '#10B981' },
    INACTIVE: { label: 'Ngừng việc', color: '#EF4444' },
    ON_LEAVE: { label: 'Nghỉ phép', color: '#F59E0B' },
    TERMINATED: { label: 'Nghỉ việc', color: '#94A3B8' },
};

const avatarInitials = (name: string) => name.split(' ').slice(-2).map(w => w[0]).join('').toUpperCase();
const AVATAR_COLORS = ['#6366F1', '#0EA5E9', '#10B981', '#EC4899', '#F59E0B', '#8B5CF6'];
const avatarColor = (id: string) => AVATAR_COLORS[id.charCodeAt(0) % AVATAR_COLORS.length];

// Status filter config
const STATUS_FILTERS = [
    { key: '', label: 'Tất cả', color: '#6366F1' },
    { key: 'ACTIVE', label: 'Đang làm', color: '#10B981' },
    { key: 'ON_LEAVE', label: 'Nghỉ phép', color: '#F59E0B' },
    { key: 'TERMINATED_INACTIVE', label: 'Nghỉ việc', color: '#EF4444' },
];

export default function EmployeesScreen() {
    const router = useRouter();
    const { user } = useAuthStore();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('');
    const [selectedTeamId, setSelectedTeamId] = useState('');
    const { isDark } = useThemeStore();
    const colors = ThemeColors.light;
    const { showDialog, DialogComponent } = useDarkDialog();

    const isAdmin = user?.role === 'ADMIN';

    // Modal states
    const [viewEmployee, setViewEmployee] = useState<Employee | null>(null);
    const [viewModalVisible, setViewModalVisible] = useState(false);
    const [formEmployee, setFormEmployee] = useState<Employee | null>(null);
    const [formModalVisible, setFormModalVisible] = useState(false);

    useEffect(() => { load(); }, []);

    const load = async () => {
        try {
            setLoading(true);
            const [empData, teamData] = await Promise.all([
                employeeApi.getEmployees(),
                teamApi.getTeams(),
            ]);
            setEmployees(Array.isArray(empData) ? empData : []);
            setTeams(Array.isArray(teamData) ? teamData : []);
        } catch (e: any) {
            showDialog('Lỗi', e.response?.data?.message || 'Không thể tải danh sách nhân viên');
        } finally { setLoading(false); setRefreshing(false); }
    };

    const filtered = useMemo(() => {
        let list = employees;

        // Filter by status
        if (selectedStatus === 'TERMINATED_INACTIVE') {
            list = list.filter(e => e.status === 'TERMINATED' || e.status === 'INACTIVE');
        } else if (selectedStatus) {
            list = list.filter(e => e.status === selectedStatus);
        }

        // Filter by team
        if (selectedTeamId) {
            list = list.filter(e => e.Team?.id === selectedTeamId);
        }

        // Filter by search
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(e =>
                e.fullName.toLowerCase().includes(q) ||
                e.employeeCode.toLowerCase().includes(q) ||
                e.Team?.name.toLowerCase().includes(q) ||
                e.Position?.name.toLowerCase().includes(q) ||
                e.phone?.includes(q)
            );
        }

        return list;
    }, [employees, search, selectedStatus, selectedTeamId]);

    const activeCount = employees.filter(e => e.status === 'ACTIVE').length;
    const onLeaveCount = employees.filter(e => e.status === 'ON_LEAVE').length;
    const terminatedCount = employees.filter(e => e.status === 'TERMINATED' || e.status === 'INACTIVE').length;

    const handleCall = useCallback((phone: string) => {
        Linking.openURL(`tel:${phone}`);
    }, []);

    const handleViewEmployee = useCallback((emp: Employee) => {
        setViewEmployee(emp);
        setViewModalVisible(true);
    }, []);

    const handleEditEmployee = useCallback((emp: Employee) => {
        setFormEmployee(emp);
        setFormModalVisible(true);
    }, []);

    const handleAddEmployee = useCallback(() => {
        setFormEmployee(null);
        setFormModalVisible(true);
    }, []);

    const handleSaveEmployee = useCallback(async (data: CreateEmployeeDto | UpdateEmployeeDto, id?: string) => {
        if (id) {
            await employeeApi.updateEmployee(id, data as UpdateEmployeeDto);
        } else {
            await employeeApi.createEmployee(data as CreateEmployeeDto);
        }
        load();
    }, []);

    const handleDeleteEmployee = useCallback((emp: Employee) => {
        showDialog('Xác nhận xóa', `Bạn có chắc muốn xóa nhân viên "${emp.fullName}"?`, [
            { text: 'Hủy', style: 'cancel' },
            {
                text: 'Xóa', style: 'destructive', onPress: async () => {
                    try {
                        await employeeApi.deleteEmployee(emp.id);
                        showDialog('Thành công', 'Đã xóa nhân viên');
                        load();
                    } catch (e: any) {
                        showDialog('Lỗi', e.response?.data?.message || 'Không thể xóa');
                    }
                }
            },
        ]);
    }, []);

    return (
        <View style={s.root}>
            <StatusBar style="dark" />
            <LinearGradient colors={colors.gradientColors} style={StyleSheet.absoluteFill} />
            <SafeAreaView style={s.safe} edges={['top']}>
                {/* Header */}
                <Animated.View entering={FadeInDown.duration(400)} style={s.header}>
                    <Pressable style={[s.btn, { backgroundColor: colors.inputBg }]} onPress={() => router.back()}>
                        <ChevronLeft size={22} color={colors.textSecondary} />
                    </Pressable>
                    <View style={{ flex: 1 }}>
                        <Text style={[s.title, { color: colors.textPrimary }]}>Nhân viên</Text>
                        <Text style={[s.sub, { color: colors.textMuted }]}>{activeCount} đang làm / {employees.length} tổng</Text>
                    </View>
                    <Pressable style={[s.btn, { backgroundColor: colors.inputBg }]} onPress={() => { setRefreshing(true); load(); }}>
                        <RefreshCw size={16} color={colors.textSecondary} />
                    </Pressable>
                </Animated.View>

                {/* Summary Cards */}
                <Animated.View entering={FadeInDown.duration(400).delay(40)} style={s.summaryRow}>
                    {/* Đang làm */}
                    <View style={[s.summaryCard, { borderColor: 'rgba(16,185,129,0.3)' }]}>
                        <BlurView intensity={20} tint={colors.blurTint} style={StyleSheet.absoluteFill} />
                        <View style={[s.summaryCardInner, { backgroundColor: 'rgba(16,185,129,0.06)' }]}>
                            <LinearGradient colors={['#10B981', '#34D399']} style={s.summaryIcon}>
                                <UserCheck size={14} color="#FFFFFF" />
                            </LinearGradient>
                            <Text style={[s.summaryCount, { color: '#10B981' }]}>{activeCount}</Text>
                            <Text style={[s.summaryLabel, { color: colors.textMuted }]}>Đang làm</Text>
                        </View>
                    </View>

                    {/* Nghỉ phép */}
                    <View style={[s.summaryCard, { borderColor: 'rgba(245,158,11,0.3)' }]}>
                        <BlurView intensity={20} tint={colors.blurTint} style={StyleSheet.absoluteFill} />
                        <View style={[s.summaryCardInner, { backgroundColor: 'rgba(245,158,11,0.06)' }]}>
                            <LinearGradient colors={['#F59E0B', '#FCD34D']} style={s.summaryIcon}>
                                <Briefcase size={14} color="#FFFFFF" />
                            </LinearGradient>
                            <Text style={[s.summaryCount, { color: '#F59E0B' }]}>{onLeaveCount}</Text>
                            <Text style={[s.summaryLabel, { color: colors.textMuted }]}>Nghỉ phép</Text>
                        </View>
                    </View>

                    {/* Nghỉ việc */}
                    <View style={[s.summaryCard, { borderColor: 'rgba(239,68,68,0.3)' }]}>
                        <BlurView intensity={20} tint={colors.blurTint} style={StyleSheet.absoluteFill} />
                        <View style={[s.summaryCardInner, { backgroundColor: 'rgba(239,68,68,0.06)' }]}>
                            <LinearGradient colors={['#EF4444', '#F87171']} style={s.summaryIcon}>
                                <UserX size={14} color="#FFFFFF" />
                            </LinearGradient>
                            <Text style={[s.summaryCount, { color: '#EF4444' }]}>{terminatedCount}</Text>
                            <Text style={[s.summaryLabel, { color: colors.textMuted }]}>Nghỉ việc</Text>
                        </View>
                    </View>
                </Animated.View>

                {/* Search */}
                <Animated.View entering={FadeInDown.duration(400).delay(60)} style={[s.searchWrap, { borderColor: colors.cardBorder }]}>
                    <BlurView intensity={20} tint={colors.blurTint} style={StyleSheet.absoluteFill} />
                    <View style={[s.searchInner, { backgroundColor: colors.cardBg }]}>
                        <Search size={16} color={colors.textMuted} />
                        <TextInput
                            style={[s.searchInput, { color: colors.textPrimary }]}
                            placeholder="Tìm tên, mã, tổ, SĐT..."
                            placeholderTextColor={colors.textMuted}
                            value={search}
                            onChangeText={setSearch}
                        />
                    </View>
                </Animated.View>

                {/* Status Filter Chips */}
                <Animated.View entering={FadeInDown.duration(400).delay(80)}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterScroll} contentContainerStyle={s.filterContent}>
                        {STATUS_FILTERS.map(f => {
                            const isActive = selectedStatus === f.key;
                            return (
                                <Pressable
                                    key={f.key}
                                    onPress={() => setSelectedStatus(f.key)}
                                    style={[
                                        s.filterChip,
                                        isActive
                                            ? { backgroundColor: f.color + '18', borderColor: f.color }
                                            : { backgroundColor: colors.inputBg, borderColor: colors.cardBorder },
                                    ]}
                                >
                                    <Text style={[
                                        s.filterChipText,
                                        { color: isActive ? f.color : colors.textSecondary },
                                    ]}>
                                        {f.label}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </ScrollView>
                </Animated.View>

                {/* Team Filter Chips */}
                {teams.length > 0 && (
                    <Animated.View entering={FadeInDown.duration(400).delay(100)}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterScroll} contentContainerStyle={s.filterContent}>
                            <Pressable
                                onPress={() => setSelectedTeamId('')}
                                style={[
                                    s.filterChip,
                                    selectedTeamId === ''
                                        ? { backgroundColor: '#6366F118', borderColor: '#6366F1' }
                                        : { backgroundColor: colors.inputBg, borderColor: colors.cardBorder },
                                ]}
                            >
                                <Text style={[
                                    s.filterChipText,
                                    { color: selectedTeamId === '' ? '#6366F1' : colors.textSecondary },
                                ]}>
                                    Tất cả tổ
                                </Text>
                            </Pressable>
                            {teams.map(team => {
                                const isActive = selectedTeamId === team.id;
                                return (
                                    <Pressable
                                        key={team.id}
                                        onPress={() => setSelectedTeamId(team.id)}
                                        style={[
                                            s.filterChip,
                                            isActive
                                                ? { backgroundColor: '#6366F118', borderColor: '#6366F1' }
                                                : { backgroundColor: colors.inputBg, borderColor: colors.cardBorder },
                                        ]}
                                    >
                                        <Text style={[
                                            s.filterChipText,
                                            { color: isActive ? '#6366F1' : colors.textSecondary },
                                        ]}>
                                            {team.name}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </ScrollView>
                    </Animated.View>
                )}

                {/* List */}
                <ScrollView contentContainerStyle={s.list} showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#6366F1" />}>
                    {loading ? <Text style={[s.emptyT, { color: colors.textMuted }]}>Đang tải...</Text>
                        : filtered.length === 0 ? (
                            <View style={s.emptyW}><Users size={44} color={colors.textMuted} /><Text style={[s.emptyT, { color: colors.textMuted }]}>Không tìm thấy nhân viên</Text></View>
                        ) : (
                            <View style={s.gap}>
                                {filtered.map((emp, i) => {
                                    const st = STATUS_MAP[emp.status] || { label: emp.status, color: '#94A3B8' };
                                    const initials = avatarInitials(emp.fullName);
                                    const bgColor = avatarColor(emp.id);
                                    return (
                                        <Animated.View key={emp.id} entering={FadeInUp.duration(300).delay(i * 25).springify().damping(18)}>
                                            <Pressable
                                                onPress={() => handleViewEmployee(emp)}
                                                onLongPress={isAdmin ? () => handleEditEmployee(emp) : undefined}
                                                style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1 }]}
                                            >
                                                <View style={[s.card, { borderColor: colors.cardBorder }]}>
                                                    <BlurView intensity={20} tint={colors.blurTint} style={StyleSheet.absoluteFill} />
                                                    <View style={[s.cardInner, { backgroundColor: colors.cardBg }]}>
                                                        <View style={s.cardRow}>
                                                            {/* Avatar */}
                                                            <View style={[s.avatar, { backgroundColor: bgColor + '25', borderColor: bgColor + '55' }]}>
                                                                <Text style={[s.avatarT, { color: bgColor }]}>{initials}</Text>
                                                            </View>
                                                            <View style={s.nw}>
                                                                <Text style={[s.cTitle, { color: colors.textPrimary }]}>{emp.fullName}</Text>
                                                                <Text style={[s.cSub, { color: colors.textMuted }]}>
                                                                    {[emp.Position?.name, emp.Team?.name].filter(Boolean).join(' • ') || '—'}
                                                                </Text>
                                                            </View>
                                                            <StatusBadge label={st.label} color={st.color} />
                                                        </View>

                                                        {/* Contact row with call button */}
                                                        <View style={[s.contactRow, { borderTopColor: colors.cardBorder }]}>
                                                            <View style={s.contactInfo}>
                                                                {emp.phone && <Text style={[s.contactT, { color: colors.textMuted }]}>{emp.phone}</Text>}
                                                                {emp.User?.email && <Text style={[s.contactT, { color: colors.textMuted }]}>{emp.User.email}</Text>}
                                                            </View>
                                                            <View style={s.actionBtns}>
                                                                {emp.phone && (
                                                                    <Pressable
                                                                        style={[s.callBtn]}
                                                                        onPress={(e) => { e.stopPropagation; handleCall(emp.phone!); }}
                                                                        hitSlop={8}
                                                                    >
                                                                        <PhoneCall size={16} color="#10B981" />
                                                                    </Pressable>
                                                                )}
                                                                {isAdmin && (
                                                                    <Pressable
                                                                        style={s.deleteBtn}
                                                                        onPress={() => handleDeleteEmployee(emp)}
                                                                        hitSlop={8}
                                                                    >
                                                                        <Trash2 size={14} color="#EF4444" />
                                                                    </Pressable>
                                                                )}
                                                            </View>
                                                        </View>
                                                    </View>
                                                </View>
                                            </Pressable>
                                        </Animated.View>
                                    );
                                })}
                            </View>
                        )}
                    <View style={{ height: 100 }} />
                </ScrollView>

                {/* FAB — Admin only */}
                {isAdmin && (
                    <Pressable style={s.fab} onPress={handleAddEmployee}>
                        <LinearGradient colors={['#6366F1', '#818CF8']} style={s.fabGradient}>
                            <Plus size={26} color="#FFFFFF" />
                        </LinearGradient>
                    </Pressable>
                )}
            </SafeAreaView>

            {/* Modals */}
            <EmployeeViewModal
                visible={viewModalVisible}
                employee={viewEmployee}
                onClose={() => setViewModalVisible(false)}
                onEdit={viewEmployee ? () => handleEditEmployee(viewEmployee) : undefined}
                isAdmin={isAdmin}
            />
            <EmployeeFormModal
                visible={formModalVisible}
                employee={formEmployee}
                onClose={() => setFormModalVisible(false)}
                onSave={handleSaveEmployee}
            />
            {DialogComponent}
        </View>
    );
}

const s = StyleSheet.create({
    root: { flex: 1 }, safe: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
    btn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    title: { fontSize: FontSizes.xl, fontWeight: FontWeights.bold },
    sub: { fontSize: FontSizes.xs, marginTop: 2 },
    searchWrap: { marginHorizontal: Spacing.xl, marginBottom: Spacing.sm, borderRadius: 14, overflow: 'hidden', borderWidth: 1 },
    searchInner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: 10 },
    searchInput: { flex: 1, fontSize: FontSizes.sm },
    list: { paddingHorizontal: Spacing.xl },
    emptyW: { alignItems: 'center', paddingVertical: 60, gap: Spacing.md },
    emptyT: { fontSize: FontSizes.base, textAlign: 'center', marginTop: 60 },
    gap: { gap: Spacing.md },
    card: { borderRadius: 18, overflow: 'hidden', borderWidth: 1 },
    cardInner: { padding: Spacing.md },
    cardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, marginBottom: Spacing.sm },
    avatar: { width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5 },
    avatarT: { fontSize: FontSizes.sm, fontWeight: FontWeights.bold },
    nw: { flex: 1 },
    cTitle: { fontSize: FontSizes.base, fontWeight: FontWeights.semibold },
    cSub: { fontSize: FontSizes.xs, marginTop: 2 },

    contactRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: Spacing.sm, borderTopWidth: 1, marginTop: Spacing.xs },
    contactInfo: { flex: 1, gap: 2 },
    contactT: { fontSize: FontSizes.xs },
    actionBtns: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    callBtn: {
        width: 34, height: 34, borderRadius: 17,
        backgroundColor: 'rgba(16,185,129,0.12)',
        justifyContent: 'center', alignItems: 'center',
    },
    deleteBtn: {
        width: 30, height: 30, borderRadius: 15,
        backgroundColor: 'rgba(239,68,68,0.1)',
        justifyContent: 'center', alignItems: 'center',
    },

    // FAB
    fab: { position: 'absolute', bottom: 28, right: 24 },
    fabGradient: {
        width: 56, height: 56, borderRadius: 28,
        justifyContent: 'center', alignItems: 'center',
        shadowColor: '#6366F1', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35, shadowRadius: 12, elevation: 8,
    },

    // Summary cards
    summaryRow: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.xl, marginBottom: Spacing.sm },
    summaryCard: { flex: 1, borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1 },
    summaryCardInner: { padding: Spacing.sm, alignItems: 'center', gap: 4 },
    summaryIcon: { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginBottom: 2 },
    summaryCount: { fontSize: FontSizes.xl, fontWeight: FontWeights.bold, lineHeight: 26 },
    summaryLabel: { fontSize: 10, fontWeight: FontWeights.medium, textAlign: 'center' },

    // Filter chips
    filterScroll: { marginBottom: Spacing.xs },
    filterContent: { paddingHorizontal: Spacing.xl, gap: Spacing.sm, flexDirection: 'row' },
    filterChip: {
        paddingHorizontal: Spacing.md, paddingVertical: 6,
        borderRadius: BorderRadius.full, borderWidth: 1,
    },
    filterChipText: { fontSize: FontSizes.xs, fontWeight: FontWeights.medium },
});
