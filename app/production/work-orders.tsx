// Production Work Orders Screen — Glassmorphism + Progress
import React, { useState, useEffect, useMemo } from 'react';
import {
    View, Text, StyleSheet, Pressable, Modal, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import {
    ClipboardList, CheckSquare, X, Calendar, Layers, Package, Hash,
    PlayCircle, CheckCircle2, ChevronLeft,
} from 'lucide-react-native';
import Svg, { Circle } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';

import { productionOrderApi, ProductionOrder, ProductionStatus } from '@/lib/production-order-api';
import { Timings } from '@/constants/GlassTokens';
import { Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants/Tokens';
import { GlassListCard, StatusBadge } from '@/components/ui/GlassDataScreen';
import { useThemeStore } from '@/store';
import { ThemeColors } from '@/constants/ThemeColors';
import { useDarkDialog } from '@/components/ui/DarkDialog';

// ─── Types & Constants ───────────────────────────────────────────────────────
const STATUS_MAP: Record<ProductionStatus, { label: string; color: string }> = {
    PLANNED: { label: 'Kế hoạch', color: '#F59E0B' },
    IN_PROGRESS: { label: 'Đang SX', color: '#6366F1' },
    COMPLETED: { label: 'Hoàn thành', color: '#10B981' },
    CANCELLED: { label: 'Đã hủy', color: '#EF4444' },
};

const FILTER_OPTS = [
    { key: 'all', label: 'Tất cả' },
    { key: 'PLANNED', label: 'Kế hoạch' },
    { key: 'IN_PROGRESS', label: 'Đang SX' },
    { key: 'COMPLETED', label: 'Hoàn thành' },
] as const;

const fmtDate = (d?: string) =>
    d ? new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

// ─── Circular Progress ────────────────────────────────────────────────────────
function CircularProgress({ pct, color, size = 56, trackColor }: { pct: number; color: string; size?: number; trackColor: string }) {
    const R = (size - 6) / 2;
    const circ = 2 * Math.PI * R;
    const dash = (pct / 100) * circ;
    return (
        <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
            <Circle cx={size / 2} cy={size / 2} r={R} stroke={trackColor} strokeWidth={5} fill="none" />
            <Circle cx={size / 2} cy={size / 2} r={R} stroke={color} strokeWidth={5} fill="none"
                strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
        </Svg>
    );
}

// ─── Progress Card ─────────────────────────────────────────────────────────────
function ProgressCard({ order }: { order: ProductionOrder }) {
    const { isDark } = useThemeStore();
    const colors = ThemeColors.light;
    const pct = order.quantity > 0 ? Math.min(100, Math.round((Number(order.producedQty) / Number(order.quantity)) * 100)) : 0;
    const st = STATUS_MAP[order.status];
    return (
        <View style={pc.wrap}>
            <CircularProgress pct={pct} color={st.color} size={52} trackColor={colors.divider} />
            <View style={pc.label}>
                <Text style={[pc.pct, { color: st.color }]}>{pct}%</Text>
                <Text style={[pc.sub, { color: colors.textMuted }]}>{Number(order.producedQty)}/{Number(order.quantity)}</Text>
            </View>
        </View>
    );
}
const pc = StyleSheet.create({
    wrap: { alignItems: 'center', position: 'relative' },
    label: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
    pct: { fontSize: 12, fontWeight: '800' },
    sub: { fontSize: 8 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function WorkOrdersScreen() {
    const router = useRouter();
    const [orders, setOrders] = useState<ProductionOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState<'all' | ProductionStatus>('all');
    const [selected, setSelected] = useState<ProductionOrder | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const { isDark } = useThemeStore();
    const colors = ThemeColors.light;
    const { showDialog, DialogComponent } = useDarkDialog();

    useEffect(() => { load(); }, []);

    const load = async () => {
        try {
            setLoading(true);
            const data = await productionOrderApi.getOrders();
            setOrders(Array.isArray(data) ? data : []);
        } catch { setOrders([]); }
        finally { setLoading(false); setRefreshing(false); }
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

    const doStart = async (id: string) => {
        setActionLoading(true);
        try {
            const updated = await productionOrderApi.updateOrder(id, { status: 'IN_PROGRESS' } as any);
            setOrders(prev => prev.map(o => o.id === id ? updated : o));
            setSelected(updated);
            showDialog('OK', 'Đã bắt đầu sản xuất');
        } catch (e: any) {
            showDialog('Lỗi', e.response?.data?.message || 'Không thể cập nhật');
        } finally { setActionLoading(false); }
    };

    const doComplete = async (id: string) => {
        setActionLoading(true);
        try {
            const updated = await productionOrderApi.updateOrder(id, { status: 'COMPLETED' } as any);
            setOrders(prev => prev.map(o => o.id === id ? updated : o));
            setSelected(updated);
            showDialog('OK', 'Đã hoàn thành lệnh sản xuất');
        } catch (e: any) {
            showDialog('Lỗi', e.response?.data?.message || 'Không thể cập nhật');
        } finally { setActionLoading(false); }
    };

    return (
        <View style={s.root}>
            <StatusBar style={isDark ? "light" : "dark"} />
            <LinearGradient colors={colors.gradientColors} style={StyleSheet.absoluteFill} />
            <View style={[s.orb, { backgroundColor: isDark ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.06)' }]} />

            <SafeAreaView style={s.safe} edges={['top']}>
                {/* Header */}
                <Animated.View entering={FadeInDown.duration(400)} style={s.header}>
                    <Pressable style={[s.backBtn, { backgroundColor: colors.inputBg }]} onPress={() => router.replace('/(tabs)/production')}>
                        <ChevronLeft size={22} color={colors.textSecondary} />
                    </Pressable>
                    <View style={s.headerIcon}>
                        <LinearGradient colors={['#0EA5E9', '#38BDF8']} style={s.iconGrad}>
                            <CheckSquare size={20} color="#fff" strokeWidth={2} />
                        </LinearGradient>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[s.headerTitle, { color: colors.textPrimary }]}>Lệnh sản xuất</Text>
                        <Text style={[s.headerSub, { color: colors.textMuted }]}>Quản lý & theo dõi tiến độ</Text>
                    </View>
                    <Pressable style={[s.backBtn, { backgroundColor: colors.inputBg }]} onPress={() => { setRefreshing(true); load(); }}>
                        <ClipboardList size={18} color={colors.textSecondary} />
                    </Pressable>
                </Animated.View>

                {/* Stats row */}
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
                <Animated.View entering={FadeInUp.duration(Timings.entrance).delay(140)} style={s.filterRow}>
                    {FILTER_OPTS.map(f => (
                        <Pressable key={f.key} onPress={() => setFilter(f.key as any)}
                            style={[s.chip, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder }, filter === f.key && s.chipA]}>
                            <Text style={[s.chipT, { color: colors.textMuted }, filter === f.key && { color: colors.textAccent }]}>{f.label}</Text>
                        </Pressable>
                    ))}
                </Animated.View>

                {/* List */}
                <ScrollView
                    contentContainerStyle={s.listContent}
                    showsVerticalScrollIndicator={false}
                >
                    {loading ? (
                        <View style={s.emptyW}>
                            <Text style={[s.emptyT, { color: colors.textMuted }]}>Đang tải...</Text>
                        </View>
                    ) : filtered.length === 0 ? (
                        <View style={s.emptyW}>
                            <ClipboardList size={48} color={colors.textMuted} />
                            <Text style={[s.emptyT, { color: colors.textMuted }]}>Không có lệnh sản xuất</Text>
                        </View>
                    ) : (
                        <View style={s.listGap}>
                            {filtered.map((o, i) => {
                                const st = STATUS_MAP[o.status];
                                return (
                                    <Pressable key={o.id} onPress={() => setSelected(o)}>
                                        <GlassListCard index={i}>
                                            <View style={s.cardRow}>
                                                <ProgressCard order={o} />
                                                <View style={s.cardContent}>
                                                    <View style={s.cardTop}>
                                                        <Text style={[s.cTitle, { color: colors.textPrimary }]} numberOfLines={1}>{o.orderNumber}</Text>
                                                        <StatusBadge label={st.label} color={st.color} />
                                                    </View>
                                                    <Text style={[s.cSpec, { color: colors.textMuted }]} numberOfLines={1}>
                                                        {o.Product?.name || o.BOM?.Product?.name || '—'}
                                                    </Text>
                                                    <View style={s.infoR}>
                                                        <Text style={[s.iL, { color: colors.textMuted }]}>SL kế hoạch</Text>
                                                        <Text style={[s.iV, { color: colors.textPrimary }]}>{Number(o.quantity)}</Text>
                                                    </View>
                                                    {o.startDate && (
                                                        <View style={s.infoR}>
                                                            <Text style={[s.iL, { color: colors.textMuted }]}>Bắt đầu</Text>
                                                            <Text style={[s.iV, { color: colors.textPrimary }]}>{fmtDate(o.startDate)}</Text>
                                                        </View>
                                                    )}
                                                </View>
                                            </View>
                                        </GlassListCard>
                                    </Pressable>
                                );
                            })}
                        </View>
                    )}
                    <View style={{ height: 120 }} />
                </ScrollView>
            </SafeAreaView>

            {/* Detail Modal */}
            {selected && (
                <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSelected(null)}>
                    <View style={mdS.container}>
                        <LinearGradient colors={colors.gradientColors} style={StyleSheet.absoluteFill} />
                        {/* Modal Header */}
                        <View style={[mdS.header, { borderBottomColor: colors.divider }]}>
                            <View>
                                <Text style={[mdS.orderNum, { color: colors.textPrimary }]}>{selected.orderNumber}</Text>
                                <StatusBadge label={STATUS_MAP[selected.status].label} color={STATUS_MAP[selected.status].color} />
                            </View>
                            <Pressable style={[mdS.closeBtn, { backgroundColor: colors.inputBg }]} onPress={() => setSelected(null)}>
                                <X size={20} color={colors.textSecondary} />
                            </Pressable>
                        </View>

                        <ScrollView contentContainerStyle={mdS.scroll} showsVerticalScrollIndicator={false}>
                            {/* Progress Hero */}
                            <Animated.View entering={FadeInDown.duration(400).springify().damping(18)} style={[mdS.progressHero, { borderColor: colors.cardBorder }]}>
                                <BlurView intensity={20} tint={colors.blurTint} style={StyleSheet.absoluteFill} />
                                <View style={[mdS.progressInner, { backgroundColor: colors.cardBg }]}>
                                    <CircularProgress
                                        pct={selected.quantity > 0 ? Math.min(100, Math.round((Number(selected.producedQty) / Number(selected.quantity)) * 100)) : 0}
                                        color={STATUS_MAP[selected.status].color}
                                        size={100}
                                        trackColor={colors.divider}
                                    />
                                    <View style={mdS.progressLabel}>
                                        <Text style={[mdS.progressPct, { color: STATUS_MAP[selected.status].color }]}>
                                            {selected.quantity > 0 ? Math.min(100, Math.round((Number(selected.producedQty) / Number(selected.quantity)) * 100)) : 0}%
                                        </Text>
                                        <Text style={[mdS.progressSub, { color: colors.textMuted }]}>Tiến độ sản xuất</Text>
                                        <Text style={[mdS.progressSub, { color: colors.textPrimary, fontWeight: '700', marginTop: 4 }]}>
                                            {Number(selected.producedQty)} / {Number(selected.quantity)} sản phẩm
                                        </Text>
                                    </View>
                                </View>
                            </Animated.View>

                            {/* Info Cards */}
                            <Animated.View entering={FadeInUp.duration(400).delay(100).springify().damping(18)} style={mdS.infoList}>
                                {[
                                    { Icon: Package, label: 'Sản phẩm', value: selected.BOM?.Product?.name || '—' },
                                    { Icon: Layers, label: 'Quy cách', value: selected.Product?.name || '—', sub: selected.Product?.code },
                                    { Icon: Hash, label: 'Kế hoạch SX', value: selected.ProductionPlan?.planNumber || '—' },
                                    { Icon: Calendar, label: 'Ngày bắt đầu', value: fmtDate(selected.startDate) },
                                    { Icon: Calendar, label: 'Ngày kết thúc', value: fmtDate(selected.endDate) },
                                ].map(({ Icon, label, value, sub }, idx) => (
                                    <View key={idx} style={[mdS.infoCard, { borderColor: colors.cardBorder }]}>
                                        <BlurView intensity={20} tint={colors.blurTint} style={StyleSheet.absoluteFill} />
                                        <View style={[mdS.infoInner, { backgroundColor: colors.cardBg }]}>
                                            <View style={[mdS.infoIcon, { backgroundColor: isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.1)' }]}><Icon size={18} color="#818CF8" /></View>
                                            <View style={mdS.infoText}>
                                                <Text style={[mdS.infoLabel, { color: colors.textMuted }]}>{label}</Text>
                                                <Text style={[mdS.infoValue, { color: colors.textPrimary }]}>{value}</Text>
                                                {sub && <Text style={[mdS.infoSub, { color: colors.textMuted }]}>{sub}</Text>}
                                            </View>
                                        </View>
                                    </View>
                                ))}
                            </Animated.View>

                            {/* Action Buttons */}
                            <Animated.View entering={FadeInUp.duration(400).delay(200).springify().damping(18)} style={mdS.actions}>
                                {selected.status === 'PLANNED' && (
                                    <Pressable
                                        style={[mdS.btn, { backgroundColor: 'rgba(99,102,241,0.2)', borderColor: 'rgba(99,102,241,0.5)' }]}
                                        disabled={actionLoading}
                                        onPress={() => doStart(selected.id)}
                                    >
                                        <PlayCircle size={20} color="#A5B4FC" />
                                        <Text style={[mdS.btnT, { color: '#A5B4FC' }]}>Bắt đầu sản xuất</Text>
                                    </Pressable>
                                )}
                                {selected.status === 'IN_PROGRESS' && (
                                    <Pressable
                                        style={[mdS.btn, { backgroundColor: 'rgba(16,185,129,0.2)', borderColor: 'rgba(16,185,129,0.5)' }]}
                                        disabled={actionLoading}
                                        onPress={() => doComplete(selected.id)}
                                    >
                                        <CheckCircle2 size={20} color="#34D399" />
                                        <Text style={[mdS.btnT, { color: '#34D399' }]}>Hoàn thành lệnh SX</Text>
                                    </Pressable>
                                )}
                            </Animated.View>
                            <View style={{ height: 60 }} />
                        </ScrollView>
                    </View>
                </Modal>
            )}
            {DialogComponent}
        </View>
    );
}

const s = StyleSheet.create({
    root: { flex: 1 },
    safe: { flex: 1 },
    orb: { position: 'absolute', top: -40, right: -40, width: 180, height: 180, borderRadius: 90 },
    header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
    backBtn: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    headerIcon: { marginRight: 4 },
    iconGrad: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: FontSizes.lg, fontWeight: FontWeights.bold },
    headerSub: { fontSize: FontSizes.xs, marginTop: 1 },
    statsRow: { flexDirection: 'row', gap: Spacing.md, paddingHorizontal: Spacing.xl, marginBottom: Spacing.md },
    statCard: { flex: 1, borderRadius: BorderRadius.xl, overflow: 'hidden', borderWidth: 1 },
    statInner: { padding: 12, alignItems: 'center' },
    statValue: { fontSize: 22, fontWeight: FontWeights.bold },
    statLabel: { fontSize: 10, marginTop: 2 },
    filterRow: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.xl, marginBottom: Spacing.md, flexWrap: 'wrap' },
    chip: { paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: BorderRadius.full, borderWidth: 1 },
    chipA: { backgroundColor: 'rgba(99,102,241,0.2)', borderColor: 'rgba(99,102,241,0.5)' },
    chipT: { fontSize: FontSizes.xs, fontWeight: FontWeights.medium },
    listContent: { paddingHorizontal: Spacing.xl },
    emptyW: { alignItems: 'center', paddingVertical: 80, gap: Spacing.md },
    emptyT: { fontSize: FontSizes.base },
    listGap: { gap: Spacing.md },
    cardRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
    cardContent: { flex: 1 },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    cTitle: { fontSize: FontSizes.base, fontWeight: FontWeights.semibold, flex: 1 },
    cSpec: { fontSize: FontSizes.xs, marginBottom: 6 },
    infoR: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
    iL: { fontSize: FontSizes.xs },
    iV: { fontSize: FontSizes.xs, fontWeight: FontWeights.semibold },
});

const mdS = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: Spacing.xl, paddingTop: 50, paddingBottom: Spacing.md, borderBottomWidth: 1 },
    orderNum: { fontSize: FontSizes.xl, fontWeight: FontWeights.bold, marginBottom: 6 },
    closeBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    scroll: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg },
    progressHero: { borderRadius: 24, overflow: 'hidden', borderWidth: 1, marginBottom: Spacing.lg },
    progressInner: { flexDirection: 'row', alignItems: 'center', padding: Spacing.xl, gap: Spacing.xl },
    progressLabel: { flex: 1 },
    progressPct: { fontSize: 36, fontWeight: '900' },
    progressSub: { fontSize: FontSizes.sm, marginTop: 2 },
    infoList: { gap: Spacing.sm, marginBottom: Spacing.lg },
    infoCard: { borderRadius: BorderRadius.xl, overflow: 'hidden', borderWidth: 1 },
    infoInner: { flexDirection: 'row', alignItems: 'center', padding: Spacing.lg },
    infoIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
    infoText: { flex: 1 },
    infoLabel: { fontSize: FontSizes.xs },
    infoValue: { fontSize: FontSizes.base, fontWeight: FontWeights.medium, marginTop: 2 },
    infoSub: { fontSize: FontSizes.xs, marginTop: 2 },
    actions: { gap: Spacing.md },
    btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: Spacing.lg, borderRadius: BorderRadius.xl, borderWidth: 1 },
    btnT: { fontSize: FontSizes.base, fontWeight: FontWeights.bold },
});
