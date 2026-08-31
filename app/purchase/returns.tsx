// Purchase Returns Screen — Glassmorphism + View Modal + Search + Supplier Filter
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Modal, FlatList, ListRenderItem, RefreshControl, TextInput } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import { RotateCcw, ChevronLeft, RefreshCw, Calendar, Truck, X, ChevronRight, Hash, FileText, Search, Package, Building2 } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';

import { purchaseReturnApi, PurchaseReturn } from '@/lib/purchase-return-api';
import { supplierApi, Supplier } from '@/lib/supplier-api';
import { Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants/Tokens';
import { useThemeStore } from '@/store';
import { ThemeColors } from '@/constants/ThemeColors';
import PaginationFooter from '@/components/ui/PaginationFooter';
import { useDarkDialog } from '@/components/ui/DarkDialog';

const ACCENT = '#F59E0B';
const ACCENT2 = '#FBBF24';

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
    PENDING: { label: 'Chờ xử lý', color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' },
    APPROVED: { label: 'Đã duyệt', color: '#3B82F6', bg: 'rgba(59,130,246,0.15)' },
    COMPLETED: { label: 'Hoàn thành', color: '#10B981', bg: 'rgba(16,185,129,0.15)' },
    CANCELLED: { label: 'Đã hủy', color: '#EF4444', bg: 'rgba(239,68,68,0.15)' },
};

const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';
const fmtCurrency = (n: number) => n.toLocaleString('vi-VN') + 'đ';

function StatusPill({ status }: { status: string }) {
    const st = STATUS_MAP[status] ?? { label: status, color: '#94A3B8', bg: 'rgba(148,163,184,0.15)' };
    return <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: st.bg }}><Text style={{ fontSize: 11, fontWeight: '700', color: st.color }}>{st.label}</Text></View>;
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────
function ReturnDetailModal({ ret: r, onClose }: { ret: PurchaseReturn; onClose: () => void }) {
    const { isDark } = useThemeStore();
    const colors = ThemeColors.light;
    const st = STATUS_MAP[r.status] ?? { label: r.status, color: '#94A3B8', bg: '' };
    const rows = [
        { Icon: Hash, label: 'Số phiếu', value: r.returnNumber },
        { Icon: Truck, label: 'Nhà cung cấp', value: r.Supplier?.name || '—' },
        { Icon: Calendar, label: 'Ngày trả', value: fmtDate(r.returnDate) },
        ...(r.totalAmount ? [{ Icon: Package, label: 'Tổng tiền', value: fmtCurrency(Number(r.totalAmount)) }] : []),
        ...(r.note ? [{ Icon: FileText, label: 'Ghi chú', value: r.note }] : []),
    ];
    return (
        <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <View style={{ flex: 1 }}>
                <LinearGradient colors={colors.gradientColors} style={StyleSheet.absoluteFill} />
                <View style={[md.header, { borderBottomColor: colors.divider }]}>
                    <View>
                        <Text style={[md.title, { color: colors.textPrimary }]}>Chi tiết phiếu trả hàng</Text>
                        <Text style={[md.sub, { color: colors.textMuted }]}>{r.returnNumber}</Text>
                    </View>
                    <Pressable onPress={onClose} style={[md.closeBtn, { backgroundColor: colors.inputBg }]}>
                        <X size={20} color={colors.textSecondary} />
                    </Pressable>
                </View>
                <ScrollView contentContainerStyle={md.scroll} showsVerticalScrollIndicator={false}>
                    <Animated.View entering={FadeInDown.duration(400).springify().damping(18)} style={{ alignItems: 'center', paddingVertical: Spacing.xl, gap: 10 }}>
                        <LinearGradient colors={[st.color + '33', st.color + '11']} style={md.heroBg}>
                            <RotateCcw size={36} color={st.color} strokeWidth={1.5} />
                        </LinearGradient>
                        <View style={{ paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, backgroundColor: st.bg }}>
                            <Text style={{ fontSize: FontSizes.sm, fontWeight: FontWeights.bold, color: st.color }}>{st.label}</Text>
                        </View>
                        <Text style={{ fontSize: FontSizes.sm, color: colors.textMuted }}>{r.Supplier?.name || '—'}</Text>
                    </Animated.View>

                    <Animated.View entering={FadeInUp.duration(400).delay(100).springify().damping(18)}
                        style={[md.infoSection, { borderColor: colors.cardBorder }]}>
                        {rows.map(({ Icon, label, value }, i) => (
                            <View key={i} style={[md.infoRow, { borderBottomColor: colors.divider }]}>
                                <View style={[md.infoIcon, { backgroundColor: isDark ? 'rgba(245,158,11,0.15)' : 'rgba(245,158,11,0.08)' }]}>
                                    <Icon size={15} color={ACCENT} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 11, color: colors.textMuted }}>{label}</Text>
                                    <Text style={{ fontSize: FontSizes.sm, fontWeight: FontWeights.medium, marginTop: 2, color: colors.textPrimary }}>{value}</Text>
                                </View>
                            </View>
                        ))}
                    </Animated.View>

                    {r.PurchaseReturnItem && r.PurchaseReturnItem.length > 0 && (
                        <Animated.View entering={FadeInUp.duration(400).delay(180).springify().damping(18)} style={{ marginBottom: Spacing.lg }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.sm }}>
                                <Package size={16} color={ACCENT} />
                                <Text style={{ fontSize: FontSizes.sm, fontWeight: FontWeights.semibold, color: colors.textPrimary }}>
                                    Hàng trả ({r.PurchaseReturnItem.length})
                                </Text>
                            </View>
                            {r.PurchaseReturnItem.map((item: any, i: number) => (
                                <View key={item.id || i} style={[md.itemCard, { borderColor: colors.cardBorder }]}>
                                    <BlurView intensity={18} tint={colors.blurTint} style={StyleSheet.absoluteFill} />
                                    <View style={[md.itemInner, { backgroundColor: colors.cardBg }]}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ fontSize: FontSizes.sm, fontWeight: FontWeights.semibold, color: colors.textPrimary }} numberOfLines={1}>
                                                {item.Product?.name || item.Product?.name || 'N/A'}
                                            </Text>
                                            <Text style={{ fontSize: FontSizes.xs, marginTop: 2, color: colors.textMuted }}>
                                                {item.Product?.name || item.productId}
                                            </Text>
                                        </View>
                                        <View style={{ alignItems: 'flex-end', gap: 2 }}>
                                            <Text style={{ fontSize: FontSizes.xs, fontWeight: FontWeights.semibold, color: ACCENT }}>SL: {item.quantity}</Text>
                                            {item.unitPrice > 0 && <Text style={{ fontSize: FontSizes.xs, color: '#34D399' }}>{fmtCurrency(item.unitPrice)}/đv</Text>}
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
export default function PurchaseReturnsScreen() {
    const router = useRouter();
    const [returns, setReturns] = useState<PurchaseReturn[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selected, setSelected] = useState<PurchaseReturn | null>(null);
    const [search, setSearch] = useState('');
    const [supplierFilter, setSupplierFilter] = useState('all');
    const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [debouncedSearch, setDebouncedSearch] = useState('');
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
            const [retRes, supRes] = await Promise.all([
                purchaseReturnApi.getReturns().catch(() => []),
                supplierApi.getAll().catch(() => null),
            ]);
            const retList: PurchaseReturn[] = Array.isArray(retRes) ? retRes
                : (retRes as any)?.data ?? (retRes as any)?.items ?? [];
            setReturns(retList);

            // unwrap paginated supplier response
            let supList: Supplier[] = [];
            if (supRes) {
                supList = Array.isArray(supRes) ? supRes
                    : (supRes as any)?.data ?? (supRes as any)?.items ?? [];
            }
            // Fallback: build supplier list from Supplier objects embedded in returns
            if (supList.length === 0) {
                const seen = new Set<string>();
                retList.forEach(r => {
                    if (r.Supplier && !seen.has(r.Supplier.id)) {
                        seen.add(r.Supplier.id);
                        supList.push(r.Supplier as any);
                    }
                });
            }
            setSuppliers(supList);
        } catch (e: any) {
            showDialog('Lỗi', e.response?.data?.message || 'Không thể tải trả hàng mua');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const filtered = useMemo(() => {
        let result = returns;
        if (supplierFilter !== 'all') {
            result = result.filter(r => r.supplierId === supplierFilter);
        }
        const q = debouncedSearch.trim().toLowerCase();
        if (q) {
            result = result.filter(r =>
                r.returnNumber?.toLowerCase().includes(q) ||
                r.Supplier?.name?.toLowerCase().includes(q) ||
                r.PurchaseReturnItem?.some((i: any) =>
                    i.Product?.name?.toLowerCase().includes(q) ||
                    i.Product?.name?.toLowerCase().includes(q)
                )
            );
        }
        return result;
    }, [returns, supplierFilter, debouncedSearch]);

    // Only show suppliers that appear in the returns list
    const activeSuppliers = useMemo(() => {
        const ids = new Set(returns.map(r => r.supplierId).filter(Boolean));
        return suppliers.filter(s => ids.has(s.id));
    }, [returns, suppliers]);

    const renderItem: ListRenderItem<PurchaseReturn> = useCallback(({ item: r, index: i }) => (
        <Animated.View entering={FadeInUp.duration(300).delay(Math.min(i, 8) * 35).springify().damping(18)}>
            <Pressable onPress={() => setSelected(r)} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
                <View style={[s.card, { borderColor: colors.cardBorder }]}>
                    <BlurView intensity={20} tint={colors.blurTint} style={StyleSheet.absoluteFill} />
                    <View style={[s.cardInner, { backgroundColor: colors.cardBg }]}>
                        <View style={s.cardTop}>
                            <View style={[s.numBadge, { backgroundColor: isDark ? 'rgba(245,158,11,0.15)' : 'rgba(245,158,11,0.1)' }]}>
                                <Text style={[s.numText, { color: ACCENT }]} numberOfLines={1}>{r.returnNumber}</Text>
                            </View>
                            <StatusPill status={r.status} />
                        </View>
                        <View style={s.infoRow}>
                            <Truck size={13} color={colors.textMuted} />
                            <Text style={[s.infoText, { color: colors.textMuted }]} numberOfLines={1}>{r.Supplier?.name || '—'}</Text>
                        </View>
                        {r.PurchaseReturnItem && r.PurchaseReturnItem.length > 0 && (
                            <View style={s.infoRow}>
                                <Package size={13} color={colors.textMuted} />
                                <Text style={[s.infoText, { color: colors.textMuted }]}>{r.PurchaseReturnItem.length} mặt hàng</Text>
                            </View>
                        )}
                        <View style={s.cardBottom}>
                            <View style={s.infoRow}>
                                <Calendar size={13} color={colors.textMuted} />
                                <Text style={[s.infoText, { color: colors.textMuted }]}>{fmtDate(r.returnDate)}</Text>
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
                        <Pressable style={[s.iconBtn, { backgroundColor: colors.inputBg }]} onPress={() => router.replace('/(tabs)/sales')}>
                            <ChevronLeft size={20} color={colors.textSecondary} />
                        </Pressable>
                        <View style={s.headerIcon}>
                            <LinearGradient colors={[ACCENT, ACCENT2]} style={s.iconGrad}>
                                <RotateCcw size={20} color="#fff" strokeWidth={2} />
                            </LinearGradient>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[s.titleT, { color: colors.textPrimary }]}>Trả hàng mua</Text>
                            <Text style={[s.subT, { color: colors.textMuted }]}>{filtered.length}/{returns.length} phiếu</Text>
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
                            placeholder="Tìm số phiếu, NCC, sản phẩm..."
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

                    {/* Supplier filter chips */}
                    {activeSuppliers.length > 0 && (
                        <Animated.View entering={FadeInDown.duration(400).delay(80)}>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}
                                contentContainerStyle={{ paddingHorizontal: Spacing.xl, paddingBottom: Spacing.sm, gap: 8, flexDirection: 'row' }}>
                                <Pressable onPress={() => setSupplierFilter('all')}
                                    style={[s.chip, { borderColor: supplierFilter === 'all' ? ACCENT : colors.cardBorder, backgroundColor: supplierFilter === 'all' ? ACCENT + '20' : colors.inputBg }]}>
                                    <Text style={[s.chipT, { color: supplierFilter === 'all' ? ACCENT : colors.textMuted, fontWeight: supplierFilter === 'all' ? FontWeights.semibold : FontWeights.regular }]}>
                                        Tất cả NCC
                                    </Text>
                                </Pressable>
                                {activeSuppliers.map(sup => {
                                    const active = supplierFilter === sup.id;
                                    return (
                                        <Pressable key={sup.id} onPress={() => setSupplierFilter(sup.id)}
                                            style={[s.chip, { borderColor: active ? ACCENT : colors.cardBorder, backgroundColor: active ? ACCENT + '20' : colors.inputBg }]}>
                                            <Building2 size={12} color={active ? ACCENT : colors.textMuted} />
                                            <Text style={[s.chipT, { color: active ? ACCENT : colors.textMuted, fontWeight: active ? FontWeights.semibold : FontWeights.regular }]}>
                                                {sup.name}
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
                            <RotateCcw size={44} color={colors.textMuted} strokeWidth={1.5} />
                            <Text style={{ fontSize: FontSizes.base, color: colors.textMuted }}>
                                {search || supplierFilter !== 'all' ? 'Không tìm thấy phiếu trả hàng' : 'Không có trả hàng mua'}
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
            {selected && <ReturnDetailModal ret={selected} onClose={() => setSelected(null)} />}
        </>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
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
    itemInner: { flexDirection: 'row', justifyContent: 'space-between', padding: Spacing.md, gap: Spacing.sm },
});
