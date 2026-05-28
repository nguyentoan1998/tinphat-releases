// Salary Screen — Clean Glassmorphism
import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, FadeInDown, FadeInRight, FadeInLeft, withSpring, withTiming } from 'react-native-reanimated';
import { DollarSign, ChevronLeft, RefreshCw, Calculator, Wallet, CalendarDays, ChevronRight, Users } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';

import { useAuthStore, useThemeStore } from '@/store';
import { salaryApi, Salary } from '@/lib/salary-api';
import { attendanceApi } from '@/lib/attendance-api';
import { teamApi, Team } from '@/lib/team-api';
import { Spacing, FontSizes, FontWeights, BorderRadius, Shadows } from '@/constants/Tokens';
import { StatusBadge } from '@/components/ui/GlassDataScreen';
import { ThemeColors } from '@/constants/ThemeColors';
import { useDarkDialog } from '@/components/ui/DarkDialog';
import { calculateCong } from '@/utils/attendance';

const STATUS_MAP: Record<string, { label: string; color: string }> = {
    PENDING: { label: 'Chờ duyệt', color: '#F59E0B' },
    APPROVED: { label: 'Đã duyệt', color: '#3B82F6' },
    PAID: { label: 'Đã trả', color: '#10B981' },
};

const FILTERS = [
    { key: 'all', label: 'Tất cả' },
    { key: 'PENDING', label: 'Chờ duyệt' },
    { key: 'APPROVED', label: 'Đã duyệt' },
    { key: 'PAID', label: 'Đã trả' },
];

const GRADIENT_COLORS = ['#F0F8FF', '#F9F9F9', '#FFFFFF'] as const;

const fmt = (n: number) => (n ?? 0).toLocaleString('vi-VN') + ' \u20AB';
const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('vi-VN') : '';

// ─── Month Picker ──────────────────────────────────────────────

function MonthPicker({ month, year, onChange }: {
    month: number; year: number;
    onChange: (m: number, y: number) => void;
}) {
    const colors = ThemeColors.light;
    const now = new Date();
    const isMax = year === now.getFullYear() && month === now.getMonth() + 1;
    const prev = () => month === 1 ? onChange(12, year - 1) : onChange(month - 1, year);
    const next = () => { if (!isMax) month === 12 ? onChange(1, year + 1) : onChange(month + 1, year); };
    return (
        <View style={s.monthPicker}>
            <Pressable onPress={prev} hitSlop={8} style={s.monthBtn}>
                <ChevronLeft size={16} color="#59677B" />
            </Pressable>
            <Text style={s.monthLabel}>T{month}/{year}</Text>
            <Pressable onPress={next} hitSlop={8} style={s.monthBtn} disabled={isMax}>
                <ChevronRight size={16} color={isMax ? '#D1D5DB' : '#59677B'} />
            </Pressable>
        </View>
    );
}

