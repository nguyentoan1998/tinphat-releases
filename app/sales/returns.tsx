// Sales Returns Screen — Glassmorphism + FlatList + Modal
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Modal, FlatList, ListRenderItem, RefreshControl, TextInput } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import { RefreshCcw, ChevronLeft, RefreshCw, Calendar, User, X, ChevronRight, Hash, FileText, Search, Package, Building2 } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';

import { salesReturnApi, SalesReturn } from '@/lib/sales-return-api';
import { Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants/Tokens';
import { useThemeStore } from '@/store';
import { ThemeColors } from '@/constants/ThemeColors';
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
function ReturnDetailModal({ ret: r, onClose }: { ret: SalesReturn; onClose: () => void }) {
    const { isDark } = useThemeStore();
    const colors = ThemeColors.light;
    const st = STATUS_MAP[r.status] ?? { label: r.status, color: '#94A3B8', bg: '' };
    const rows = [
        { Icon: Hash, label: 'Số phiếu', value: r.returnNumber },
        { Icon: User, label: 'Khách hàng', value: r.Customer?.name || '—' },
        { Icon: Building2, label: 'Kho nhận', value: r.Warehouse?.name || '—' },
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
                        <Text style={[md.title, { color: colors.textPrimary }]}>Chi tiết hàng bảo hành</Text>
                        <Text style={[md.sub, { color: colors.textMuted }]}>{r.returnNumber}</Text>
                    </View>
                    <Pressable onPress={onClose} style={[md.closeBtn, { backgroundColor: colors.inputBg }]}>
                        <X size={20} color={colors.textSecondary} />
                    </Pressable>
                </View>
                <ScrollView contentContainerStyle={md.scroll} showsVerticalScrollIndicator={false}>
                    {/* Hero */}
                    <Animated.View entering={FadeInDown.duration(400).springify().damping(18)} style={{ alignItems: 'center', paddingVertical: Spacing.xl, gap: 10 }}>
                        <LinearGradient colors={[st.color + '33', st.color + '11']} style={md.heroBg}>
                            <RefreshCcw size={36} color={st.color} strokeWidth={1.5} />
                        </LinearGradient>
                        <View style={{ paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, backgroundColor: st.bg }}>
                            <Text style={{ fontSize: FontSizes.sm, fontWeight: FontWeights.bold, color: st.color }}>{st.label}</Text>
                        </View>
                        <Text style={{ fontSize: FontSizes.sm, color: colors.textMuted }}>{r.Customer?.name || '—'}</Text>
                    </Animated.View>

                    {/* Info rows */}
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

                    {/* Items */}
                    {r.SalesReturnItem && r.SalesReturnItem.length > 0 && (
                        <Animated.View entering={FadeInUp.duration(400).delay(180).springify().damping(18)} style={{ marginBottom: Spacing.lg }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.sm }}>
                                <Package size={16} color={ACCENT} />
                                <Text style={{ fontSize: FontSizes.sm, fontWeight: FontWeights.semibold, color: colors.textPrimary }}>
                                    Sản phẩm ({r.SalesReturnItem.length})
                                </Text>
                            </View>
                            {r.SalesReturnItem.map((item: any, i: number) => (
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
                                            {item.reason && <Text style={{ fontSize: FontSizes.xs, marginTop: 2, color: '#F59E0B' }}>Lý do: {item.reason}</Text>}
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
export default function SalesReturnsScreen() {
    const router = useRouter();
    const [returns, setReturns] = useState<SalesReturn[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selected, setSelected] = useState<SalesReturn | null>(null);
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
            const res = await salesReturnApi.getReturns();
            setReturns(Array.isArray(res) ? res : []);
        } catch (e: any) {
            showDialog('Lỗi', e.response?.data?.message || 'Không thể tải hàng bảo hành');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const filtered = useMemo(() => {
        const q = debouncedSearch.trim().toLowerCase();
        if (!q) return returns;
        return returns.filter(r =>
            r.returnNumber?.toLowerCase().includes(q) ||
            r.Customer?.name?.toLowerCase().includes(q) ||
            r.Warehouse?.name?.toLowerCase().includes(q) ||
            r.SalesReturnItem?.some((i: any) =>
                i.Product?.name?.toLowerCase().includes(q) ||
                i.Product?.name?.toLowerCase().includes(q)
            )
        );
    }, [returns, debouncedSearch]);

    const renderItem: ListRenderItem<SalesReturn> = useCallback(({ item: r, index: i }) => (
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
                            <User size={13} color={colors.textMuted} />
                            <Text style={[s.infoText, { color: colors.textMuted }]} numberOfLines={1}>{r.Customer?.name || '—'}</Text>
                        </View>
                        {r.SalesReturnItem && r.SalesReturnItem.length > 0 && (
                            <View style={s.infoRow}>
                                <Package size={13} color={colors.textMuted} />
                                <Text style={[s.infoText, { color: colors.textMuted }]}>{r.SalesReturnItem.length} sản phẩm</Text>
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
                                <RefreshCcw size={20} color="#fff" strokeWidth={2} />
                            </LinearGradient>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[s.titleT, { color: colors.textPrimary }]}>Hàng bảo hành</Text>
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
                            placeholder="Tìm số phiếu, khách hàng, sản phẩm..."
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

                    {/* List */}
                    {loading ? (
                        <View style={{ alignItems: 'center', paddingVertical: 70 }}>
                            <Text style={{ fontSize: FontSizes.base, color: colors.textMuted }}>Đang tải...</Text>
                        </View>
                    ) : filtered.length === 0 ? (
                        <View style={{ alignItems: 'center', paddingVertical: 70, gap: Spacing.md }}>
                            <RefreshCcw size={44} color={colors.textMuted} strokeWidth={1.5} />
                            <Text style={{ fontSize: FontSizes.base, color: colors.textMuted }}>
                                {search ? 'Không tìm thấy kết quả' : 'Không có hàng bảo hành'}
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
            {selected && <ReturnDetailModal ret={selected} onClose={() => setSelected(null)} />}
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
