// Purchase Quotations Screen — Glassmorphism + View Modal
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    View, Text, StyleSheet, Pressable, ScrollView,
    Modal, FlatList, ListRenderItem, RefreshControl, Alert,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import {
    ShoppingCart, X, Calendar, Truck, Tag, Percent, FileText,
    ChevronLeft, ChevronRight, RefreshCw, AlertCircle,
    CheckCircle2, Send, Ban, Package, Hash,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';

import { purchaseQuotationApi, PurchaseQuotation, QuotationStatus } from '@/lib/purchase-quotation-api';
import { Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants/Tokens';
import { useThemeStore } from '@/store/theme-store';
import { ThemeColors } from '@/constants/ThemeColors';
import { useDarkDialog } from '@/components/ui/DarkDialog';

// ─── Constants ────────────────────────────────────────────────────────────────
const ACCENT = '#818CF8';
const ACCENT2 = '#6366F1';

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
    DRAFT: { label: 'Nháp', color: '#94A3B8', bg: 'rgba(148,163,184,0.15)' },
    SENT: { label: 'Đã gửi', color: '#3B82F6', bg: 'rgba(59,130,246,0.15)' },
    ACCEPTED: { label: 'Chấp nhận', color: '#10B981', bg: 'rgba(16,185,129,0.15)' },
    REJECTED: { label: 'Từ chối', color: '#EF4444', bg: 'rgba(239,68,68,0.15)' },
    EXPIRED: { label: 'Hết hạn', color: '#F97316', bg: 'rgba(249,115,22,0.15)' },
    CONVERTED: { label: 'Đã đặt hàng', color: '#8B5CF6', bg: 'rgba(139,92,246,0.15)' },
    CANCELLED: { label: 'Đã hủy', color: '#EF4444', bg: 'rgba(239,68,68,0.15)' },
};

const FILTERS = [
    { key: 'all', label: 'Tất cả' },
    { key: 'DRAFT', label: 'Nháp' },
    { key: 'SENT', label: 'Đã gửi' },
    { key: 'ACCEPTED', label: 'Chấp nhận' },
    { key: 'CONVERTED', label: 'Đã đặt hàng' },
];

const fmtCurrency = (n: number) => n.toLocaleString('vi-VN') + 'đ';
const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';

// ─── Status Pill ──────────────────────────────────────────────────────────────
function StatusPill({ status }: { status: string }) {
    const st = STATUS_MAP[status] ?? { label: status, color: '#94A3B8', bg: 'rgba(148,163,184,0.15)' };
    return (
        <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: st.bg }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: st.color }}>{st.label}</Text>
        </View>
    );
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────
function QuoteDetailModal({
    quote, onClose, onUpdate,
}: { quote: PurchaseQuotation; onClose: () => void; onUpdate: (q: PurchaseQuotation) => void }) {
    const { isDark } = useThemeStore();
    const colors = ThemeColors.light;
    const [actionLoading, setActionLoading] = useState(false);
    const st = STATUS_MAP[quote.status] ?? { label: quote.status, color: '#94A3B8', bg: '' };

    const doAction = async (action: () => Promise<PurchaseQuotation>, label: string) => {
        setActionLoading(true);
        try {
            const updated = await action();
            onUpdate(updated);
            Alert.alert('Thành công', `Đã ${label} báo giá`);
        } catch (e: any) {
            Alert.alert('Lỗi', e.response?.data?.message || `Không thể ${label}`);
        } finally {
            setActionLoading(false);
        }
    };

    const infoRows = [
        { Icon: Truck, label: 'Nhà cung cấp', value: quote.Supplier?.name || '—' },
        { Icon: Calendar, label: 'Ngày lập', value: fmtDate(quote.quotationDate) },
        { Icon: Calendar, label: 'Hiệu lực đến', value: fmtDate(quote.validUntil) },
        { Icon: Tag, label: 'Tổng tiền', value: fmtCurrency(Number(quote.totalAmount) || 0) },
        { Icon: Percent, label: 'Chiết khấu', value: fmtCurrency(Number(quote.discount) || 0) },
        { Icon: Percent, label: 'Thuế', value: fmtCurrency(Number(quote.tax) || 0) },
        ...(quote.note ? [{ Icon: FileText, label: 'Ghi chú', value: quote.note }] : []),
        ...(quote.terms ? [{ Icon: AlertCircle, label: 'Điều khoản', value: quote.terms }] : []),
    ];

    return (
        <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <View style={md.container}>
                <LinearGradient colors={colors.gradientColors} style={StyleSheet.absoluteFill} />

                {/* Header */}
                <View style={[md.header, { borderBottomColor: colors.divider }]}>
                    <View>
                        <Text style={[md.headerTitle, { color: colors.textPrimary }]}>Chi tiết báo giá</Text>
                        <Text style={[md.headerSub, { color: colors.textMuted }]}>{quote.quotationNumber}</Text>
                    </View>
                    <Pressable onPress={onClose} style={[md.closeBtn, { backgroundColor: colors.inputBg }]}>
                        <X size={20} color={colors.textSecondary} />
                    </Pressable>
                </View>

                <ScrollView contentContainerStyle={md.scroll} showsVerticalScrollIndicator={false}>
                    {/* Hero */}
                    <Animated.View entering={FadeInDown.duration(400).springify().damping(18)} style={md.heroWrap}>
                        <LinearGradient colors={[st.color + '33', st.color + '11']} style={md.heroBg}>
                            <ShoppingCart size={36} color={st.color} strokeWidth={1.5} />
                        </LinearGradient>
                        <View style={[md.heroBadge, { backgroundColor: st.bg }]}>
                            <Text style={[md.heroStatus, { color: st.color }]}>{st.label}</Text>
                        </View>
                        <Text style={[md.heroAmount, { color: colors.textPrimary }]}>
                            {fmtCurrency(Number(quote.totalAmount) || 0)}
                        </Text>
                        <Text style={[md.heroSub, { color: colors.textMuted }]}>{quote.Supplier?.name || '—'}</Text>
                    </Animated.View>

                    {/* Info rows */}
                    <Animated.View entering={FadeInUp.duration(400).delay(100).springify().damping(18)}
                        style={[md.infoSection, { borderColor: colors.cardBorder }]}>
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
                    {quote.PurchaseQuotationItem && quote.PurchaseQuotationItem.length > 0 && (
                        <Animated.View entering={FadeInUp.duration(400).delay(180).springify().damping(18)} style={md.itemsSection}>
                            <View style={md.itemsHeader}>
                                <Package size={16} color={ACCENT} />
                                <Text style={[md.itemsTitle, { color: colors.textPrimary }]}>
                                    Sản phẩm yêu cầu ({quote.PurchaseQuotationItem.length})
                                </Text>
                            </View>
                            {quote.PurchaseQuotationItem.map((item, i) => (
                                <View key={item.id || i} style={[md.itemCard, { borderColor: colors.cardBorder }]}>
                                    <BlurView intensity={18} tint={colors.blurTint} style={StyleSheet.absoluteFill} />
                                    <View style={[md.itemInner, { backgroundColor: colors.cardBg }]}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[md.itemName, { color: colors.textPrimary }]} numberOfLines={1}>
                                                {item.Product?.name || item.Product?.name || 'N/A'}
                                            </Text>
                                            <Text style={[md.itemSpec, { color: colors.textMuted }]}>
                                                {item.Product?.name || item.Product?.code || item.productId}
                                            </Text>
                                        </View>
                                        <View style={{ alignItems: 'flex-end', gap: 2 }}>
                                            <Text style={[md.itemQty, { color: ACCENT }]}>SL: {Number(item.quantity)}</Text>
                                            <Text style={[md.itemPrice, { color: '#34D399' }]}>{fmtCurrency(Number(item.unitPrice))}/đv</Text>
                                            <Text style={[md.itemTotal, { color: colors.textMuted }]}>{fmtCurrency(Number(item.amount))}</Text>
                                        </View>
                                    </View>
                                </View>
                            ))}
                        </Animated.View>
                    )}

                    {/* Actions */}
                    <Animated.View entering={FadeInUp.duration(400).delay(240).springify().damping(18)} style={md.actions}>
                        {quote.status === 'DRAFT' && (
                            <Pressable disabled={actionLoading}
                                style={[md.actionBtn, { backgroundColor: 'rgba(59,130,246,0.15)', borderColor: 'rgba(59,130,246,0.4)' }]}
                                onPress={() => doAction(() => purchaseQuotationApi.send(quote.id), 'gửi')}>
                                <Send size={16} color="#93C5FD" />
                                <Text style={[md.actionBtnT, { color: '#93C5FD' }]}>Gửi yêu cầu báo giá</Text>
                            </Pressable>
                        )}
                        {quote.status === 'SENT' && (
                            <>
                                <Pressable disabled={actionLoading}
                                    style={[md.actionBtn, { backgroundColor: 'rgba(16,185,129,0.15)', borderColor: 'rgba(16,185,129,0.4)' }]}
                                    onPress={() => doAction(() => purchaseQuotationApi.accept(quote.id), 'chấp nhận')}>
                                    <CheckCircle2 size={16} color="#34D399" />
                                    <Text style={[md.actionBtnT, { color: '#34D399' }]}>Chấp nhận</Text>
                                </Pressable>
                                <Pressable disabled={actionLoading}
                                    style={[md.actionBtn, { backgroundColor: 'rgba(239,68,68,0.15)', borderColor: 'rgba(239,68,68,0.4)' }]}
                                    onPress={() => doAction(() => purchaseQuotationApi.reject(quote.id), 'từ chối')}>
                                    <Ban size={16} color="#F87171" />
                                    <Text style={[md.actionBtnT, { color: '#F87171' }]}>Từ chối</Text>
                                </Pressable>
                            </>
                        )}
                        {quote.status === 'ACCEPTED' && (
                            <Pressable disabled={actionLoading}
                                style={[md.actionBtn, { backgroundColor: 'rgba(139,92,246,0.15)', borderColor: 'rgba(139,92,246,0.4)' }]}
                                onPress={() => doAction(() => purchaseQuotationApi.convert(quote.id), 'chuyển thành đơn mua')}>
                                <ChevronRight size={16} color="#A78BFA" />
                                <Text style={[md.actionBtnT, { color: '#A78BFA' }]}>Tạo đơn mua hàng</Text>
                            </Pressable>
                        )}
                    </Animated.View>

                    <View style={{ height: 60 }} />
                </ScrollView>
            </View>
        </Modal>
    );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function PurchaseQuotationsScreen() {
    const router = useRouter();
    const { isDark } = useThemeStore();
    const colors = ThemeColors.light;
    const [data, setData] = useState<PurchaseQuotation[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState('all');
    const [selected, setSelected] = useState<PurchaseQuotation | null>(null);
    const { showDialog, DialogComponent } = useDarkDialog();

    useEffect(() => { load(); }, []);

    const load = async () => {
        try {
            setLoading(true);
            const d = await purchaseQuotationApi.getAll();
            setData(Array.isArray(d) ? d : []);
        } catch (e: any) {
            showDialog('Lỗi', e.response?.data?.message || 'Không thể tải báo giá');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const filtered = useMemo(
        () => filter === 'all' ? data : data.filter(q => q.status === filter),
        [data, filter]
    );

    const counts = useMemo(() => {
        const c: Record<string, number> = { all: data.length };
        data.forEach(q => { c[q.status] = (c[q.status] || 0) + 1; });
        return c;
    }, [data]);

    const handleUpdate = useCallback((updated: PurchaseQuotation) => {
        setData(prev => prev.map(q => q.id === updated.id ? updated : q));
        setSelected(updated);
    }, []);

    const renderItem: ListRenderItem<PurchaseQuotation> = useCallback(({ item: q, index: i }) => {
        const st = STATUS_MAP[q.status] ?? { label: q.status, color: '#94A3B8', bg: '' };
        return (
            <Animated.View entering={FadeInUp.duration(300).delay(Math.min(i, 8) * 35).springify().damping(18)}>
                <Pressable onPress={() => setSelected(q)} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
                    <View style={[s.card, { borderColor: colors.cardBorder }]}>
                        <BlurView intensity={20} tint={colors.blurTint} style={StyleSheet.absoluteFill} />
                        <View style={[s.cardInner, { backgroundColor: colors.cardBg }]}>
                            {/* Top */}
                            <View style={s.cardTop}>
                                <View style={[s.numBadge, { backgroundColor: isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.1)' }]}>
                                    <Text style={[s.numText, { color: ACCENT }]} numberOfLines={1}>{q.quotationNumber}</Text>
                                </View>
                                <StatusPill status={q.status} />
                            </View>

                            {/* Supplier */}
                            <View style={s.infoRow}>
                                <Truck size={13} color={colors.textMuted} />
                                <Text style={[s.infoText, { color: colors.textMuted }]} numberOfLines={1}>{q.Supplier?.name || '—'}</Text>
                            </View>

                            {/* Items */}
                            {q.PurchaseQuotationItem && q.PurchaseQuotationItem.length > 0 && (
                                <View style={s.infoRow}>
                                    <Package size={13} color={colors.textMuted} />
                                    <Text style={[s.infoText, { color: colors.textMuted }]}>{q.PurchaseQuotationItem.length} sản phẩm</Text>
                                </View>
                            )}

                            {/* Bottom */}
                            <View style={s.cardBottom}>
                                <View style={s.infoRow}>
                                    <Calendar size={13} color={colors.textMuted} />
                                    <Text style={[s.infoText, { color: colors.textMuted }]}>{fmtDate(q.quotationDate)}</Text>
                                </View>
                                <View style={s.amtRow}>
                                    <Text style={[s.amt, { color: ACCENT }]}>{fmtCurrency(Number(q.totalAmount) || 0)}</Text>
                                    <ChevronRight size={14} color={colors.textMuted} />
                                </View>
                            </View>
                        </View>
                    </View>
                </Pressable>
            </Animated.View>
        );
    }, [colors, isDark]);

    const keyExtractor = useCallback((item: PurchaseQuotation) => item.id, []);

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
                            <LinearGradient colors={[ACCENT2, ACCENT]} style={s.iconGrad}>
                                <ShoppingCart size={20} color="#fff" strokeWidth={2} />
                            </LinearGradient>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[s.title, { color: colors.textPrimary }]}>Báo giá mua hàng</Text>
                            <Text style={[s.sub, { color: colors.textMuted }]}>{data.length} yêu cầu báo giá</Text>
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
                                        {(counts[f.key] ?? 0) > 0 && (
                                            <View style={[s.chipCount, { backgroundColor: active ? activeColor + '30' : 'rgba(255,255,255,0.06)' }]}>
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
                            <ShoppingCart size={44} color={colors.textMuted} strokeWidth={1.5} />
                            <Text style={[s.emptyT, { color: colors.textMuted }]}>Không có yêu cầu báo giá</Text>
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
                            ListFooterComponent={<View style={{ height: 100 }} />}
                        />
                    )}
                </SafeAreaView>
                {DialogComponent}
            </View>

            {selected && (
                <QuoteDetailModal
                    quote={selected}
                    onClose={() => setSelected(null)}
                    onUpdate={handleUpdate}
                />
            )}
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
    numBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, maxWidth: '60%' },
    numText: { fontSize: FontSizes.sm, fontWeight: FontWeights.bold },
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
        paddingHorizontal: Spacing.xl, paddingTop: 50, paddingBottom: Spacing.lg, borderBottomWidth: 1,
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
    infoSection: { borderRadius: 18, overflow: 'hidden', marginBottom: Spacing.lg, borderWidth: 1 },
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
    actions: { gap: Spacing.sm, marginBottom: Spacing.xl },
    actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: Spacing.md, borderRadius: 14, borderWidth: 1 },
    actionBtnT: { fontSize: FontSizes.sm, fontWeight: FontWeights.semibold },
});
