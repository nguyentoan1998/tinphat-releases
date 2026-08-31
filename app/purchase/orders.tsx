// Purchase Orders Screen — Glassmorphism + View Modal
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    View, Text, StyleSheet, Pressable, ScrollView,
    RefreshControl, FlatList, ListRenderItem, Modal,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import {
    ClipboardList, ChevronLeft, RefreshCw, Building2,
    Calendar, Package, DollarSign, Hash, X, FileText,
    ChevronRight, AlertCircle,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';

import { purchaseOrderApi, PurchaseOrder } from '@/lib/purchase-order-api';
import { Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants/Tokens';
import { useThemeStore } from '@/store';
import { ThemeColors } from '@/constants/ThemeColors';
import PaginationFooter from '@/components/ui/PaginationFooter';
import { useDarkDialog } from '@/components/ui/DarkDialog';

// ─── Constants ────────────────────────────────────────────────────────────────
const ACCENT = '#6366F1';
const ACCENT2 = '#818CF8';

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
    PENDING: { label: 'Chờ duyệt', color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' },
    APPROVED: { label: 'Đã duyệt', color: '#3B82F6', bg: 'rgba(59,130,246,0.15)' },
    RECEIVED: { label: 'Đã nhận', color: '#10B981', bg: 'rgba(16,185,129,0.15)' },
    CANCELLED: { label: 'Đã hủy', color: '#EF4444', bg: 'rgba(239,68,68,0.15)' },
};

const FILTERS = [
    { key: 'all', label: 'Tất cả' },
    { key: 'PENDING', label: 'Chờ duyệt' },
    { key: 'APPROVED', label: 'Đã duyệt' },
    { key: 'RECEIVED', label: 'Đã nhận' },
    { key: 'CANCELLED', label: 'Đã hủy' },
];

const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';
const fmtCurrency = (n: number) => n.toLocaleString('vi-VN') + 'đ';

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusPill({ status }: { status: string }) {
    const s = STATUS_MAP[status] ?? { label: status, color: '#94A3B8', bg: 'rgba(148,163,184,0.15)' };
    return (
        <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: s.bg }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: s.color }}>{s.label}</Text>
        </View>
    );
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────
function OrderDetailModal({ order, onClose }: { order: PurchaseOrder; onClose: () => void }) {
    const { isDark } = useThemeStore();
    const colors = ThemeColors.light;
    const st = STATUS_MAP[order.status] ?? { label: order.status, color: '#94A3B8', bg: 'rgba(148,163,184,0.15)' };

    const infoRows = [
        { Icon: Hash, label: 'Số đơn', value: order.poNumber },
        { Icon: Building2, label: 'Nhà cung cấp', value: order.Supplier?.name || '—' },
        { Icon: Calendar, label: 'Ngày đặt', value: fmtDate(order.orderDate) },
        { Icon: Calendar, label: 'Ngày dự nhận', value: fmtDate(order.expectedDate) },
        { Icon: DollarSign, label: 'Tổng giá trị', value: fmtCurrency(order.totalAmount) },
        ...(order.note ? [{ Icon: FileText, label: 'Ghi chú', value: order.note }] : []),
    ];

    return (
        <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <View style={md.container}>
                <LinearGradient colors={colors.gradientColors} style={StyleSheet.absoluteFill} />

                {/* Header */}
                <View style={[md.header, { borderBottomColor: colors.divider }]}>
                    <View>
                        <Text style={[md.headerTitle, { color: colors.textPrimary }]}>Chi tiết đơn mua hàng</Text>
                        <Text style={[md.headerSub, { color: colors.textMuted }]}>{order.poNumber}</Text>
                    </View>
                    <Pressable onPress={onClose} style={[md.closeBtn, { backgroundColor: colors.inputBg }]}>
                        <X size={20} color={colors.textSecondary} />
                    </Pressable>
                </View>

                <ScrollView contentContainerStyle={md.scroll} showsVerticalScrollIndicator={false}>
                    {/* Status Hero */}
                    <Animated.View entering={FadeInDown.duration(400).springify().damping(18)} style={md.heroWrap}>
                        <LinearGradient colors={[st.color + '33', st.color + '11']} style={md.heroBg}>
                            <ClipboardList size={36} color={st.color} strokeWidth={1.5} />
                        </LinearGradient>
                        <View style={[md.heroBadge, { backgroundColor: st.bg }]}>
                            <Text style={[md.heroStatus, { color: st.color }]}>{st.label}</Text>
                        </View>
                        <Text style={[md.heroAmount, { color: colors.textPrimary }]}>{fmtCurrency(order.totalAmount)}</Text>
                        <Text style={[md.heroSub, { color: colors.textMuted }]}>{order.Supplier?.name || '—'}</Text>
                    </Animated.View>

                    {/* Info rows */}
                    <Animated.View entering={FadeInUp.duration(400).delay(100).springify().damping(18)} style={md.infoSection}>
                        {infoRows.map(({ Icon, label, value }, i) => (
                            <View key={i} style={[md.infoRow, { borderBottomColor: colors.divider }]}>
                                <View style={[md.infoIcon, { backgroundColor: isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.08)' }]}>
                                    <Icon size={15} color={ACCENT} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[md.infoLabel, { color: colors.textMuted }]}>{label}</Text>
                                    <Text style={[md.infoValue, { color: colors.textPrimary }]}>{value}</Text>
                                </View>
                            </View>
                        ))}
                    </Animated.View>

                    {/* Items */}
                    {order.PurchaseOrderItem && order.PurchaseOrderItem.length > 0 && (
                        <Animated.View entering={FadeInUp.duration(400).delay(200).springify().damping(18)} style={md.itemsSection}>
                            <View style={md.itemsHeader}>
                                <Package size={16} color={ACCENT} />
                                <Text style={[md.itemsTitle, { color: colors.textPrimary }]}>
                                    Sản phẩm ({order.PurchaseOrderItem.length})
                                </Text>
                            </View>
                            {order.PurchaseOrderItem.map((item, i) => (
                                <View key={item.id || i} style={[md.itemCard, { borderColor: colors.cardBorder }]}>
                                    <BlurView intensity={18} tint={colors.blurTint} style={StyleSheet.absoluteFill} />
                                    <View style={[md.itemInner, { backgroundColor: colors.cardBg }]}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[md.itemName, { color: colors.textPrimary }]} numberOfLines={1}>
                                                {item.Product?.name || 'N/A'}
                                            </Text>
                                            <Text style={[md.itemSpec, { color: colors.textMuted }]}>
                                                {item.Product?.name || item.productId}
                                            </Text>
                                        </View>
                                        <View style={{ alignItems: 'flex-end', gap: 2 }}>
                                            <Text style={[md.itemQty, { color: ACCENT2 }]}>SL: {item.quantity}</Text>
                                            <Text style={[md.itemPrice, { color: '#34D399' }]}>{fmtCurrency(item.unitPrice)}/đv</Text>
                                            <Text style={[md.itemTotal, { color: colors.textMuted }]}>
                                                = {fmtCurrency(item.quantity * item.unitPrice)}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            ))}
                        </Animated.View>
                    )}

                    <View style={{ height: 60 }} />
                </ScrollView>
            </View>
        </Modal>
    );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function PurchaseOrdersScreen() {
    const router = useRouter();
    const [orders, setOrders] = useState<PurchaseOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState('all');
    const [selected, setSelected] = useState<PurchaseOrder | null>(null);
    const { isDark } = useThemeStore();
    const colors = ThemeColors.light;
    const { showDialog, DialogComponent } = useDarkDialog();

    useEffect(() => { load(); }, []);

    const load = async () => {
        try {
            setLoading(true);
            const d = await purchaseOrderApi.getOrders();
            setOrders(Array.isArray(d) ? d : []);
        } catch (e: any) {
            showDialog('Lỗi', e.response?.data?.message || 'Không thể tải đơn mua hàng');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const filtered = useMemo(
        () => filter === 'all' ? orders : orders.filter(o => o.status === filter),
        [orders, filter]
    );

    // Summary counts
    const counts = useMemo(() => {
        const c: Record<string, number> = { all: orders.length };
        orders.forEach(o => { c[o.status] = (c[o.status] || 0) + 1; });
        return c;
    }, [orders]);

    const renderItem: ListRenderItem<PurchaseOrder> = useCallback(({ item: o, index: i }) => {
        const st = STATUS_MAP[o.status] ?? { label: o.status, color: '#94A3B8', bg: '' };
        return (
            <Animated.View entering={FadeInUp.duration(300).delay(Math.min(i, 8) * 35).springify().damping(18)}>
                <Pressable onPress={() => setSelected(o)} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
                    <View style={[s.card, { borderColor: colors.cardBorder }]}>
                        <BlurView intensity={20} tint={colors.blurTint} style={StyleSheet.absoluteFill} />
                        <View style={[s.cardInner, { backgroundColor: colors.cardBg }]}>
                            {/* Top row */}
                            <View style={s.cardTop}>
                                <View style={[s.poNumBadge, { backgroundColor: isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.1)' }]}>
                                    <Text style={[s.poNum, { color: ACCENT }]} numberOfLines={1}>{o.poNumber}</Text>
                                </View>
                                <StatusPill status={o.status} />
                            </View>

                            {/* Supplier */}
                            <View style={s.infoRow}>
                                <Building2 size={13} color={colors.textMuted} />
                                <Text style={[s.infoText, { color: colors.textMuted }]} numberOfLines={1}>
                                    {o.Supplier?.name || '—'}
                                </Text>
                            </View>

                            {/* Items count */}
                            {o.PurchaseOrderItem && o.PurchaseOrderItem.length > 0 && (
                                <View style={s.infoRow}>
                                    <Package size={13} color={colors.textMuted} />
                                    <Text style={[s.infoText, { color: colors.textMuted }]}>
                                        {o.PurchaseOrderItem.length} sản phẩm
                                    </Text>
                                </View>
                            )}

                            {/* Bottom row */}
                            <View style={s.cardBottom}>
                                <View style={s.infoRow}>
                                    <Calendar size={13} color={colors.textMuted} />
                                    <Text style={[s.infoText, { color: colors.textMuted }]}>{fmtDate(o.orderDate)}</Text>
                                </View>
                                <View style={s.amtRow}>
                                    <Text style={[s.amt, { color: '#34D399' }]}>{fmtCurrency(o.totalAmount)}</Text>
                                    <ChevronRight size={14} color={colors.textMuted} />
                                </View>
                            </View>
                        </View>
                    </View>
                </Pressable>
            </Animated.View>
        );
    }, [colors, isDark]);

    const keyExtractor = useCallback((item: PurchaseOrder) => item.id, []);

    return (
        <>
            <View style={s.root}>
                <StatusBar style={isDark ? 'light' : 'dark'} />
                <LinearGradient colors={colors.gradientColors} style={StyleSheet.absoluteFill} />
                <SafeAreaView style={s.safe} edges={['top']}>

                    {/* Header */}
                    <Animated.View entering={FadeInDown.duration(400)} style={s.header}>
                        <Pressable style={[s.iconBtn, { backgroundColor: colors.inputBg }]} onPress={() => router.replace('/(tabs)/sales')}>
                            <ChevronLeft size={20} color={colors.textSecondary} />
                        </Pressable>
                        <View style={s.headerIcon}>
                            <LinearGradient colors={[ACCENT, ACCENT2]} style={s.iconGrad}>
                                <ClipboardList size={20} color="#fff" strokeWidth={2} />
                            </LinearGradient>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[s.title, { color: colors.textPrimary }]}>Đơn mua hàng</Text>
                            <Text style={[s.sub, { color: colors.textMuted }]}>{orders.length} đơn hàng</Text>
                        </View>
                        <Pressable style={[s.iconBtn, { backgroundColor: colors.inputBg }]} onPress={() => { setRefreshing(true); load(); }}>
                            <RefreshCw size={16} color={colors.textSecondary} />
                        </Pressable>
                    </Animated.View>

                    {/* Filter chips */}
                    <Animated.View entering={FadeInDown.duration(400).delay(60)}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow}>
                            {FILTERS.map(f => {
                                const active = filter === f.key;
                                const st = STATUS_MAP[f.key];
                                const activeColor = st?.color || ACCENT;
                                return (
                                    <Pressable key={f.key} onPress={() => setFilter(f.key)}
                                        style={[s.chip, {
                                            borderColor: active ? activeColor : colors.cardBorder,
                                            backgroundColor: active ? activeColor + '20' : colors.inputBg,
                                        }]}>
                                        <Text style={[s.chipT, { color: active ? activeColor : colors.textMuted, fontWeight: active ? FontWeights.semibold : FontWeights.regular }]}>
                                            {f.label}
                                        </Text>
                                        {counts[f.key] > 0 && (
                                            <View style={[s.chipCount, { backgroundColor: active ? activeColor + '30' : colors.cardBorder + '40' }]}>
                                                <Text style={[s.chipCountT, { color: active ? activeColor : colors.textMuted }]}>{counts[f.key]}</Text>
                                            </View>
                                        )}
                                    </Pressable>
                                );
                            })}
                        </ScrollView>
                    </Animated.View>

                    {/* List */}
                    {loading ? (
                        <View style={s.centerWrap}>
                            <Text style={[s.emptyT, { color: colors.textMuted }]}>Đang tải...</Text>
                        </View>
                    ) : filtered.length === 0 ? (
                        <View style={s.centerWrap}>
                            <AlertCircle size={44} color={colors.textMuted} strokeWidth={1.5} />
                            <Text style={[s.emptyT, { color: colors.textMuted }]}>Không có đơn hàng</Text>
                        </View>
                    ) : (
                        <FlatList
                            data={filtered}
                            keyExtractor={keyExtractor}
                            renderItem={renderItem}
                            contentContainerStyle={[s.list, s.gap]}
                            showsVerticalScrollIndicator={false}
                            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={ACCENT} />}
                            removeClippedSubviews
                            initialNumToRender={10}
                            maxToRenderPerBatch={10}
                            windowSize={7}
                            ListFooterComponent={
                                <PaginationFooter
                                    hasNextPage={false}
                                    isFetchingNextPage={false}
                                    loadedCount={filtered.length}
                                    onLoadMore={undefined}
                                    accentColor="#0156A7"
                                />
                            }
                        />
                    )}
                </SafeAreaView>
                {DialogComponent}
            </View>

            {selected && <OrderDetailModal order={selected} onClose={() => setSelected(null)} />}
        </>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
    root: { flex: 1 },
    safe: { flex: 1 },
    header: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
        paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, paddingBottom: Spacing.sm,
    },
    iconBtn: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    headerIcon: { marginRight: 4 },
    iconGrad: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    title: { fontSize: FontSizes.lg, fontWeight: FontWeights.bold },
    sub: { fontSize: FontSizes.xs, marginTop: 1 },
    filterRow: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.sm, gap: 8, flexDirection: 'row' },
    chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: BorderRadius.full, borderWidth: 1 },
    chipT: { fontSize: FontSizes.xs },
    chipCount: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
    chipCountT: { fontSize: 10, fontWeight: FontWeights.bold },
    centerWrap: { alignItems: 'center', paddingVertical: 70, gap: Spacing.md },
    emptyT: { fontSize: FontSizes.base, textAlign: 'center' },
    list: { paddingHorizontal: Spacing.xl },
    gap: { gap: Spacing.md },
    card: { borderRadius: 18, overflow: 'hidden', borderWidth: 1 },
    cardInner: { padding: Spacing.md, gap: 8 },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    poNumBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, maxWidth: '60%' },
    poNum: { fontSize: FontSizes.sm, fontWeight: FontWeights.bold },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    infoText: { fontSize: FontSizes.xs, flex: 1 },
    cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
    amtRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    amt: { fontSize: FontSizes.sm, fontWeight: FontWeights.bold },
});

