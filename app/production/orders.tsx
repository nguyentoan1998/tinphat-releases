// Production Orders Screen — Glassmorphism (Lệnh sản xuất)
import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, RefreshControl } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import { ClipboardList, ChevronLeft, RefreshCw } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';

import { productionOrderApi, ProductionOrder } from '@/lib/production-order-api';
import { Timings } from '@/constants/GlassTokens';
import { Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants/Tokens';
import GlassDataScreen, { GlassListCard, StatusBadge } from '@/components/ui/GlassDataScreen';
import { useThemeStore } from '@/store';
import { ThemeColors } from '@/constants/ThemeColors';
import { useDarkDialog } from '@/components/ui/DarkDialog';

const STATUS_MAP: Record<string, { label: string; color: string }> = {
    PLANNED: { label: 'Kế hoạch', color: '#F59E0B' },
    IN_PROGRESS: { label: 'Đang SX', color: '#6366F1' },
    COMPLETED: { label: 'Hoàn thành', color: '#10B981' },
    CANCELLED: { label: 'Đã hủy', color: '#EF4444' },
};

const fmtDate = (d?: string) =>
    d ? new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

export default function ProductionOrdersScreen() {
    const router = useRouter();
    const [orders, setOrders] = useState<ProductionOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState<'all' | 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED'>('all');
    const { isDark } = useThemeStore();
    const colors = ThemeColors.light;
    const { showDialog, DialogComponent } = useDarkDialog();

    useEffect(() => { load(); }, []);

    const load = async () => {
        try {
            setLoading(true);
            const data = await productionOrderApi.getOrders();
            setOrders(Array.isArray(data) ? data : []);
        } catch (e: any) {
            showDialog('Lỗi', e.response?.data?.message || 'Không thể tải danh sách lệnh SX');
        } finally { setLoading(false); setRefreshing(false); }
    };

    const filtered = useMemo(() =>
        filter === 'all' ? orders : orders.filter(o => o.status === filter),
        [orders, filter]
    );

    const counts = useMemo(() => ({
        all: orders.length,
        inProgress: orders.filter(o => o.status === 'IN_PROGRESS').length,
        completed: orders.filter(o => o.status === 'COMPLETED').length,
    }), [orders]);

    return (
        <View style={s.root}>
            <StatusBar style={isDark ? "light" : "dark"} />
            <LinearGradient colors={colors.gradientColors} style={StyleSheet.absoluteFill} />

            <SafeAreaView style={s.safe} edges={['top']}>
                <Animated.View entering={FadeInDown.duration(400)} style={s.header}>
                    <Pressable style={[s.backBtn, { backgroundColor: colors.inputBg }]} onPress={() => router.replace('/(tabs)/production')}>
                        <ChevronLeft size={22} color={colors.textSecondary} />
                    </Pressable>
                    <View style={s.headerIcon}>
                        <LinearGradient colors={['#8B5CF6', '#A78BFA']} style={s.iconGrad}>
                            <ClipboardList size={20} color="#fff" strokeWidth={2} />
                        </LinearGradient>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[s.headerTitle, { color: colors.textPrimary }]}>Lệnh SX</Text>
                        <Text style={[s.headerSub, { color: colors.textMuted }]}>Quản lý lệnh sản xuất</Text>
                    </View>
                    <Pressable style={[s.backBtn, { backgroundColor: colors.inputBg }]} onPress={() => { setRefreshing(true); load(); }}>
                        <RefreshCw size={16} color={colors.textSecondary} />
                    </Pressable>
                </Animated.View>

                {/* Stats */}
                <Animated.View entering={FadeInUp.duration(Timings.entrance).delay(80)} style={s.statsRow}>
                    {[
                        { label: 'Tổng', value: counts.all, color: '#818CF8' },
                        { label: 'Đang SX', value: counts.inProgress, color: '#FBBF24' },
                        { label: 'Hoàn thành', value: counts.completed, color: '#34D399' },
                    ].map(st => (
                        <View key={st.label} style={[s.statCard, { borderColor: colors.cardBorder }]}>
                            <BlurView intensity={20} tint={colors.blurTint} style={StyleSheet.absoluteFill} />
                            <View style={[s.statInner, { backgroundColor: colors.cardBg }]}>
                                <Text style={[s.statValue, { color: st.color }]}>{st.value}</Text>
                                <Text style={[s.statLabel, { color: colors.textMuted }]}>{st.label}</Text>
                            </View>
                        </View>
                    ))}
                </Animated.View>

                {/* Filter chips */}
                <View style={s.filterRow}>
                    {[
                        { key: 'all', label: 'Tất cả' },
                        { key: 'PLANNED', label: 'Kế hoạch' },
                        { key: 'IN_PROGRESS', label: 'Đang SX' },
                        { key: 'COMPLETED', label: 'Hoàn thành' },
                    ].map(f => (
                        <Pressable key={f.key} onPress={() => setFilter(f.key as any)}
                            style={[s.chip, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder }, filter === f.key && s.chipA]}>
                            <Text style={[s.chipT, { color: colors.textMuted }, filter === f.key && { color: colors.textAccent }]}>{f.label}</Text>
                        </Pressable>
                    ))}
                </View>

                <ScrollView contentContainerStyle={s.listContent} showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#818CF8" />}>
                    {loading ? (
                        <View style={s.emptyW}><Text style={[s.emptyT, { color: colors.textMuted }]}>Đang tải...</Text></View>
                    ) : filtered.length === 0 ? (
                        <View style={s.emptyW}>
                            <ClipboardList size={44} color={colors.textMuted} />
                            <Text style={[s.emptyT, { color: colors.textMuted }]}>Không có lệnh SX</Text>
                        </View>
                    ) : (
                        <View style={s.listGap}>
                            {filtered.map((o, i) => {
                                const st = STATUS_MAP[o.status] || { label: o.status, color: '#94A3B8' };
                                const pct = o.quantity > 0 ? Math.min(100, Math.round((o.producedQty / o.quantity) * 100)) : 0;
                                return (
                                    <Animated.View key={o.id} entering={FadeInUp.duration(300).delay(i * 35).springify().damping(18)}>
                                        <View style={[s.card, { borderColor: colors.cardBorder }]}>
                                            <BlurView intensity={20} tint={colors.blurTint} style={StyleSheet.absoluteFill} />
                                            <View style={[s.cardInner, { backgroundColor: colors.cardBg }]}>
                                                <View style={s.cardH}>
                                                    <View style={s.nw}>
                                                        <Text style={[s.cTitle, { color: colors.textPrimary }]}>{o.orderNumber}</Text>
                                                        <Text style={[s.cSub, { color: colors.textMuted }]}>{o.BOM?.Product?.name || 'Sản phẩm'}</Text>
                                                    </View>
                                                    <StatusBadge label={st.label} color={st.color} />
                                                </View>
                                                {o.Product?.name && (
                                                    <Text style={[s.spec, { color: colors.textMuted }]}>{o.Product.name}</Text>
                                                )}
                                                <View style={s.metaRow}>
                                                    <Text style={[s.metaL, { color: colors.textMuted }]}>SL: {o.producedQty}/{o.quantity}</Text>
                                                    <Text style={[s.metaR, { color: st.color }]}>{pct}%</Text>
                                                </View>
                                                {pct > 0 && (
                                                    <View style={[s.barBg, { backgroundColor: colors.divider }]}>
                                                        <View style={[s.barFill, { width: `${pct}%`, backgroundColor: st.color }]} />
                                                    </View>
                                                )}
                                                <View style={s.dateRow}>
                                                    <Text style={[s.dateT, { color: colors.textMuted }]}>{fmtDate(o.startDate)} → {fmtDate(o.endDate)}</Text>
                                                </View>
                                            </View>
                                        </View>
                                    </Animated.View>
                                );
                            })}
                        </View>
                    )}
                    <View style={{ height: 100 }} />
                </ScrollView>
            </SafeAreaView>
            {DialogComponent}
        </View>
    );
}

