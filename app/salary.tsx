// Salary Screen — Clean Glassmorphism
import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, RefreshControl } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import { DollarSign, ChevronLeft, RefreshCw, Calculator, Wallet } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';

import { useAuthStore, useThemeStore } from '@/store';
import { salaryApi, Salary } from '@/lib/salary-api';
import { Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants/Tokens';
import { StatusBadge } from '@/components/ui/GlassDataScreen';
import { ThemeColors } from '@/constants/ThemeColors';
import { useDarkDialog } from '@/components/ui/DarkDialog';

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

const fmt = (n: number) => n.toLocaleString('vi-VN') + ' \u20AB';
const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('vi-VN') : '';

export default function SalaryScreen() {
    const router = useRouter();
    const { user } = useAuthStore();
    const [salaries, setSalaries] = useState<Salary[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState<'all' | 'PENDING' | 'APPROVED' | 'PAID'>('all');
    const { isDark } = useThemeStore();
    const colors = ThemeColors.light;
    const { showDialog, DialogComponent } = useDarkDialog();
    const isAdmin = user?.role === 'ADMIN';
    const isManager = isAdmin || user?.role === 'MANAGER';

    useEffect(() => { load(); }, [filter]);

    const load = async () => {
        try {
            setLoading(true);
            const now = new Date();
            const data = await salaryApi.getSalaries({
                month: now.getMonth() + 1, year: now.getFullYear(),
                ...(filter !== 'all' ? { status: filter } : {}),
            });
            const arr = Array.isArray(data) ? data : [];
            setSalaries(isManager ? arr : arr.filter(s => s.employeeId === user?.id));
        } catch (e: any) {
            showDialog('Lỗi', e.response?.data?.message || 'Không thể tải dữ liệu lương');
        } finally { setLoading(false); setRefreshing(false); }
    };

    const handleCalculate = () => {
        if (!isAdmin) return;
        showDialog('Xác nhận', 'Tính lương khoán từ sản lượng tháng này?', [
            { text: 'Hủy', style: 'cancel' },
            {
                text: 'Tính lương', onPress: async () => {
                    try {
                        const now = new Date();
                        await salaryApi.calculateSalaries({ month: now.getMonth() + 1, year: now.getFullYear() });
                        showDialog('Thành công', 'Đã tính lương khoán từ sản lượng');
                        load();
                    } catch (e: any) { showDialog('Lỗi', e.response?.data?.message || 'Không thể tính lương'); }
                }
            },
        ]);
    };

    const totalAll = useMemo(() => (salaries ?? []).reduce((s, sal) => s + sal.totalSalary, 0), [salaries]);

    return (
        <View style={s.root}>
            <StatusBar style="dark" />
            <LinearGradient colors={colors.gradientColors} style={StyleSheet.absoluteFill} />
            <SafeAreaView style={s.safe} edges={['top']}>

                {/* Header */}
                <Animated.View entering={FadeInDown.duration(400)} style={s.header}>
                    <Pressable style={[s.backBtn, { backgroundColor: colors.inputBg }]} onPress={() => router.back()}>
                        <ChevronLeft size={22} color={colors.textSecondary} />
                    </Pressable>
                    <View style={{ flex: 1 }}>
                        <Text style={[s.title, { color: colors.textPrimary }]}>Bảng lương</Text>
                        <Text style={[s.subtitle, { color: colors.textMuted }]}>
                            Tháng {new Date().getMonth() + 1}/{new Date().getFullYear()} • {salaries.length} phiếu
                        </Text>
                    </View>
                    <Pressable style={[s.backBtn, { backgroundColor: colors.inputBg }]} onPress={() => { setRefreshing(true); load(); }}>
                        <RefreshCw size={16} color={colors.textSecondary} />
                    </Pressable>
                </Animated.View>

                {/* Summary banner */}
                <Animated.View entering={FadeInDown.duration(400).delay(50)} style={s.bannerWrap}>
                    <LinearGradient colors={isDark ? ['#1a1a3e', '#0f0f2a'] : ['#EEF2FF', '#E0E7FF']} style={s.banner}>
                        <View style={s.bannerLeft}>
                            <View style={[s.bannerIcon, { backgroundColor: isDark ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.12)' }]}>
                                <Wallet size={20} color="#818CF8" />
                            </View>
                            <View>
                                <Text style={[s.bannerLabel, { color: colors.textMuted }]}>Tổng lương tháng</Text>
                                <Text style={[s.bannerValue, { color: colors.textPrimary }]}>{fmt(totalAll)}</Text>
                            </View>
                        </View>
                        {isAdmin && (
                            <Pressable style={s.calcBtn} onPress={handleCalculate}>
                                <Calculator size={14} color="#FFFFFF" />
                                <Text style={s.calcText}>Tính lương</Text>
                            </Pressable>
                        )}
                    </LinearGradient>
                </Animated.View>

                {/* Filters */}
                <View style={s.filterWrap}>
                    {FILTERS.map(f => {
                        const active = filter === f.key;
                        return (
                            <Pressable key={f.key} onPress={() => setFilter(f.key as any)}
                                style={[s.chip, { backgroundColor: active ? '#6366F1' : colors.inputBg, borderColor: active ? '#6366F1' : colors.cardBorder }]}>
                                <Text style={[s.chipText, { color: active ? '#FFFFFF' : colors.textMuted }]}>{f.label}</Text>
                            </Pressable>
                        );
                    })}
                </View>

                {/* Salary List */}
                <ScrollView contentContainerStyle={s.list} showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#818CF8" />}>

                    {loading ? (
                        <Text style={[s.emptyText, { color: colors.textMuted }]}>Đang tải...</Text>
                    ) : salaries.length === 0 ? (
                        <View style={s.emptyWrap}>
                            <DollarSign size={44} color={colors.textMuted} />
                            <Text style={[s.emptyText, { color: colors.textMuted }]}>Không có dữ liệu lương</Text>
                        </View>
                    ) : (
                        <View style={s.gap}>
                            {salaries.map((sal, i) => {
                                const st = STATUS_MAP[sal.status] || { label: sal.status, color: '#94A3B8' };
                                return (
                                    <Animated.View key={sal.id} entering={FadeInUp.duration(280).delay(i * 30).springify().damping(18)}>
                                        <View style={[s.card, { borderColor: colors.cardBorder }]}>
                                            <BlurView intensity={20} tint={colors.blurTint} style={StyleSheet.absoluteFill} />
                                            <View style={[s.cardBody, { backgroundColor: colors.cardBg }]}>

                                                {/* Name + Status */}
                                                <View style={s.cardTop}>
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={[s.empName, { color: colors.textPrimary }]}>
                                                            {sal.Employee?.fullName || sal.employeeId}
                                                        </Text>
                                                        <Text style={[s.empSub, { color: colors.textMuted }]}>
                                                            {[sal.Employee?.employeeCode, sal.Employee?.Position?.name, sal.Employee?.Team?.name]
                                                                .filter(Boolean).join(' • ') || '—'}
                                                        </Text>
                                                    </View>
                                                    <StatusBadge label={st.label} color={st.color} />
                                                </View>

                                                {/* Salary Grid */}
                                                <View style={[s.grid, { borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
                                                    <SalaryRow label="Cơ bản" value={fmt(sal.baseSalary)} color={colors.textPrimary} muted={colors.textMuted} />
                                                    {sal.outputSalary > 0 && <SalaryRow label="Khoán" value={fmt(sal.outputSalary)} color="#818CF8" muted={colors.textMuted} />}
                                                    {sal.bonus > 0 && <SalaryRow label="Thưởng" value={`+${fmt(sal.bonus)}`} color="#10B981" muted={colors.textMuted} />}
                                                    {sal.deduction > 0 && <SalaryRow label="Trừ" value={`-${fmt(sal.deduction)}`} color="#EF4444" muted={colors.textMuted} />}
                                                </View>

                                                {/* Total */}
                                                <View style={[s.totalRow, { borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
                                                    <View>
                                                        <Text style={[s.totalLabel, { color: colors.textMuted }]}>Tổng nhận</Text>
                                                        {sal.paidDate && <Text style={[s.paidDate, { color: colors.textMuted }]}>OK {fmtDate(sal.paidDate)}</Text>}
                                                    </View>
                                                    <Text style={s.totalValue}>{fmt(sal.totalSalary)}</Text>
                                                </View>

                                                {sal.note && <Text style={[s.note, { color: colors.textMuted }]} numberOfLines={1}>{sal.note}</Text>}
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

function SalaryRow({ label, value, color, muted }: { label: string; value: string; color: string; muted: string }) {
    return (
        <View style={s.salaryRow}>
            <Text style={[s.salaryLabel, { color: muted }]}>{label}</Text>
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
    },
    backBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    title: { fontSize: FontSizes.xl, fontWeight: FontWeights.bold },
    subtitle: { fontSize: FontSizes.xs, marginTop: 2 },

    // Banner
    bannerWrap: { paddingHorizontal: Spacing.xl, marginBottom: Spacing.md },
    banner: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        padding: Spacing.lg, borderRadius: 18,
    },
    bannerLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
    bannerIcon: { width: 42, height: 42, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    bannerLabel: { fontSize: FontSizes.xs },
    bannerValue: { fontSize: FontSizes.lg, fontWeight: FontWeights.bold, marginTop: 2 },
    calcBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, backgroundColor: '#6366F1',
    },
    calcText: { fontSize: 11, fontWeight: FontWeights.semibold, color: '#FFFFFF' },

    // Filters
    filterWrap: { flexDirection: 'row', paddingHorizontal: Spacing.xl, gap: Spacing.sm, marginBottom: Spacing.md },
    chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
    chipText: { fontSize: FontSizes.xs, fontWeight: FontWeights.medium },

    // List
    list: { paddingHorizontal: Spacing.xl },
    emptyWrap: { alignItems: 'center', paddingVertical: 60, gap: Spacing.md },
    emptyText: { fontSize: FontSizes.base, textAlign: 'center', marginTop: 50 },
    gap: { gap: Spacing.md },

    // Card
    card: { borderRadius: 18, overflow: 'hidden', borderWidth: 1 },
    cardBody: { padding: Spacing.lg },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.sm },
    empName: { fontSize: FontSizes.base, fontWeight: FontWeights.semibold },
    empSub: { fontSize: FontSizes.xs, marginTop: 3 },

    // Grid
    grid: { paddingTop: Spacing.sm, borderTopWidth: 1, gap: 8 },
    salaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    salaryLabel: { fontSize: FontSizes.sm },
    salaryValue: { fontSize: FontSizes.sm, fontWeight: FontWeights.semibold },

    // Total
    totalRow: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingTop: Spacing.sm, borderTopWidth: 1, marginTop: Spacing.sm,
    },
    totalLabel: { fontSize: FontSizes.xs, fontWeight: FontWeights.bold },
    totalValue: { fontSize: 20, fontWeight: '700' as any, color: '#10B981' },
    paidDate: { fontSize: 9, marginTop: 1 },

    note: { fontSize: FontSizes.xs, marginTop: Spacing.sm, fontStyle: 'italic' },
});
