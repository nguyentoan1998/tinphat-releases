// Production Plans Screen — Glassmorphism + FlatList + Modal + Search + Customer Filter
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Modal, FlatList, ListRenderItem, RefreshControl, TextInput } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import { CalendarRange, ChevronLeft, RefreshCw, Calendar, X, ChevronRight, Hash, FileText, Search, User, Package, ShoppingCart, Building2 } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';

import { productionPlanApi, ProductionPlan } from '@/lib/production-plan-api';
import { customerApi, Customer } from '@/lib/customer-api';
import { Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants/Tokens';
import { useThemeStore } from '@/store';
import { ThemeColors } from '@/constants/ThemeColors';
import { useDarkDialog } from '@/components/ui/DarkDialog';

const ACCENT = '#6366F1';
const ACCENT2 = '#818CF8';

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
    PENDING: { label: 'Chờ duyệt', color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' },
    DRAFT: { label: 'Nháp', color: '#94A3B8', bg: 'rgba(148,163,184,0.15)' },
    APPROVED: { label: 'Đã duyệt', color: '#3B82F6', bg: 'rgba(59,130,246,0.15)' },
    CONFIRMED: { label: 'Xác nhận', color: '#3B82F6', bg: 'rgba(59,130,246,0.15)' },
    IN_PROGRESS: { label: 'Đang SX', color: '#6366F1', bg: 'rgba(99,102,241,0.15)' },
    COMPLETED: { label: 'Hoàn thành', color: '#10B981', bg: 'rgba(16,185,129,0.15)' },
    CANCELLED: { label: 'Đã hủy', color: '#EF4444', bg: 'rgba(239,68,68,0.15)' },
};

const FILTERS = [
    { key: 'all', label: 'Tất cả' },
    { key: 'PENDING', label: 'Chờ duyệt' },
    { key: 'IN_PROGRESS', label: 'Đang SX' },
    { key: 'COMPLETED', label: 'Hoàn thành' },
    { key: 'CANCELLED', label: 'Đã hủy' },
];

const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';

function StatusPill({ status }: { status: string }) {
    const st = STATUS_MAP[status] ?? { label: status, color: '#94A3B8', bg: 'rgba(148,163,184,0.15)' };
    return (
        <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: st.bg }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: st.color }}>{st.label}</Text>
        </View>
    );
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────
function PlanDetailModal({ plan: p, onClose }: { plan: ProductionPlan; onClose: () => void }) {
    const { isDark } = useThemeStore();
    const colors = ThemeColors.light;
    const st = STATUS_MAP[p.status] ?? { label: p.status, color: '#94A3B8', bg: '' };

    const rows = [
        { Icon: Hash, label: 'Số kế hoạch', value: p.planNumber },
        { Icon: Calendar, label: 'Tháng/Năm', value: `Tháng ${p.month}/${p.year}` },
        { Icon: Calendar, label: 'Ngày lập', value: fmtDate(p.planDate) },
        { Icon: Calendar, label: 'Bắt đầu', value: fmtDate(p.startDate) },
        { Icon: Calendar, label: 'Kết thúc', value: fmtDate(p.endDate) },
        ...(p.Order ? [{ Icon: ShoppingCart, label: 'Đơn hàng', value: p.Order.orderNumber }] : []),
    ];

    return (
        <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <View style={{ flex: 1 }}>
                <LinearGradient colors={colors.gradientColors} style={StyleSheet.absoluteFill} />
                <View style={[md.header, { borderBottomColor: colors.divider }]}>
                    <View>
                        <Text style={[md.title, { color: colors.textPrimary }]}>Chi tiết kế hoạch SX</Text>
                        <Text style={[md.sub, { color: colors.textMuted }]}>{p.planNumber}</Text>
                    </View>
                    <Pressable onPress={onClose} style={[md.closeBtn, { backgroundColor: colors.inputBg }]}>
                        <X size={20} color={colors.textSecondary} />
                    </Pressable>
                </View>
                <ScrollView contentContainerStyle={md.scroll} showsVerticalScrollIndicator={false}>
                    {/* Hero */}
                    <Animated.View entering={FadeInDown.duration(400).springify().damping(18)}
                        style={{ alignItems: 'center', paddingVertical: Spacing.xl, gap: 10 }}>
                        <LinearGradient colors={[st.color + '33', st.color + '11']} style={md.heroBg}>
                            <CalendarRange size={36} color={st.color} strokeWidth={1.5} />
                        </LinearGradient>
                        <View style={{ paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, backgroundColor: st.bg }}>
                            <Text style={{ fontSize: FontSizes.sm, fontWeight: FontWeights.bold, color: st.color }}>{st.label}</Text>
                        </View>
                        <Text style={{ fontSize: 22, fontWeight: FontWeights.bold, color: colors.textPrimary }}>
                            Tháng {p.month}/{p.year}
                        </Text>
                        <Text style={{ fontSize: FontSizes.sm, color: colors.textMuted }}>{p.planNumber}</Text>
                    </Animated.View>

                    {/* Info rows */}
                    <Animated.View entering={FadeInUp.duration(400).delay(100).springify().damping(18)}
                        style={[md.infoSection, { borderColor: colors.cardBorder }]}>
                        {rows.map(({ Icon, label, value }, i) => (
                            <View key={i} style={[md.infoRow, { borderBottomColor: colors.divider }]}>
                                <View style={[md.infoIcon, { backgroundColor: isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.08)' }]}>
                                    <Icon size={15} color={ACCENT} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 11, color: colors.textMuted }}>{label}</Text>
                                    <Text style={{ fontSize: FontSizes.sm, fontWeight: FontWeights.medium, marginTop: 2, color: colors.textPrimary }}>{value}</Text>
                                </View>
                            </View>
                        ))}
                    </Animated.View>

                    {/* Production orders */}
                    {p.ProductionOrder && p.ProductionOrder.length > 0 && (
                        <Animated.View entering={FadeInUp.duration(400).delay(180).springify().damping(18)} style={{ marginBottom: Spacing.lg }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.sm }}>
                                <Package size={16} color={ACCENT} />
                                <Text style={{ fontSize: FontSizes.sm, fontWeight: FontWeights.semibold, color: colors.textPrimary }}>
                                    Lệnh sản xuất ({p.ProductionOrder.length})
                                </Text>
                            </View>
                            {p.ProductionOrder.map((order: any, i: number) => (
                                <View key={order.id || i} style={[md.itemCard, { borderColor: colors.cardBorder }]}>
                                    <BlurView intensity={18} tint={colors.blurTint} style={StyleSheet.absoluteFill} />
                                    <View style={[md.itemInner, { backgroundColor: colors.cardBg }]}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ fontSize: FontSizes.sm, fontWeight: FontWeights.semibold, color: colors.textPrimary }} numberOfLines={1}>
                                                {order.orderNumber || order.id || `Lệnh #${i + 1}`}
                                            </Text>
                                            {order.status && (
                                                <Text style={{ fontSize: FontSizes.xs, marginTop: 2, color: colors.textMuted }}>{STATUS_MAP[order.status]?.label || order.status}</Text>
                                            )}
                                        </View>
                                        {order.quantity && (
                                            <Text style={{ fontSize: FontSizes.xs, fontWeight: FontWeights.semibold, color: ACCENT }}>SL: {order.quantity}</Text>
                                        )}
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
export default function ProductionPlansScreen() {
    const router = useRouter();
    const [plans, setPlans] = useState<ProductionPlan[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selected, setSelected] = useState<ProductionPlan | null>(null);
    const [statusFilter, setStatusFilter] = useState('all');
    const [customerFilter, setCustomerFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const { isDark } = useThemeStore();
    const colors = ThemeColors.light;
    const { showDialog, DialogComponent } = useDarkDialog();

    useEffect(() => { load(); }, []);

    useEffect(() => {
        if (searchTimer.current) clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => setDebouncedSearch(search), 300);
        return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
    }, [search]);

    const load = async () => {
        try {
            setLoading(true);
            const [planRes, custRes] = await Promise.all([
                productionPlanApi.getPlans().catch(() => []),
                customerApi.getAll().catch(() => null),
            ]);
            const planList: ProductionPlan[] = Array.isArray(planRes) ? planRes
                : (planRes as any)?.data ?? (planRes as any)?.items ?? [];
            setPlans(planList);

            let custList: Customer[] = [];
            if (custRes) {
                custList = Array.isArray(custRes) ? custRes
                    : (custRes as any)?.data ?? (custRes as any)?.items ?? [];
            }
            // Fallback: build customer list from Order?.Customer embedded in plans
            if (custList.length === 0) {
                const seen = new Set<string>();
                planList.forEach((p: any) => {
                    const c = p.Order?.Customer;
                    if (c && !seen.has(c.id)) { seen.add(c.id); custList.push(c); }
                });
            }
            setCustomers(custList);
        } catch (e: any) {
            showDialog('Lỗi', e.response?.data?.message || 'Không thể tải kế hoạch');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const filtered = useMemo(() => {
        let result = plans;
        if (statusFilter !== 'all') result = result.filter(p => p.status === statusFilter);
        if (customerFilter !== 'all') {
            result = result.filter((p: any) => p.Order?.Customer?.id === customerFilter || p.customerId === customerFilter);
        }
        const q = debouncedSearch.trim().toLowerCase();
        if (q) {
            result = result.filter(p =>
                p.planNumber?.toLowerCase().includes(q) ||
                p.Order?.orderNumber?.toLowerCase().includes(q) ||
                String(p.month).includes(q) ||
                String(p.year).includes(q)
            );
        }
        return result;
    }, [plans, statusFilter, customerFilter, debouncedSearch]);

    const statusCounts = useMemo(() => {
        const c: Record<string, number> = { all: plans.length };
        plans.forEach(p => { c[p.status] = (c[p.status] || 0) + 1; });
        return c;
    }, [plans]);

    const renderItem: ListRenderItem<ProductionPlan> = useCallback(({ item: p, index: i }) => (
        <Animated.View entering={FadeInUp.duration(300).delay(Math.min(i, 8) * 35).springify().damping(18)}>
            <Pressable onPress={() => setSelected(p)} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
                <View style={[s.card, { borderColor: colors.cardBorder }]}>
                    <BlurView intensity={20} tint={colors.blurTint} style={StyleSheet.absoluteFill} />
                    <View style={[s.cardInner, { backgroundColor: colors.cardBg }]}>
                        <View style={s.cardTop}>
                            <View style={[s.numBadge, { backgroundColor: isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.1)' }]}>
                                <Text style={[s.numText, { color: ACCENT }]} numberOfLines={1}>{p.planNumber}</Text>
                            </View>
                            <StatusPill status={p.status} />
                        </View>
                        <View style={s.infoRow}>
                            <Calendar size={13} color={colors.textMuted} />
                            <Text style={[s.infoText, { color: colors.textMuted }]}>Tháng {p.month}/{p.year}</Text>
                        </View>
                        {p.Order && (
                            <View style={s.infoRow}>
                                <ShoppingCart size={13} color={colors.textMuted} />
                                <Text style={[s.infoText, { color: colors.textMuted }]} numberOfLines={1}>{p.Order.orderNumber}</Text>
                            </View>
                        )}
                        {p.ProductionOrder && p.ProductionOrder.length > 0 && (
                            <View style={s.infoRow}>
                                <Package size={13} color={colors.textMuted} />
                                <Text style={[s.infoText, { color: colors.textMuted }]}>{p.ProductionOrder.length} lệnh SX</Text>
                            </View>
                        )}
                        <View style={s.cardBottom}>
                            <View style={s.infoRow}>
                                <Calendar size={13} color={colors.textMuted} />
                                <Text style={[s.infoText, { color: colors.textMuted }]}>{fmtDate(p.startDate)} → {fmtDate(p.endDate)}</Text>
                            </View>
                            <ChevronRight size={14} color={colors.textMuted} />
                        </View>
                    </View>
                </View>
            </Pressable>
        </Animated.View>
    ), [colors, isDark]);

    return (
        <>
            <View style={{ flex: 1 }}>
                <StatusBar style={isDark ? 'light' : 'dark'} />
                <LinearGradient colors={colors.gradientColors} style={StyleSheet.absoluteFill} />
                <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                    {/* Header */}
                    <Animated.View entering={FadeInDown.duration(400)} style={s.header}>
                        <Pressable style={[s.iconBtn, { backgroundColor: colors.inputBg }]} onPress={() => router.replace('/(tabs)/production')}>
                            <ChevronLeft size={20} color={colors.textSecondary} />
                        </Pressable>
                        <View style={s.headerIcon}>
                            <LinearGradient colors={[ACCENT, ACCENT2]} style={s.iconGrad}>
                                <CalendarRange size={20} color="#fff" strokeWidth={2} />
                            </LinearGradient>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[s.titleT, { color: colors.textPrimary }]}>Kế hoạch SX</Text>
                            <Text style={[s.subT, { color: colors.textMuted }]}>{filtered.length}/{plans.length} kế hoạch</Text>
                        </View>
                        <Pressable style={[s.iconBtn, { backgroundColor: colors.inputBg }]} onPress={() => { setRefreshing(true); load(); }}>
                            <RefreshCw size={16} color={colors.textSecondary} />
                        </Pressable>
                    </Animated.View>

                    {/* Search */}
                    <Animated.View entering={FadeInDown.duration(400).delay(50)}
                        style={[s.searchWrap, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder }]}>
                        <Search size={16} color={colors.textMuted} />
                        <TextInput
                            style={[s.searchInput, { color: colors.textPrimary }]}
                            placeholder="Tìm số kế hoạch, đơn hàng..."
                            placeholderTextColor={colors.textMuted}
                            value={search}
                            onChangeText={setSearch}
                            returnKeyType="search"
                        />
                        {search.length > 0 && (
                            <Pressable onPress={() => { setSearch(''); setDebouncedSearch(''); }}>
                                <X size={16} color={colors.textMuted} />
                            </Pressable>
                        )}
                    </Animated.View>

                    {/* Status filter chips */}
                    <Animated.View entering={FadeInDown.duration(400).delay(70)}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ paddingHorizontal: Spacing.xl, paddingBottom: 4, gap: 8, flexDirection: 'row' }}>
                            {FILTERS.map(f => {
                                const active = statusFilter === f.key;
                                const st = STATUS_MAP[f.key];
                                const ac = st?.color || ACCENT;
                                return (
                                    <Pressable key={f.key} onPress={() => setStatusFilter(f.key)}
                                        style={[s.chip, { borderColor: active ? ac : colors.cardBorder, backgroundColor: active ? ac + '20' : colors.inputBg }]}>
                                        <Text style={[s.chipT, { color: active ? ac : colors.textMuted, fontWeight: active ? FontWeights.semibold : FontWeights.regular }]}>{f.label}</Text>
                                        {(statusCounts[f.key] ?? 0) > 0 && (
                                            <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, backgroundColor: active ? ac + '30' : 'rgba(255,255,255,0.06)' }}>
                                                <Text style={{ fontSize: 10, fontWeight: FontWeights.bold, color: active ? ac : colors.textMuted }}>{statusCounts[f.key]}</Text>
                                            </View>
                                        )}
                                    </Pressable>
                                );
                            })}
                        </ScrollView>
                    </Animated.View>

                    {/* Customer filter chips */}
                    {customers.length > 0 && (
                        <Animated.View entering={FadeInDown.duration(400).delay(100)}>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}
                                contentContainerStyle={{ paddingHorizontal: Spacing.xl, paddingBottom: Spacing.sm, gap: 8, flexDirection: 'row', marginTop: 6 }}>
                                <Pressable onPress={() => setCustomerFilter('all')}
                                    style={[s.chip, { borderColor: customerFilter === 'all' ? ACCENT : colors.cardBorder, backgroundColor: customerFilter === 'all' ? ACCENT + '20' : colors.inputBg }]}>
                                    <Text style={[s.chipT, { color: customerFilter === 'all' ? ACCENT : colors.textMuted, fontWeight: customerFilter === 'all' ? FontWeights.semibold : FontWeights.regular }]}>
                                        Tất cả KH
                                    </Text>
                                </Pressable>
                                {customers.map(c => {
                                    const active = customerFilter === c.id;
                                    return (
                                        <Pressable key={c.id} onPress={() => setCustomerFilter(c.id)}
                                            style={[s.chip, { borderColor: active ? ACCENT : colors.cardBorder, backgroundColor: active ? ACCENT + '20' : colors.inputBg }]}>
                                            <User size={12} color={active ? ACCENT : colors.textMuted} />
                                            <Text style={[s.chipT, { color: active ? ACCENT : colors.textMuted, fontWeight: active ? FontWeights.semibold : FontWeights.regular }]}>
                                                {c.name}
                                            </Text>
                                        </Pressable>
                                    );
                                })}
                            </ScrollView>
                        </Animated.View>
                    )}

                    {/* List */}
                    {loading ? (
                        <View style={{ alignItems: 'center', paddingVertical: 70 }}>
                            <Text style={{ fontSize: FontSizes.base, color: colors.textMuted }}>Đang tải...</Text>
                        </View>
                    ) : filtered.length === 0 ? (
                        <View style={{ alignItems: 'center', paddingVertical: 70, gap: Spacing.md }}>
                            <CalendarRange size={44} color={colors.textMuted} strokeWidth={1.5} />
                            <Text style={{ fontSize: FontSizes.base, color: colors.textMuted }}>
                                {search || statusFilter !== 'all' || customerFilter !== 'all' ? 'Không tìm thấy kế hoạch' : 'Không có kế hoạch SX'}
                            </Text>
                        </View>
                    ) : (
                        <FlatList
                            data={filtered}
                            keyExtractor={(item) => item.id}
                            renderItem={renderItem}
                            contentContainerStyle={{ paddingHorizontal: Spacing.xl, gap: Spacing.md }}
                            showsVerticalScrollIndicator={false}
                            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={ACCENT} />}
                            removeClippedSubviews
                            initialNumToRender={10}
                            ListFooterComponent={<View style={{ height: 100 }} />}
                        />
                    )}
                </SafeAreaView>
                {DialogComponent}
            </View>
            {selected && <PlanDetailModal plan={selected} onClose={() => setSelected(null)} />}
        </>
    );
}