const s = StyleSheet.create({
    root: { flex: 1 }, safe: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
    backBtn: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    headerIcon: { marginRight: 4 },
    iconGrad: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: FontSizes.lg, fontWeight: FontWeights.bold },
    headerSub: { fontSize: FontSizes.xs, marginTop: 1 },
    statsRow: { flexDirection: 'row', gap: Spacing.md, paddingHorizontal: Spacing.xl, marginBottom: Spacing.md },
    statCard: { flex: 1, borderRadius: BorderRadius.xl, overflow: 'hidden', borderWidth: 1 },
    statInner: { paddingVertical: 12, paddingHorizontal: 8, alignItems: 'center' },
    statValue: { fontSize: 22, fontWeight: FontWeights.bold },
    statLabel: { fontSize: 10 },
    filterRow: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.xl, marginBottom: Spacing.md, flexWrap: 'wrap' },
    chip: { paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: BorderRadius.full, borderWidth: 1 },
    chipA: { backgroundColor: 'rgba(99,102,241,0.15)', borderColor: 'rgba(99,102,241,0.3)' },
    chipT: { fontSize: FontSizes.xs, fontWeight: FontWeights.medium },
    listContent: { paddingHorizontal: Spacing.xl },
    emptyW: { alignItems: 'center', paddingVertical: 60, gap: Spacing.md },
    emptyT: { fontSize: FontSizes.base },
    listGap: { gap: Spacing.md },
    card: { borderRadius: 18, overflow: 'hidden', borderWidth: 1 },
    cardInner: { padding: Spacing.md },
    cardH: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
    nw: { flex: 1, marginRight: Spacing.sm },
    cTitle: { fontSize: FontSizes.base, fontWeight: FontWeights.semibold },
    cSub: { fontSize: FontSizes.xs, marginTop: 2 },
    spec: { fontSize: FontSizes.xs, marginBottom: Spacing.sm },
    metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    metaL: { fontSize: FontSizes.sm },
    metaR: { fontSize: FontSizes.sm, fontWeight: FontWeights.bold },
    barBg: { height: 4, borderRadius: 2, marginBottom: Spacing.sm },
    barFill: { height: 4, borderRadius: 2 },
    dateRow: { marginTop: 2 },
    dateT: { fontSize: FontSizes.xs },
});