export default function SalaryScreen() {
    const router = useRouter();
    const { user } = useAuthStore();
    const now = new Date();
    const [viewMode, setViewMode] = useState<'PERSONAL' | 'TEAM'>(user?.role === 'ADMIN' ? 'TEAM' : 'PERSONAL');
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [year, setYear] = useState(now.getFullYear());
    const [salaries, setSalaries] = useState<Salary[]>([]);
    const [attendanceData, setAttendanceData] = useState<Record<string, number>>({});
    const [teams, setTeams] = useState<Team[]>([]);
    const [selectedTeam, setSelectedTeam] = useState('');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState<'all' | 'PENDING' | 'APPROVED' | 'PAID'>('all');
    const { isDark } = useThemeStore();
    const colors = ThemeColors.light;
    const { showDialog, DialogComponent } = useDarkDialog();
    const isAdmin = user?.role === 'ADMIN';
    const isManager = isAdmin || user?.role === 'MANAGER';

    useEffect(() => {
        teamApi.getTeams().then(t => setTeams(Array.isArray(t) ? t : [])).catch(() => {});
    }, []);

    useEffect(() => { load(); }, [filter, month, year, viewMode]);

    const load = async () => {
        try {
            setLoading(true);
            
            // Fetch salaries
            const data = await salaryApi.getSalaries({
                month, year,
                ...(filter !== 'all' ? { status: filter } : {}),
                ...(!isManager || viewMode === 'PERSONAL' ? { employeeId: user?.id } : {}),
            });
            const arr = Array.isArray(data) ? data : [];
            setSalaries(arr);

            // Fetch attendance if needed (if salary object doesn't have workHours)
            const needsAttendance = arr.some(s => s.workHours === undefined);
            if (needsAttendance) {
                const firstDay = new Date(year, month - 1, 1).toISOString().split('T')[0];
                const lastDay = new Date(year, month, 0).toISOString().split('T')[0];

                // For simple implementation, fetch all attendance for the month
                const attRes = await attendanceApi.getAttendance({
                    fromDate: firstDay,
                    toDate: lastDay,
                    limit: 1000, // Large limit to get all
                    ...(!isManager || viewMode === 'PERSONAL' ? { employeeId: user?.id } : {}),
                });

                // Aggregate workHours by employeeId
                const agg: Record<string, number> = {};
                attRes.data.forEach(rec => {
                    agg[rec.employeeId] = (agg[rec.employeeId] || 0) + (rec.workHours || 0);
                });
                setAttendanceData(agg);
            }

        } catch (e: any) {
            showDialog('Lỗi', e.response?.data?.message || 'Không thể tải dữ liệu lương');
        } finally { setLoading(false); setRefreshing(false); }
    };

    const handleCalculate = () => {
        if (!isAdmin) return;
        showDialog('Xác nhận', `Tính lương khoán từ sản lượng tháng ${month}/${year}?`, [
            { text: 'Hủy', style: 'cancel' },
            {
                text: 'Tính lương', onPress: async () => {
                    try {
                        await salaryApi.calculateSalaries({ month, year });
                        showDialog('Thành công', 'Đã tính lương khoán từ sản lượng');
                        load();
                    } catch (e: any) { showDialog('Lỗi', e.response?.data?.message || 'Không thể tính lương'); }
                }
            },
        ]);
    };

    const filteredSalaries = useMemo(() => {
        if (!selectedTeam) return salaries;
        return salaries.filter(s => s.Employee?.Team?.id === selectedTeam);
    }, [salaries, selectedTeam]);

    const totalAll = useMemo(() => (filteredSalaries ?? []).reduce((s, sal) => s + sal.totalSalary, 0), [filteredSalaries]);

    return (
        <View style={s.root}>
            <StatusBar style="dark" />
            <LinearGradient colors={GRADIENT_COLORS} style={StyleSheet.absoluteFill} />
            <SafeAreaView style={s.safe} edges={['top']}>

                {/* Header */}
                <Animated.View entering={FadeInDown.duration(400).springify().damping(20)} style={s.header}>
                    <Pressable style={s.headerBtn} onPress={() => router.back()}>
                        <ChevronLeft size={22} color="#212529" />
                    </Pressable>
                    <View style={{ flex: 1 }}>
                        <Text style={s.title}>Bảng lương</Text>
                        <MonthPicker month={month} year={year} onChange={(m, y) => { setMonth(m); setYear(y); }} />
                    </View>
                    <Pressable style={s.headerBtn} onPress={() => { setRefreshing(true); load(); }}>
                        <RefreshCw size={16} color="#212529" />
                    </Pressable>
                </Animated.View>

                {/* Summary banner (Total Payroll for Admins/Managers) */}
                {isManager && (
                    <Animated.View entering={FadeInDown.duration(400).delay(50)} style={s.bannerWrap}>
                        <View style={s.glassCard}>
                            <View style={s.banner}>
                                <View style={s.bannerLeft}>
                                    <View style={s.bannerIcon}>
                                        <Wallet size={20} color="#FFFFFF" />
                                    </View>
                                    <View>
                                        <Text style={s.bannerLabel}>Tổng chi trả {viewMode === 'PERSONAL' ? 'cá nhân' : 'toàn đội'}</Text>
                                        <Text style={s.bannerValue}>{fmt(totalAll)}</Text>
                                    </View>
                                </View>
                                {isAdmin && (
                                    <Pressable style={s.calcBtn} onPress={handleCalculate}>
                                        <Calculator size={14} color="#0284C7" />
                                        <Text style={s.calcText}>Tính lương</Text>
                                    </Pressable>
                                )}
                            </View>
                        </View>
                    </Animated.View>
                )}

                {/* Mode Toggle & Status Filters */}
                <Animated.View entering={FadeInDown.duration(350).delay(80).springify().damping(22)} style={s.filterWrap}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.sm }}>
                        {isAdmin && (
                            <View style={s.viewModeToggle}>
                                <Pressable 
                                    style={[s.toggleBtn, viewMode === 'PERSONAL' && s.toggleBtnActive]} 
                                    onPress={() => setViewMode('PERSONAL')}
                                >
                                    <Text style={[s.toggleText, viewMode === 'PERSONAL' && s.toggleTextActive]}>Cá nhân</Text>
                                </Pressable>
                                <Pressable 
                                    style={[s.toggleBtn, viewMode === 'TEAM' && s.toggleBtnActive]} 
                                    onPress={() => setViewMode('TEAM')}
                                >
                                    <Text style={[s.toggleText, viewMode === 'TEAM' && s.toggleTextActive]}>Đội nhóm</Text>
                                </Pressable>
                            </View>
                        )}
                        {FILTERS.map(f => {
                            const active = filter === f.key;
                            return (
                                <Pressable key={f.key} onPress={() => setFilter(f.key as any)} style={s.chipWrap}>
                                    <View style={[s.chip, active && s.chipActive]}>
                                        <Text style={[s.chipText, active && s.chipTextActive]}>{f.label}</Text>
                                    </View>
                                </Pressable>
                            );
                        })}
                    </ScrollView>
                </Animated.View>

                {/* Team Filters */}
                {isManager && viewMode === 'TEAM' && teams.length > 0 && (
                    <Animated.View entering={FadeInDown.duration(350).delay(120).springify().damping(22)} style={s.teamFilterWrap}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
                            <Pressable style={[s.teamChip, !selectedTeam && s.teamChipOn]} onPress={() => setSelectedTeam('')}>
                                <Users size={11} color={!selectedTeam ? '#FFFFFF' : '#59677B'} />
                                <Text style={[s.teamChipT, !selectedTeam && s.teamChipTOn]}>Tất cả</Text>
                            </Pressable>
                            {teams.map(t => (
                                <Pressable key={t.id} style={[s.teamChip, selectedTeam === t.id && s.teamChipOn]}
                                    onPress={() => setSelectedTeam(selectedTeam === t.id ? '' : t.id)}>
                                    <Text style={[s.teamChipT, selectedTeam === t.id && s.teamChipTOn]}>{t.code} · {t.name}</Text>
                                </Pressable>
                            ))}
                        </ScrollView>
                    </Animated.View>
                )}

                {/* Salary List */}
                <ScrollView contentContainerStyle={s.list} showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#0156A7" />}>

                    {loading ? (
                        <ActivityIndicator color="#0156A7" style={{ marginTop: 40 }} />
                    ) : filteredSalaries.length === 0 ? (
                        <View style={s.emptyWrap}>
                            <DollarSign size={44} color="#9CA3AF" />
                            <Text style={s.emptyText}>Không có dữ liệu lương</Text>
                        </View>
                    ) : (
                        <View style={s.gap}>
                            {filteredSalaries.map((sal, i) => {
                                const st = STATUS_MAP[sal.status] || { label: sal.status, color: '#94A3B8' };
                                const workHours = sal.workHours ?? attendanceData[sal.employeeId] ?? 0;
                                const cong = calculateCong(workHours);
                                
                                return (
                                    <Animated.View key={sal.id} entering={FadeInUp.duration(400).delay(i * 50).springify().damping(18)}>
                                        <View style={s.salaryCard}>
                                            <View style={s.cardBody}>

                                                {/* Name + Status */}
                                                <View style={s.cardTop}>
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={s.empName}>
                                                            {sal.Employee?.fullName || sal.employeeId}
                                                        </Text>
                                                        <Text style={s.empSub}>
                                                            {[sal.Employee?.employeeCode, sal.Employee?.Position?.name, sal.Employee?.Team?.name]
                                                                .filter(Boolean).join(' • ') || '—'}
                                                        </Text>
                                                    </View>
                                                    <StatusBadge label={st.label} color={st.color} />
                                                </View>

                                                {/* Cong Info - Highlighted */}
                                                <View style={s.congBadgeRow}>
                                                    <View style={s.congBadge}>
                                                        <CalendarDays size={14} color="#0156A7" />
                                                        <Text style={s.congValueText}>{cong.toFixed(1)} công</Text>
                                                    </View>
                                                    <View style={{ flex: 1 }} />
                                                </View>

                                                {/* Salary Grid */}
                                                <View style={s.grid}>
                                                    <View style={s.row}>
                                                        <Animated.View entering={FadeInRight.delay(i * 50 + 100)} style={s.gridItem}>
                                                            <SalaryRow label="Lương cơ bản" value={fmt(sal.baseSalary)} color="#212529" />
                                                        </Animated.View>
                                                        <Animated.View entering={FadeInRight.delay(i * 50 + 150)} style={s.gridItem}>
                                                            <SalaryRow label="Lương sản lượng" value={fmt(sal.outputSalary)} color="#0156A7" />
                                                        </Animated.View>
                                                    </View>
                                                    <View style={s.row}>
                                                        <Animated.View entering={FadeInRight.delay(i * 50 + 200)} style={s.gridItem}>
                                                            <SalaryRow label="Thưởng" value={`+${fmt(sal.bonus)}`} color="#4ADE80" />
                                                        </Animated.View>
                                                        <Animated.View entering={FadeInRight.delay(i * 50 + 250)} style={s.gridItem}>
                                                            <SalaryRow label="Khấu trừ" value={`-${fmt(sal.deduction)}`} color="#F87171" />
                                                        </Animated.View>
                                                    </View>
                                                </View>

                                                {/* Total */}
                                                <View style={s.totalRow}>
                                                    <View>
                                                        <Text style={s.totalLabel}>THỰC NHẬN</Text>
                                                        {sal.paidDate && <Text style={s.paidDate}>Đã trả: {fmtDate(sal.paidDate)}</Text>}
                                                    </View>
                                                    <Text style={[s.totalValue, { color: '#0156A7' }]}>{fmt(sal.totalSalary)}</Text>
                                                </View>

                                                {sal.note && <Text style={s.note} numberOfLines={2}>{sal.note}</Text>}
                                            </View>
                                        </View>
                                    </Animated.View>
                                );
                            })}
                        </View>
                    )}
                    <View style={{ height: 80 }} />
                </ScrollView>
            </SafeAreaView>
            {DialogComponent}
        </View>
    );
}

