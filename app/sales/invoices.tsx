// Sales Invoices Screen — Glassmorphism
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, RefreshControl } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import { FileText, ChevronLeft, RefreshCw } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';

import { salesInvoiceApi, Invoice } from '@/lib/sales-invoice-api';
import { Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants/Tokens';
import { StatusBadge } from '@/components/ui/GlassDataScreen';
import { useThemeStore } from '@/store';
import { ThemeColors } from '@/constants/ThemeColors';
import { useDarkDialog } from '@/components/ui/DarkDialog';

const STATUS_MAP: Record<string, { label: string; color: string }> = {
    DRAFT: { label: 'Nháp', color: '#94A3B8' },
    CONFIRMED: { label: 'Xác nhận', color: '#3B82F6' },
    SHIPPED: { label: 'Đang giao', color: '#8B5CF6' },
    COMPLETED: { label: 'Hoàn thành', color: '#10B981' },
    CANCELLED: { label: 'Đã hủy', color: '#EF4444' },
};

const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';
const fmtCurrency = (n: number) => n.toLocaleString('vi-VN') + ' \u20AB';

export default function SalesInvoicesScreen() {
    const router = useRouter();
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const { isDark } = useThemeStore();
    const colors = ThemeColors.light;
    const { showDialog, DialogComponent } = useDarkDialog();

    useEffect(() => { load(); }, []);
    const load = async () => {
        try { setLoading(true); const d = await salesInvoiceApi.getInvoices(); setInvoices(Array.isArray(d) ? d : []); }
        catch (e: any) { showDialog('Lỗi', e.response?.data?.message || 'Không thể tải phiếu bán'); }
        finally { setLoading(false); setRefreshing(false); }
    };

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
                        <LinearGradient colors={['#06B6D4', '#38BDF8']} style={s.iconGrad}>
                            <FileText size={20} color="#fff" strokeWidth={2} />
                        </LinearGradient>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[s.title, { color: colors.textPrimary }]}>Phiếu bán hàng</Text>
                        <Text style={[s.sub, { color: colors.textMuted }]}>Xuất hàng cho khách</Text>
                    </View>
                    <Pressable style={[s.btn, { backgroundColor: colors.inputBg }]} onPress={() => { setRefreshing(true); load(); }}>
                        <RefreshCw size={16} color={colors.textSecondary} />
                    </Pressable>
                </Animated.View>
                <ScrollView contentContainerStyle={s.list} showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#06B6D4" />}>
                    {loading ? <Text style={[s.emptyT, { color: colors.textMuted }]}>Đang tải...</Text>
                        : invoices.length === 0 ? (
                            <View style={s.emptyW}><FileText size={44} color={colors.textMuted} /><Text style={[s.emptyT, { color: colors.textMuted }]}>Không có phiếu bán</Text></View>
                        ) : (
                            <View style={s.gap}>
                                {invoices.map((inv, i) => {
                                    const st = STATUS_MAP[inv.status] || { label: inv.status, color: '#94A3B8' };
                                    return (
                                        <Animated.View key={inv.id} entering={FadeInUp.duration(300).delay(i * 35).springify().damping(18)}>
                                            <View style={[s.card, { borderColor: colors.cardBorder }]}>
                                                <BlurView intensity={20} tint={colors.blurTint} style={StyleSheet.absoluteFill} />
                                                <View style={[s.cardInner, { backgroundColor: colors.cardBg }]}>
                                                    <View style={s.row}>
                                                        <View style={s.nw}>
                                                            <Text style={[s.cTitle, { color: colors.textPrimary }]}>{inv.invoiceNumber}</Text>
                                                            <Text style={[s.cSub, { color: colors.textMuted }]}>{inv.Order?.Customer?.name || '—'}</Text>
                                                        </View>
                                                        <StatusBadge label={st.label} color={st.color} />
                                                    </View>
                                                    <View style={s.footerRow}>
                                                        <Text style={[s.meta, { color: colors.textMuted }]}>{fmtDate(inv.createdAt)}</Text>
                                                        <Text style={[s.amt, { color: '#34D399' }]}>{fmtCurrency(inv.amount)}</Text>
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