const s = StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
    iconBtn: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    headerIcon: { marginRight: 4 },
    iconGrad: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    titleT: { fontSize: FontSizes.lg, fontWeight: FontWeights.bold },
    subT: { fontSize: FontSizes.xs, marginTop: 1 },
    searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: Spacing.xl, marginBottom: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: 10, borderRadius: 14, borderWidth: 1 },
    searchInput: { flex: 1, fontSize: FontSizes.sm, padding: 0 },
    chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: BorderRadius.full, borderWidth: 1 },
    chipT: { fontSize: FontSizes.xs },
    card: { borderRadius: 18, overflow: 'hidden', borderWidth: 1 },
    cardInner: { padding: Spacing.md, gap: 8 },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    numBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, maxWidth: '60%' },
    numText: { fontSize: FontSizes.sm, fontWeight: FontWeights.bold },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    infoText: { fontSize: FontSizes.xs, flex: 1 },
    cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
});

const md = StyleSheet.create({
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: Spacing.xl, paddingTop: 50, paddingBottom: Spacing.lg, borderBottomWidth: 1 },
    title: { fontSize: FontSizes.xl, fontWeight: FontWeights.bold },
    sub: { fontSize: FontSizes.xs, marginTop: 2 },
    closeBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    scroll: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.md },
    heroBg: { width: 80, height: 80, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
    infoSection: { borderRadius: 18, overflow: 'hidden', marginBottom: Spacing.lg, borderWidth: 1 },
    infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth },
    infoIcon: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginTop: 2 },
    itemCard: { borderRadius: 14, overflow: 'hidden', borderWidth: 1, marginBottom: Spacing.sm },
    itemInner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.md, gap: Spacing.sm },
});