function SalaryRow({ label, value, color }: { label: string; value: string; color: string }) {
    return (
        <View style={s.salaryRow}>
            <Text style={s.salaryLabel}>{label}</Text>
            <Text style={[s.salaryValue, { color }]}>{value}</Text>
        </View>
    );
}

const s = StyleSheet.create({
    root: { flex: 1 },
    safe: { flex: 1 },

    // Header
    header: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
        paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, paddingBottom: Spacing.sm,
        borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    headerBtn: { 
        width: 38, height: 38, borderRadius: 19, 
        justifyContent: 'center', alignItems: 'center',
        backgroundColor: '#FFFFFF',
        ...Shadows.small,
    },
    title: { fontSize: FontSizes.xl, fontWeight: FontWeights.bold, color: '#212529' },
    subtitle: { fontSize: FontSizes.xs, marginTop: 2, color: '#59677B' },

    // Month Picker
    monthPicker: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        marginTop: 4, alignSelf: 'flex-start',
        borderRadius: 12, overflow: 'hidden',
        paddingHorizontal: 4, paddingVertical: 2,
        backgroundColor: '#FFFFFF',
        borderWidth: 1, borderColor: '#E5E7EB',
        ...Shadows.small,
    },
    monthBtn: { width: 28, height: 28, justifyContent: 'center', alignItems: 'center' },
    monthLabel: { fontSize: 13, fontWeight: FontWeights.semibold, color: '#212529', minWidth: 60, textAlign: 'center' },

    // Banner
    bannerWrap: { paddingHorizontal: Spacing.xl, marginBottom: Spacing.md },
    glassCard: { borderRadius: 18, overflow: 'hidden', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', ...Shadows.medium },
    banner: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        padding: Spacing.lg,
    },
    bannerLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
    bannerIcon: { 
        width: 42, height: 42, borderRadius: 14, 
        justifyContent: 'center', alignItems: 'center',
        backgroundColor: '#0156A7',
    },
    bannerLabel: { fontSize: FontSizes.xs, color: '#59677B' },
    bannerValue: { fontSize: 20, fontWeight: FontWeights.bold, marginTop: 2, color: '#212529' },
    calcBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, backgroundColor: '#FFFFFF',
    },
    calcText: { fontSize: 11, fontWeight: FontWeights.semibold, color: '#0284C7' },

    // Filters
    filterWrap: { flexDirection: 'row', paddingHorizontal: Spacing.xl, gap: Spacing.sm, marginBottom: Spacing.md },
    chipWrap: { borderRadius: 20, overflow: 'hidden', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', ...Shadows.small },
    chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
    chipActive: { backgroundColor: '#0156A7' },
    chipText: { fontSize: FontSizes.xs, fontWeight: FontWeights.medium, color: '#59677B' },
    chipTextActive: { color: '#FFFFFF' },

    // View Mode Toggle
    viewModeToggle: { 
        flexDirection: 'row', borderRadius: 20, overflow: 'hidden', 
        backgroundColor: '#FFFFFF', padding: 3, borderWidth: 1, borderColor: '#E5E7EB',
        ...Shadows.small,
    },
    toggleBtn: { paddingHorizontal: 16, paddingVertical: 5, borderRadius: 18 },
    toggleBtnActive: { backgroundColor: '#0156A7' },
    toggleText: { fontSize: 11, fontWeight: FontWeights.medium, color: '#59677B' },
    toggleTextActive: { color: '#FFFFFF', fontWeight: FontWeights.bold },

    // Team Filters
    teamFilterWrap: { paddingHorizontal: Spacing.xl, marginBottom: Spacing.md },
    chips: { flexDirection: 'row', gap: Spacing.sm },
    teamChip: { 
        flexDirection: 'row', alignItems: 'center', gap: 6, 
        paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14,
        overflow: 'hidden', backgroundColor: '#FFFFFF',
        borderWidth: 1, borderColor: '#E5E7EB',
        ...Shadows.small,
    },
    teamChipOn: { backgroundColor: '#0156A7', borderColor: '#0156A7' },
    teamChipT: { fontSize: 11, fontWeight: FontWeights.medium, color: '#59677B' },
    teamChipTOn: { color: '#FFFFFF', fontWeight: FontWeights.bold },

    // List
    list: { paddingHorizontal: Spacing.xl },
    emptyWrap: { alignItems: 'center', paddingVertical: 60, gap: Spacing.md },
    emptyText: { fontSize: FontSizes.base, textAlign: 'center', color: '#9CA3AF' },
    gap: { gap: Spacing.md },

    // Card
    salaryCard: { borderRadius: 20, overflow: 'hidden', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', ...Shadows.medium },
    cardBody: { padding: Spacing.lg },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
    empName: { fontSize: FontSizes.lg, fontWeight: FontWeights.bold, color: '#212529' },
    empSub: { fontSize: FontSizes.xs, color: '#59677B', marginTop: 2 },

    congBadgeRow: { flexDirection: 'row', marginBottom: Spacing.md, marginTop: 4 },
    congBadge: { 
        flexDirection: 'row', alignItems: 'center', gap: 6, 
        paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12,
        overflow: 'hidden', backgroundColor: '#F0F8FF',
        borderWidth: 1, borderColor: 'rgba(1,86,167,0.2)',
    },
    congValueText: { fontSize: FontSizes.sm, color: '#0156A7', fontWeight: FontWeights.bold },

    // Grid
    grid: { gap: 10, paddingVertical: Spacing.md, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
    row: { flexDirection: 'row', gap: 10 },
    gridItem: { flex: 1, backgroundColor: '#F9FAFB', padding: 10, borderRadius: 12, minHeight: 52 },
    salaryRow: { gap: 2 },
    salaryLabel: { fontSize: 9, color: '#9CA3AF', textTransform: 'uppercase', fontWeight: FontWeights.bold },
    salaryValue: { fontSize: 13, fontWeight: FontWeights.bold },

    // Total
    totalRow: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: '#E5E7EB', marginTop: 4,
    },
    totalLabel: { fontSize: 11, fontWeight: FontWeights.bold, color: '#59677B', letterSpacing: 1.2 },
    totalValue: { fontSize: 24, fontWeight: '800' as any },
    paidDate: { fontSize: 10, color: '#4ADE80', marginTop: 2, fontWeight: FontWeights.bold },

    note: { fontSize: FontSizes.xs, marginTop: Spacing.md, color: '#9CA3AF', fontStyle: 'italic' },
});

