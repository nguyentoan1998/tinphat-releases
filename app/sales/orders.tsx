// Sales Orders Screen — Glassmorphism
import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, RefreshControl } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import { ShoppingCart, ChevronLeft, RefreshCw, UserCircle2 } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';

import { salesOrderApi, SalesOrder } from '@/lib/sales-order-api';
import { Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants/Tokens';
import { StatusBadge } from '@/components/ui/GlassDataScreen';
import { useThemeStore } from '@/store';
import { ThemeColors } from '@/constants/ThemeColors';
import { useDarkDialog } from '@/components/ui/DarkDialog';

const STATUS_MAP: Record<string, { label: string; color: string }> = {
    PENDING: { label: 'Chờ xử lý', color: '#F59E0B' },
    CONFIRMED: { label: 'Xác nhận', color: '#3B82F6' },
    SHIPPED: { label: 'Đang giao', color: '#8B5CF6' },
    DELIVERED: { label: 'Đã giao', color: '#10B981' },
    COMPLETED: { label: 'Hoàn thành', color: '#10B981' },
    RETURNED: { label: 'Trả hàng', color: '#F97316' },
    CANCELLED: { label: 'Đã hủy', color: '#EF4444' },
};

const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';
const fmtCurrency = (n: number) => n.toLocaleString('vi-VN') + ' \u20AB';

const FILTERS = [
    { key: 'all', label: 'Tất cả' },
    { key: 'PENDING', label: 'Chờ xử lý' },
    { key: 'CONFIRMED', label: 'Xác nhận' },
    { key: 'SHIPPED', label: 'Đang giao' },
];

export default function SalesOrdersScreen() {
    const router = useRouter();
    const [orders, setOrders] = useState<SalesOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState('all');
    const { isDark } = useThemeStore();
    const colors = ThemeColors.light;
    const { showDialog, DialogComponent } = useDarkDialog();

    useEffect(() => { load(); }, []);
    const load = async () => {
        try { setLoading(true); const d = await salesOrderApi.getOrders(); setOrders(Array.isArray(d) ? d : []); }
        catch (e: any) { showDialog('Lỗi', e.response?.data?.message || 'Không thể tải đơn hàng'); }
        finally { setLoading(false); setRefreshing(false); }
    };

    const filtered = useMemo(() => filter === 'all' ? orders : orders.filter(o => o.status === filter), [orders, filter]);
    const totalRevenue = useMemo(() => orders.reduce((s, o) => s + o.totalAmount, 0), [orders]);

    return (
        <View style={s.root}>
            <StatusBar style={isDark ? "light" : "dark"} />
            <LinearGradient colors={colors.gradientColors} style={StyleSheet.absoluteFill} />
            <SafeAreaView style={s.safe} edges={['top']}>
                <Animated.View entering={FadeInDown.duration(400)} style={s.header}>
                    <Pressable style={[s.btn, { backgroundColor: colors.inputBg }]} onPress={() => router.replace('/(tabs)/sales')}>
                        <ChevronLeft size={22} color={colors.textSecondary} />
                    </Pressable>
                    <View style={s.headerIcon}>
                        <LinearGradient colors={['#14B8A6', '#2DD4BF']} style={s.iconGrad}>
                            <ShoppingCart size={20} color="#fff" strokeWidth={2} />
                        </LinearGradient>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[s.title, { color: colors.textPrimary }]}>Đơn đặt hàng</Text>
                        <Text style={[s.sub, { color: colors.textMuted }]}>Đơn hàng từ khách</Text>
                    </View>
                    <Pressable style={[s.btn, { backgroundColor: colors.inputBg }]} onPress={() => { setRefreshing(true); load(); }}>
                        <RefreshCw size={16} color={colors.textSecondary} />
                    </Pressable>
                </Animated.View>

                {/* Stats */}
                <Animated.View entering={FadeInDown.duration(400).delay(60)} style={s.statsRow}>
                    {[
                        { label: 'Tổng đơn', value: orders.length, color: '#818CF8' },
                        { label: 'Doanh thu', value: (totalRevenue / 1000000).toFixed(1) + 'M', color: '#34D399' },
                        { label: 'Chờ xử lý', value: orders.filter(o => o.status === 'PENDING').length, color: '#FBBF24' },
                    ].map(st => (
                        <View key={st.label} style={[s.statCard, { borderColor: colors.cardBorder }]}>
                            <BlurView intensity={20} tint={colors.blurTint} style={StyleSheet.absoluteFill} />
                            <View style={[s.statInner, { backgroundColor: colors.cardBg }]}>
                                <Text style={[s.statV, { color: st.color }]}>{st.value}</Text>
                                <Text style={[s.statL, { color: colors.textMuted }]}>{st.label}</Text>
                            </View>
                        </View>
                    ))}
                </Animated.View>

                <View style={s.filterRow}>
                    {FILTERS.map(f => (
                        <Pressable key={f.key} onPress={() => setFilter(f.key)}
                            style={[s.chip, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder }, filter === f.key && s.chipA]}>
                            <Text style={[s.chipT, { color: colors.textMuted }, filter === f.key && { color: colors.textAccent }]}>{f.label}</Text>
                        </Pressable>
                    ))}
                </View>

                <ScrollView contentContainerStyle={s.list} showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#34D399" />}>
                    {loading ? <Text style={[s.emptyT, { color: colors.textMuted }]}>Đang tải...</Text>
                        : filtered.length === 0 ? (
                            <View style={s.emptyW}><ShoppingCart size={44} color={colors.textMuted} /><Text style={[s.emptyT, { color: colors.textMuted }]}>Không có đơn hàng</Text></View>
                        ) : (
                            <View style={s.gap}>
                                {filtered.map((o, i) => {
                                    const st = STATUS_MAP[o.status] || { label: o.status, color: '#94A3B8' };
                                    return (
                                        <Animated.View key={o.id} entering={FadeInUp.duration(300).delay(i * 35).springify().damping(18)}>
                                            <View style={[s.card, { borderColor: colors.cardBorder }]}>
                                                <BlurView intensity={20} tint={colors.blurTint} style={StyleSheet.absoluteFill} />
                                                <View style={[s.cardInner, { backgroundColor: colors.cardBg }]}>
                                                    <View style={s.row}>
                                                        <View style={s.nw}>
                                                            <Text style={[s.cTitle, { color: colors.textPrimary }]}>{o.orderNumber}</Text>
                                                            <Text style={[s.cSub, { color: colors.textMuted }]}>{o.Customer?.name || '—'}</Text>
                                                        </View>
                                                        <StatusBadge label={st.label} color={st.color} />
                                                    </View>
                                                    <View style={s.footerRow}>
                                                        <Text style={[s.meta, { color: colors.textMuted }]}>{fmtDate(o.orderDate)}</Text>
                                                        <Text style={[s.amt, { color: '#34D399' }]}>{fmtCurrency(o.totalAmount)}</Text>
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
    btn: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    headerIcon: { marginRight: 4 },
    iconGrad: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    title: { fontSize: FontSizes.lg, fontWeight: FontWeights.bold },
    sub: { fontSize: FontSizes.xs, marginTop: 1 },
    statsRow: { flexDirection: 'row', gap: Spacing.md, paddingHorizontal: Spacing.xl, marginBottom: Spacing.sm },
    statCard: { flex: 1, borderRadius: 14, overflow: 'hidden', borderWidth: 1 },
    statInner: { paddingVertical: 10, paddingHorizontal: 6, alignItems: 'center' },
    statV: { fontSize: 18, fontWeight: FontWeights.bold },
    statL: { fontSize: 9 },
    filterRow: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.xl, marginBottom: Spacing.sm, flexWrap: 'wrap' },
    chip: { paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: BorderRadius.full, borderWidth: 1 },
    chipA: { backgroundColor: 'rgba(99,102,241,0.15)', borderColor: 'rgba(99,102,241,0.3)' },
    chipT: { fontSize: FontSizes.xs, fontWeight: FontWeights.medium },
    list: { paddingHorizontal: Spacing.xl },
    emptyW: { alignItems: 'center', paddingVertical: 60, gap: Spacing.md },
    emptyT: { fontSize: FontSizes.base, textAlign: 'center', marginTop: 60 },
    gap: { gap: Spacing.md },
    card: { borderRadius: 18, overflow: 'hidden', borderWidth: 1 },
    cardInner: { padding: Spacing.md },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.sm },
    nw: { flex: 1, marginRight: Spacing.sm },
    cTitle: { fontSize: FontSizes.base, fontWeight: FontWeights.semibold },
    cSub: { fontSize: FontSizes.xs, marginTop: 2 },
    footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    meta: { fontSize: FontSizes.xs },
    amt: { fontSize: FontSizes.sm, fontWeight: FontWeights.bold },
});
