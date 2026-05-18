// Sales Quotations Screen — Glassmorphism
import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, Modal, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import { FileText, X, Calendar, User, Tag, Percent, Layers, ChevronRight, AlertCircle, CheckCircle2, Send, Ban } from 'lucide-react-native';

import { salesQuotationApi, SalesQuotation, QuotationStatus } from '@/lib/sales-quotation-api';
import { Timings } from '@/constants/GlassTokens';
import { Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants/Tokens';
import GlassDataScreen, { GlassListCard, StatusBadge } from '@/components/ui/GlassDataScreen';
import { useThemeStore } from '@/store';
import { ThemeColors } from '@/constants/ThemeColors';

const STATUS_MAP: Record<QuotationStatus, { label: string; color: string }> = {
    DRAFT: { label: 'Nháp', color: '#6B7280' },
    SENT: { label: 'Đã gửi', color: '#3B82F6' },
    ACCEPTED: { label: 'Chấp nhận', color: '#10B981' },
    REJECTED: { label: 'Từ chối', color: '#EF4444' },
    EXPIRED: { label: 'Hết hạn', color: '#F97316' },
    CONVERTED: { label: 'Đã đặt hàng', color: '#8B5CF6' },
    CANCELLED: { label: 'Đã hủy', color: '#EF4444' },
};

const FILTER_OPTS = [
    { key: 'all', label: 'Tất cả' },
    { key: 'DRAFT', label: 'Nháp' },
    { key: 'SENT', label: 'Đã gửi' },
    { key: 'ACCEPTED', label: 'Chấp nhận' },
] as const;

const fmtCurrency = (n: number) => n.toLocaleString('vi-VN') + ' \u20AB';
const fmtDate = (d: string) => new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

export default function SalesQuotationsScreen() {
    const [data, setData] = useState<SalesQuotation[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState<'all' | QuotationStatus>('all');
    const [selected, setSelected] = useState<SalesQuotation | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const { isDark } = useThemeStore();
    const colors = ThemeColors.light;

    useEffect(() => { load(); }, []);
    const load = async () => {
        try { setLoading(true); const d = await salesQuotationApi.getAll(); setData(Array.isArray(d) ? d : []); }
        catch { setData([]); } finally { setLoading(false); setRefreshing(false); }
    };

    const filtered = useMemo(() =>
        filter === 'all' ? data : data.filter(q => q.status === filter),
        [data, filter]
    );

    const doAction = async (action: () => Promise<SalesQuotation>, label: string) => {
        setActionLoading(true);
        try {
            const updated = await action();
            setData(prev => prev.map(q => q.id === updated.id ? updated : q));
            setSelected(updated);
            Alert.alert('Thanh cong', `Da ${label} bao gia`);
        } catch (e: any) {
            Alert.alert('Lỗi', e.response?.data?.message || `Không thể ${label}`);
        } finally { setActionLoading(false); }
    };

    return (
        <>
            <GlassDataScreen title="Báo giá bán" subtitle={`${filtered.length} / ${data.length} báo giá`}
                loading={loading} refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }}
                headerContent={
                    <View style={s.hE}>
                        <Animated.View entering={FadeInUp.duration(Timings.entrance).delay(100)} style={s.filterRow}>
                            {FILTER_OPTS.map((f) => (
                                <Pressable key={f.key} onPress={() => setFilter(f.key as any)} style={[s.chip, { backgroundColor: filter === f.key ? 'rgba(236,72,153,0.2)' : colors.inputBg, borderColor: filter === f.key ? 'rgba(236,72,153,0.5)' : colors.cardBorder }]}>
                                    <Text style={[s.chipT, { color: filter === f.key ? '#F9A8D4' : colors.textMuted }]}>{f.label}</Text>
                                </Pressable>
                            ))}
                        </Animated.View>
                    </View>
                }
            >
                {filtered.length === 0 && !loading ? (
                    <View style={s.emptyW}><FileText size={48} color={colors.textMuted} /><Text style={[s.emptyT, { color: colors.textMuted }]}>Không có báo giá</Text></View>
                ) : (
                    <View style={s.gap}>
                        {filtered.map((q, i) => {
                            const st = STATUS_MAP[q.status];
                            const isExpired = q.validUntil && new Date(q.validUntil) < new Date() && q.status === 'SENT';
                            return (
                                <Pressable key={q.id} onPress={() => setSelected(q)}>
                                    <GlassListCard index={i}>
                                        <View style={s.cardH}>
                                            <View style={s.nw}>
                                                <Text style={[s.cTitle, { color: colors.textPrimary }]}>{q.quotationNumber}</Text>
                                                <Text style={[s.cSub, { color: colors.textMuted }]}>{q.Customer?.name || ''}</Text>
                                            </View>
                                            <StatusBadge label={st.label} color={st.color} />
                                        </View>
                                        <View style={s.infoR}><Text style={[s.iL, { color: colors.textMuted }]}>Tổng tiền</Text><Text style={[s.iV, { color: '#34D399' }]}>{fmtCurrency(Number(q.totalAmount) || 0)}</Text></View>
                                        <View style={s.infoR}><Text style={[s.iL, { color: colors.textMuted }]}>Ngày lập</Text><Text style={[s.iV, { color: colors.textPrimary }]}>{fmtDate(q.quotationDate)}</Text></View>
                                        {q.validUntil && (
                                            <View style={s.infoR}>
                                                <Text style={[s.iL, { color: colors.textMuted }]}>Hiệu lực đến</Text>
                                                <Text style={[s.iV, { color: isExpired ? '#EF4444' : colors.textPrimary }]}>{fmtDate(q.validUntil)}</Text>
                                            </View>
                                        )}
                                    </GlassListCard>
                                </Pressable>
                            );
                        })}
                    </View>
                )}
            </GlassDataScreen>

            {selected && (
                <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSelected(null)}>
                    <View style={md.container}>
                        <LinearGradient colors={colors.gradientColors} style={StyleSheet.absoluteFill} />
                        <View style={[md.header, { borderBottomColor: colors.divider }]}>
                            <View>
                                <Text style={[md.headerTitle, { color: colors.textPrimary }]}>{selected.quotationNumber}</Text>
                                <StatusBadge label={STATUS_MAP[selected.status].label} color={STATUS_MAP[selected.status].color} />
                            </View>
                            <Pressable onPress={() => setSelected(null)} style={[md.closeBtn, { backgroundColor: colors.inputBg }]}><X size={20} color={colors.textSecondary} /></Pressable>
                        </View>
                        <ScrollView contentContainerStyle={md.scroll} showsVerticalScrollIndicator={false}>
                            <Animated.View entering={FadeInDown.duration(400).springify().damping(18)} style={md.infoList}>
                                {[
                                    { Icon: User, label: 'Khách hàng', value: selected.Customer?.name || '—' },
                                    { Icon: Calendar, label: 'Ngày lập', value: fmtDate(selected.quotationDate) },
                                    { Icon: Calendar, label: 'Hiệu lực đến', value: selected.validUntil ? fmtDate(selected.validUntil) : '—' },
                                    { Icon: Tag, label: 'Tổng tiền', value: fmtCurrency(Number(selected.totalAmount) || 0) },
                                    { Icon: Percent, label: 'Chiết khấu', value: fmtCurrency(Number(selected.discount) || 0) },
                                    { Icon: Percent, label: 'Thuế', value: fmtCurrency(Number(selected.tax) || 0) },
                                    { Icon: AlertCircle, label: 'Ghi chú', value: selected.note || '—' },
                                    { Icon: FileText, label: 'Điều khoản', value: selected.terms || '—' },
                                ].map(({ Icon, label, value }, idx) => (
                                    <View key={idx} style={[md.infoCard, { borderColor: colors.cardBorder }]}>
                                        <BlurView intensity={20} tint={colors.blurTint} style={StyleSheet.absoluteFill} />
                                        <View style={[md.infoInner, { backgroundColor: colors.cardBg }]}>
                                            <View style={md.infoIcon}><Icon size={18} color="#EC4899" /></View>
                                            <View style={md.infoText}><Text style={[md.infoLabel, { color: colors.textMuted }]}>{label}</Text><Text style={[md.infoValue, { color: colors.textPrimary }]}>{value}</Text></View>
                                        </View>
                                    </View>
                                ))}
                            </Animated.View>

                            {/* Items */}
                            {selected.SalesQuotationItem && selected.SalesQuotationItem.length > 0 && (
                                <Animated.View entering={FadeInUp.duration(400).delay(120).springify().damping(18)}>
                                    <Text style={[md.sectionTitle, { color: colors.textSecondary }]}>Sản phẩm báo giá</Text>
                                    {selected.SalesQuotationItem.map((item, idx) => (
                                        <View key={item.id} style={[md.infoCard, { marginBottom: Spacing.sm, borderColor: colors.cardBorder }]}>
                                            <BlurView intensity={20} tint={colors.blurTint} style={StyleSheet.absoluteFill} />
                                            <View style={[md.infoInner, { flexDirection: 'column', alignItems: 'flex-start', backgroundColor: colors.cardBg }]}>
                                                <Text style={[md.itemName, { color: colors.textPrimary }]}>{item.Product?.name || item.productId}</Text>
                                                <Text style={[md.itemCode, { color: colors.textMuted }]}>{item.Product?.code}</Text>
                                                <View style={md.itemRow}>
                                                    <Text style={[md.itemMeta, { color: colors.textSecondary }]}>SL: {Number(item.quantity)}</Text>
                                                    <Text style={[md.itemMeta, { color: colors.textSecondary }]}>Đơn giá: {fmtCurrency(Number(item.unitPrice))}</Text>
                                                    <Text style={[md.itemAmount]}>{fmtCurrency(Number(item.amount))}</Text>
                                                </View>
                                            </View>
                                        </View>
                                    ))}
                                </Animated.View>
                            )}

                            {/* Actions */}
                            <Animated.View entering={FadeInUp.duration(400).delay(200).springify().damping(18)} style={md.actions}>
                                {selected.status === 'DRAFT' && (
                                    <Pressable style={[md.btn, { backgroundColor: 'rgba(59,130,246,0.2)', borderColor: 'rgba(59,130,246,0.5)' }]}
                                        disabled={actionLoading} onPress={() => doAction(() => salesQuotationApi.send(selected.id), 'gửi')}>
                                        <Send size={16} color="#93C5FD" /><Text style={[md.btnT, { color: '#93C5FD' }]}>Gửi báo giá</Text>
                                    </Pressable>
                                )}
                                {selected.status === 'SENT' && (
                                    <>
                                        <Pressable style={[md.btn, { backgroundColor: 'rgba(16,185,129,0.2)', borderColor: 'rgba(16,185,129,0.5)' }]}
                                            disabled={actionLoading} onPress={() => doAction(() => salesQuotationApi.accept(selected.id), 'chấp nhận')}>
                                            <CheckCircle2 size={16} color="#34D399" /><Text style={[md.btnT, { color: '#34D399' }]}>Chấp nhận</Text>
                                        </Pressable>
                                        <Pressable style={[md.btn, { backgroundColor: 'rgba(239,68,68,0.2)', borderColor: 'rgba(239,68,68,0.5)' }]}
                                            disabled={actionLoading} onPress={() => doAction(() => salesQuotationApi.reject(selected.id), 'từ chối')}>
                                            <Ban size={16} color="#F87171" /><Text style={[md.btnT, { color: '#F87171' }]}>Từ chối</Text>
                                        </Pressable>
                                    </>
                                )}
                                {selected.status === 'ACCEPTED' && (
                                    <Pressable style={[md.btn, { backgroundColor: 'rgba(139,92,246,0.2)', borderColor: 'rgba(139,92,246,0.5)' }]}
                                        disabled={actionLoading} onPress={() => doAction(() => salesQuotationApi.convert(selected.id), 'chuyển thành đơn hàng')}>
                                        <ChevronRight size={16} color="#A78BFA" /><Text style={[md.btnT, { color: '#A78BFA' }]}>Tạo đơn hàng</Text>
                                    </Pressable>
                                )}
                            </Animated.View>
                            <View style={{ height: 60 }} />
                        </ScrollView>
                    </View>
                </Modal>
            )}
        </>
    );
}