const md = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
        paddingHorizontal: Spacing.xl, paddingTop: 50, paddingBottom: Spacing.lg,
        borderBottomWidth: 1,
    },
    headerTitle: { fontSize: FontSizes.xl, fontWeight: FontWeights.bold },
    headerSub: { fontSize: FontSizes.xs, marginTop: 2 },
    closeBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    scroll: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.md },
    heroWrap: { alignItems: 'center', paddingVertical: Spacing.xl, gap: 10 },
    heroBg: { width: 80, height: 80, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
    heroBadge: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 },
    heroStatus: { fontSize: FontSizes.sm, fontWeight: FontWeights.bold },
    heroAmount: { fontSize: 26, fontWeight: FontWeights.bold, marginTop: 4 },
    heroSub: { fontSize: FontSizes.sm },
    infoSection: { borderRadius: 18, overflow: 'hidden', marginBottom: Spacing.lg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth },
    infoIcon: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginTop: 2 },
    infoLabel: { fontSize: 11 },
    infoValue: { fontSize: FontSizes.sm, fontWeight: FontWeights.medium, marginTop: 2 },
    itemsSection: { marginBottom: Spacing.lg },
    itemsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.sm },
    itemsTitle: { fontSize: FontSizes.sm, fontWeight: FontWeights.semibold },
    itemCard: { borderRadius: 14, overflow: 'hidden', borderWidth: 1, marginBottom: Spacing.sm },
    itemInner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: Spacing.md, gap: Spacing.sm },
    itemName: { fontSize: FontSizes.sm, fontWeight: FontWeights.semibold },
    itemSpec: { fontSize: FontSizes.xs, marginTop: 2 },
    itemQty: { fontSize: FontSizes.xs, fontWeight: FontWeights.semibold },
    itemPrice: { fontSize: FontSizes.xs, fontWeight: FontWeights.semibold },
    itemTotal: { fontSize: FontSizes.xs },
});
