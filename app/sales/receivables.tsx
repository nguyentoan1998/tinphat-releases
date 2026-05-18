// Sales Receivables Screen — Grouped by Customer
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Modal, FlatList, ListRenderItem, RefreshControl } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import { Landmark, ChevronLeft, RefreshCw, Calendar, X, ChevronRight, AlertTriangle, FileText, Users } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { accountsReceivableApi, AccountReceivable } from '@/lib/accounts-receivable-api';
import { Spacing, FontSizes, FontWeights } from '@/constants/Tokens';
import { useThemeStore } from '@/store';
import { ThemeColors } from '@/constants/ThemeColors';
import { useDarkDialog } from '@/components/ui/DarkDialog';

const ACCENT = '#10B981';

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
    UNPAID:  { label: 'Chưa thu',    color: '#EF4444', bg: 'rgba(239,68,68,0.15)' },
    PARTIAL: { label: 'Thu 1 phần',  color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' },
    PAID:    { label: 'Đã thu',      color: '#10B981', bg: 'rgba(16,185,129,0.15)' },
    OVERDUE: { label: 'Quá hạn',     color: '#DC2626', bg: 'rgba(220,38,38,0.15)' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';
const fmtCurrency = (n: number) => Math.round(n).toLocaleString('vi-VN') + 'đ';
const toNum = (v: any) => Number(v) || 0;

// ── Grouped customer type ─────────────────────────────────────────────────────

interface CustomerGroup {
    customerId: string;
    customerName: string;
    totalAmount: number;
    totalPaid: number;
    totalRemaining: number;
    invoiceCount: number;
    hasOverdue: boolean;
    worstStatus: string;
    items: AccountReceivable[];
}

function buildGroups(receivables: AccountReceivable[]): CustomerGroup[] {
    const map = new Map<string, CustomerGroup>();

    for (const r of receivables) {
        const cid = r.customerId;
        const amount = toNum(r.amount);
        const paid = toNum(r.paidAmount);
        const remaining = amount - paid;
        const isOverdue = !!r.dueDate && new Date(r.dueDate) < new Date() && r.status !== 'PAID';

        if (!map.has(cid)) {
            map.set(cid, {
                customerId: cid,
                customerName: r.Customer?.name || cid,
                totalAmount: 0,
                totalPaid: 0,
                totalRemaining: 0,
                invoiceCount: 0,
                hasOverdue: false,
                worstStatus: 'PAID',
                items: [],
            });
        }

        const g = map.get(cid)!;
        g.totalAmount += amount;
        g.totalPaid += paid;
        g.totalRemaining += remaining;
        g.invoiceCount += 1;
        g.hasOverdue = g.hasOverdue || isOverdue;
        g.items.push(r);

        const rank: Record<string, number> = { PAID: 0, PARTIAL: 1, UNPAID: 2, OVERDUE: 3 };
        const cur = isOverdue ? 'OVERDUE' : r.status;
        if ((rank[cur] ?? 0) > (rank[g.worstStatus] ?? 0)) {
            g.worstStatus = cur;
        }
    }

    return Array.from(map.values()).sort((a, b) => b.totalRemaining - a.totalRemaining);
}

// ── Customer detail modal ─────────────────────────────────────────────────────

function CustomerDetailModal({ group, onClose }: { group: CustomerGroup; onClose: () => void }) {
    const colors = ThemeColors.light;
    const paidPct = group.totalAmount > 0
        ? Math.min(100, Math.round((group.totalPaid / group.totalAmount) * 100))
        : 0;

    return (
        <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <View style={{ flex: 1 }}>
                <LinearGradient colors={colors.gradientColors} style={StyleSheet.absoluteFill} />

                {/* Header */}
                <View style={[md.header, { borderBottomColor: colors.divider }]}>
                    <View style={{ flex: 1 }}>
                        <Text style={[md.title, { color: colors.textPrimary }]} numberOfLines={2}>{group.customerName}</Text>
                        <Text style={[md.sub, { color: colors.textMuted }]}>{group.invoiceCount} khoản công nợ</Text>
                    </View>
                    <Pressable onPress={onClose} style={[md.closeBtn, { backgroundColor: colors.inputBg }]}>
                        <X size={20} color={colors.textSecondary} />
                    </Pressable>
                </View>

                <ScrollView contentContainerStyle={{ paddingHorizontal: Spacing.xl, paddingTop: Spacing.md }} showsVerticalScrollIndicator={false}>
                    {/* Summary hero */}
                    <Animated.View entering={FadeInDown.duration(400).springify().damping(18)}
                        style={{ borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)', marginBottom: Spacing.lg }}>
                        <BlurView intensity={18} tint={colors.blurTint} style={StyleSheet.absoluteFill} />
                        <View style={{ padding: Spacing.lg, backgroundColor: colors.cardBg, gap: Spacing.sm }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <View>
                                    <Text style={{ fontSize: FontSizes.xs, color: colors.textMuted }}>Tổng phải thu</Text>
                                    <Text style={{ fontSize: FontSizes.xl, fontWeight: FontWeights.bold, color: '#10B981' }}>{fmtCurrency(group.totalAmount)}</Text>
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                    <Text style={{ fontSize: FontSizes.xs, color: colors.textMuted }}>Còn lại</Text>
                                    <Text style={{ fontSize: FontSizes.xl, fontWeight: FontWeights.bold, color: group.totalRemaining > 0 ? '#F59E0B' : '#10B981' }}>
                                        {fmtCurrency(group.totalRemaining)}
                                    </Text>
                                </View>
                            </View>
                            {/* Progress bar */}
                            <View>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                                    <Text style={{ fontSize: 10, color: colors.textMuted }}>Tiến độ thu tiền</Text>
                                    <Text style={{ fontSize: 10, fontWeight: FontWeights.bold, color: '#10B981' }}>{paidPct}%</Text>
                                </View>
                                <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.divider }}>
                                    <View style={{ width: `${paidPct}%`, height: 8, borderRadius: 4, backgroundColor: '#10B981' }} />
                                </View>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                                    <Text style={{ fontSize: 10, color: '#10B981' }}>Đã thu: {fmtCurrency(group.totalPaid)}</Text>
                                    <Text style={{ fontSize: 10, color: '#EF4444' }}>Còn: {fmtCurrency(group.totalRemaining)}</Text>
                                </View>
                            </View>
                        </View>
                    </Animated.View>

                    {/* Overdue warning */}
                    {group.hasOverdue && (
                        <Animated.View entering={FadeInUp.duration(400).delay(80).springify().damping(18)}
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(220,38,38,0.4)', backgroundColor: 'rgba(220,38,38,0.1)', padding: Spacing.md, marginBottom: Spacing.md }}>
                            <AlertTriangle size={18} color="#DC2626" />
                            <Text style={{ flex: 1, fontSize: FontSizes.xs, color: '#DC2626', fontWeight: FontWeights.semibold }}>Có khoản công nợ đã quá hạn thu tiền</Text>
                        </Animated.View>
                    )}

                    {/* Invoice list */}
                    <Text style={{ fontSize: FontSizes.sm, fontWeight: FontWeights.bold, color: colors.textPrimary, marginBottom: Spacing.sm }}>
                        Danh sách khoản thu
                    </Text>
                    {group.items.map((r, i) => {
                        const st = STATUS_MAP[r.status] ?? { label: r.status, color: '#94A3B8', bg: 'rgba(148,163,184,0.15)' };
                        const amount = toNum(r.amount);
                        const paid = toNum(r.paidAmount);
                        const remaining = amount - paid;
                        const isOverdue = !!r.dueDate && new Date(r.dueDate) < new Date() && r.status !== 'PAID';
                        return (
                            <Animated.View key={r.id} entering={FadeInUp.duration(300).delay(i * 40).springify().damping(18)}
                                style={[md.invoiceCard, { borderColor: isOverdue ? 'rgba(220,38,38,0.4)' : colors.cardBorder }]}>
                                <BlurView intensity={16} tint={colors.blurTint} style={StyleSheet.absoluteFill} />
                                <View style={{ backgroundColor: colors.cardBg, padding: Spacing.md, gap: 6 }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                            <FileText size={14} color={colors.textMuted} />
                                            <Text style={{ fontSize: FontSizes.xs, color: colors.textMuted }}>
                                                {r.Order?.orderNumber || `#${r.id.slice(-6)}`}
                                            </Text>
                                        </View>
                                        <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, backgroundColor: st.bg }}>
                                            <Text style={{ fontSize: 10, fontWeight: '700', color: st.color }}>{st.label}</Text>
                                        </View>
                                    </View>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <View>
                                            <Text style={{ fontSize: 10, color: colors.textMuted }}>Tổng tiền</Text>
                                            <Text style={{ fontSize: FontSizes.sm, fontWeight: FontWeights.bold, color: colors.textPrimary }}>{fmtCurrency(amount)}</Text>
                                        </View>
                                        <View style={{ alignItems: 'flex-end' }}>
                                            <Text style={{ fontSize: 10, color: colors.textMuted }}>Còn lại</Text>
                                            <Text style={{ fontSize: FontSizes.sm, fontWeight: FontWeights.bold, color: remaining > 0 ? '#EF4444' : '#10B981' }}>{fmtCurrency(remaining)}</Text>
                                        </View>
                                    </View>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                        <Calendar size={11} color={isOverdue ? '#DC2626' : colors.textMuted} />
                                        <Text style={{ fontSize: 10, color: isOverdue ? '#DC2626' : colors.textMuted }}>
                                            Hạn: {fmtDate(r.dueDate)}
                                        </Text>
                                        {isOverdue && <AlertTriangle size={11} color="#DC2626" />}
                                    </View>
                                </View>
                            </Animated.View>
                        );
                    })}
                    <View style={{ height: 80 }} />
                </ScrollView>
            </View>
        </Modal>
    );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function SalesReceivablesScreen() {
    const router = useRouter();
    const [receivables, setReceivables] = useState<AccountReceivable[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState<CustomerGroup | null>(null);
    const [filter, setFilter] = useState('all');
    const { isDark } = useThemeStore();
    const colors = ThemeColors.light;
    const { showDialog, DialogComponent } = useDarkDialog();

    useEffect(() => { load(); }, []);

    const load = async () => {
        try {
            setLoading(true);
            const d = await accountsReceivableApi.getReceivables();
            setReceivables(d);
        } catch (e: any) {
            showDialog('Lỗi', e.response?.data?.message || 'Không thể tải công nợ phải thu');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const allGroups = useMemo(() => buildGroups(receivables), [receivables]);

    const filteredGroups = useMemo(() => {
        if (filter === 'all') return allGroups;
        return allGroups.filter(g => g.worstStatus === filter);
    }, [allGroups, filter]);

    const totalPending = useMemo(() =>
        receivables.filter(r => r.status !== 'PAID').reduce((s, r) => s + toNum(r.amount) - toNum(r.paidAmount), 0),
        [receivables]
    );

    const counts = useMemo(() => {
        const c: Record<string, number> = { all: allGroups.length };
        allGroups.forEach(g => { c[g.worstStatus] = (c[g.worstStatus] || 0) + 1; });
        return c;
    }, [allGroups]);

    const FILTERS = [
        { key: 'all',     label: 'Tất cả' },
        { key: 'UNPAID',  label: 'Chưa thu' },
        { key: 'PARTIAL', label: 'Thu 1 phần' },
        { key: 'OVERDUE', label: 'Quá hạn' },
        { key: 'PAID',    label: 'Đã thu' },
    ];

    const renderGroup: ListRenderItem<CustomerGroup> = useCallback(({ item: g, index: i }) => {
        const st = STATUS_MAP[g.worstStatus] ?? { label: g.worstStatus, color: '#94A3B8', bg: 'rgba(148,163,184,0.15)' };
        return (
            <Animated.View entering={FadeInUp.duration(300).delay(Math.min(i, 8) * 40).springify().damping(18)}>
                <Pressable onPress={() => setSelectedGroup(g)} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
                    <View style={[s.card, { borderColor: g.hasOverdue ? 'rgba(220,38,38,0.4)' : colors.cardBorder }]}>
                        <BlurView intensity={20} tint={colors.blurTint} style={StyleSheet.absoluteFill} />
                        <View style={[s.cardInner, { backgroundColor: colors.cardBg }]}>
                            {/* Customer name + status */}
                            <View style={s.top}>
                                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(16,185,129,0.12)', justifyContent: 'center', alignItems: 'center' }}>
                                        <Users size={18} color={ACCENT} strokeWidth={1.6} />
                                    </View>
                                    <Text style={{ flex: 1, fontSize: FontSizes.base, fontWeight: FontWeights.semibold, color: colors.textPrimary }} numberOfLines={2}>
                                        {g.customerName}
                                    </Text>
                                </View>
                                <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, backgroundColor: st.bg }}>
                                    <Text style={{ fontSize: 11, fontWeight: '700', color: st.color }}>{st.label}</Text>
                                </View>
                            </View>

                            {/* Invoice count */}
                            <Text style={{ fontSize: FontSizes.xs, color: colors.textMuted, marginLeft: 44 }}>
                                {g.invoiceCount} khoản thu
                            </Text>

                            {/* Amount row */}
                            <View style={[s.amountRow, { borderTopColor: colors.divider }]}>
                                <View>
                                    <Text style={{ fontSize: 10, color: colors.textMuted }}>Tổng phải thu</Text>
                                    <Text style={{ fontSize: FontSizes.sm, fontWeight: FontWeights.bold, color: colors.textPrimary }}>
                                        {fmtCurrency(g.totalAmount)}
                                    </Text>
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                    <Text style={{ fontSize: 10, color: colors.textMuted }}>Còn lại</Text>
                                    <Text style={{ fontSize: FontSizes.sm, fontWeight: FontWeights.bold, color: g.totalRemaining > 0 ? '#EF4444' : '#10B981' }}>
                                        {fmtCurrency(g.totalRemaining)}
                                    </Text>
                                </View>
                                <ChevronRight size={16} color={colors.textMuted} />
                            </View>

                            {/* Overdue warning */}
                            {g.hasOverdue && (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                    <AlertTriangle size={12} color="#DC2626" />
                                    <Text style={{ fontSize: 10, color: '#DC2626', fontWeight: FontWeights.semibold }}>Có khoản quá hạn</Text>
                                </View>
                            )}
                        </View>
                    </View>
                </Pressable>
            </Animated.View>
        );
    }, [colors]);

    return (
        <>
            <View style={{ flex: 1 }}>
                <StatusBar style={isDark ? 'light' : 'dark'} />
                <LinearGradient colors={colors.gradientColors} style={StyleSheet.absoluteFill} />
                <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                    {/* Header */}
                    <Animated.View entering={FadeInDown.duration(400)} style={s.header}>
                        <Pressable style={[s.btn, { backgroundColor: colors.inputBg }]} onPress={() => router.back()}>
                            <ChevronLeft size={20} color={colors.textSecondary} />
                        </Pressable>
                        <View style={s.headerIcon}>
                            <LinearGradient colors={['#10B981', '#34D399']} style={s.iconGrad}>
                                <Landmark size={20} color="#fff" strokeWidth={2} />
                            </LinearGradient>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[s.title, { color: colors.textPrimary }]}>Công nợ phải thu</Text>
                            <Text style={[s.sub, { color: colors.textMuted }]}>{allGroups.length} khách hàng</Text>
                        </View>
                        <Pressable style={[s.btn, { backgroundColor: colors.inputBg }]} onPress={() => { setRefreshing(true); load(); }}>
                            <RefreshCw size={16} color={colors.textSecondary} />
                        </Pressable>
                    </Animated.View>

                    {/* Total pending card */}
                    {!loading && totalPending > 0 && (
                        <Animated.View entering={FadeInDown.duration(400).delay(80)}
                            style={[s.totalCard, { borderColor: 'rgba(16,185,129,0.3)', marginHorizontal: Spacing.xl, marginBottom: Spacing.sm }]}>
                            <BlurView intensity={18} tint={colors.blurTint} style={StyleSheet.absoluteFill} />
                            <View style={{ padding: Spacing.md, borderRadius: 16, backgroundColor: colors.cardBg }}>
                                <Text style={{ fontSize: FontSizes.xs, color: colors.textMuted, marginBottom: 4 }}>Tổng chưa thu</Text>
                                <Text style={{ fontSize: FontSizes.xxl, fontWeight: FontWeights.bold, color: '#10B981' }}>
                                    {fmtCurrency(totalPending)}
                                </Text>
                            </View>
                        </Animated.View>
                    )}

                    {/* Filter chips */}
                    <Animated.View entering={FadeInDown.duration(400).delay(60)}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ paddingHorizontal: Spacing.xl, paddingBottom: Spacing.sm, gap: 8, flexDirection: 'row' }}>
                            {FILTERS.map(f => {
                                const active = filter === f.key;
                                const ac = STATUS_MAP[f.key]?.color || ACCENT;
                                return (
                                    <Pressable key={f.key} onPress={() => setFilter(f.key)}
                                        style={[s.chip, { borderColor: active ? ac : colors.cardBorder, backgroundColor: active ? ac + '20' : colors.inputBg }]}>
                                        <Text style={[s.chipT, { color: active ? ac : colors.textMuted, fontWeight: active ? FontWeights.semibold : FontWeights.regular }]}>
                                            {f.label}
                                        </Text>
                                        {(counts[f.key] ?? 0) > 0 && (
                                            <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, backgroundColor: active ? ac + '30' : colors.divider }}>
                                                <Text style={{ fontSize: 10, fontWeight: FontWeights.bold, color: active ? ac : colors.textMuted }}>{counts[f.key]}</Text>
                                            </View>
                                        )}
                                    </Pressable>
                                );
                            })}
                        </ScrollView>
                    </Animated.View>

                    {/* List */}
                    {loading ? (
                        <View style={{ alignItems: 'center', paddingVertical: 70 }}>
                            <Text style={{ fontSize: FontSizes.base, color: colors.textMuted }}>Đang tải...</Text>
                        </View>
                    ) : filteredGroups.length === 0 ? (
                        <View style={{ alignItems: 'center', paddingVertical: 70, gap: Spacing.md }}>
                            <Landmark size={44} color={colors.textMuted} strokeWidth={1.5} />
                            <Text style={{ fontSize: FontSizes.base, color: colors.textMuted }}>Không có công nợ</Text>
                        </View>
                    ) : (
                        <FlatList
                            data={filteredGroups}
                            keyExtractor={(g) => g.customerId}
                            renderItem={renderGroup}
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

            {/* Customer detail modal */}
            {selectedGroup && (
                <CustomerDetailModal group={selectedGroup} onClose={() => setSelectedGroup(null)} />
            )}
        </>
    );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
    btn: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    headerIcon: { marginRight: 4 },
    iconGrad: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    title: { fontSize: FontSizes.lg, fontWeight: FontWeights.bold },
    sub: { fontSize: FontSizes.xs, marginTop: 1 },
    totalCard: { borderRadius: 16, overflow: 'hidden', borderWidth: 1 },
    chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
    chipT: { fontSize: FontSizes.xs },
    card: { borderRadius: 18, overflow: 'hidden', borderWidth: 1 },
    cardInner: { padding: Spacing.md, gap: 8 },
    top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
    amountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: Spacing.sm, borderTopWidth: StyleSheet.hairlineWidth },
});

const md = StyleSheet.create({
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: Spacing.xl, paddingTop: 50, paddingBottom: Spacing.lg, borderBottomWidth: 1 },
    title: { fontSize: FontSizes.xl, fontWeight: FontWeights.bold },
    sub: { fontSize: FontSizes.xs, marginTop: 2 },
    closeBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    invoiceCard: { borderRadius: 14, overflow: 'hidden', borderWidth: 1, marginBottom: Spacing.sm },
});