const s = StyleSheet.create({
    hE: { paddingHorizontal: Spacing.xl },
    filterRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg, flexWrap: 'wrap' },
    chip: { paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: BorderRadius.full, borderWidth: 1 },
    chipT: { fontSize: FontSizes.xs, fontWeight: FontWeights.medium },
    emptyW: { alignItems: 'center', paddingVertical: 60, gap: Spacing.md },
    emptyT: { fontSize: FontSizes.base },
    gap: { gap: Spacing.md },
    cardH: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.sm },
    nw: { flex: 1 },
    cTitle: { fontSize: FontSizes.base, fontWeight: FontWeights.semibold },
    cSub: { fontSize: FontSizes.xs, marginTop: 2 },
    infoR: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    iL: { fontSize: FontSizes.sm },
    iV: { fontSize: FontSizes.sm, fontWeight: FontWeights.medium },
});

const md = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg, paddingTop: 50, borderBottomWidth: 1 },
    headerTitle: { fontSize: FontSizes.xl, fontWeight: FontWeights.bold, marginBottom: 6 },
    closeBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    scroll: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl },
    infoList: { gap: Spacing.sm, marginBottom: Spacing.xl },
    infoCard: { borderRadius: BorderRadius.xl, overflow: 'hidden', borderWidth: 1 },
    infoInner: { flexDirection: 'row', alignItems: 'center', padding: Spacing.lg },
    infoIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(236,72,153,0.15)', justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
    infoText: { flex: 1 },
    infoLabel: { fontSize: FontSizes.xs },
    infoValue: { fontSize: FontSizes.base, fontWeight: FontWeights.medium, marginTop: 2 },
    sectionTitle: { fontSize: FontSizes.base, fontWeight: FontWeights.bold, marginBottom: Spacing.sm },
    itemName: { fontSize: FontSizes.base, fontWeight: FontWeights.semibold },
    itemCode: { fontSize: FontSizes.xs, marginTop: 2, marginBottom: Spacing.sm },
    itemRow: { flexDirection: 'row', gap: Spacing.md, flexWrap: 'wrap' },
    itemMeta: { fontSize: FontSizes.sm },
    itemAmount: { fontSize: FontSizes.sm, fontWeight: FontWeights.bold, color: '#34D399' },
    actions: { gap: Spacing.sm, marginBottom: Spacing.xl },
    btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: Spacing.md, borderRadius: BorderRadius.xl, borderWidth: 1 },
    btnT: { fontSize: FontSizes.base, fontWeight: FontWeights.semibold },
});
