// Sales Reports Screen — Rich Analytics with SVG Charts
import React, { useState, useEffect, useMemo } from 'react';
import {
    View, Text, StyleSheet, ScrollView, Pressable, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import Svg, {
    Rect, Circle, Path, Line, Text as SvgText, Defs, LinearGradient as SvgGradient,
    Stop, G, Polygon,
} from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import {
    TrendingUp, TrendingDown, DollarSign, ShoppingBag, ShoppingCart,
    ChevronLeft, BarChart3, RefreshCw
} from 'lucide-react-native';
import { useRouter } from 'expo-router';

import { salesOrderApi, SalesOrder } from '@/lib/sales-order-api';
import { purchaseOrderApi, PurchaseOrder } from '@/lib/purchase-order-api';
import { accountsReceivableApi, AccountReceivable } from '@/lib/accounts-receivable-api';
import { accountsPayableApi, AccountPayable } from '@/lib/accounts-payable-api';
import { Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants/Tokens';
import { useThemeStore } from '@/store';
import { ThemeColors } from '@/constants/ThemeColors';

const { width: SW } = Dimensions.get('window');
const CHART_W = SW - Spacing.xl * 2 - 32;
const fmtM = (n: number) => {
    if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B';
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(0) + 'K';
    return n.toString();
};
const fmtCurrency = (n: number) => n.toLocaleString('vi-VN') + ' \u20AB';
const MONTHS_VI = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];

// ─── Bar Chart ───────────────────────────────────────────────────────────────
function BarChart({ data, color1, color2, gradId, lineColor, labelColor }: {
    data: { label: string; value: number }[];
    color1: string; color2: string; gradId: string; lineColor: string; labelColor: string;
}) {
    const max = Math.max(...data.map(d => d.value), 1);
    const H = 160; const W = CHART_W; const barGap = 6;
    const barW = Math.max(12, (W - barGap * (data.length + 1)) / data.length);
    return (
        <Svg width={W} height={H + 24}>
            <Defs>
                <SvgGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor={color1} stopOpacity="1" />
                    <Stop offset="1" stopColor={color2} stopOpacity="0.3" />
                </SvgGradient>
            </Defs>
            {/* Grid lines */}
            {[0.25, 0.5, 0.75, 1].map((t, i) => (
                <Line key={i} x1={0} y1={H - H * t} x2={W} y2={H - H * t}
                    stroke={lineColor} strokeWidth={1} />
            ))}
            {data.map((d, i) => {
                const bH = Math.max(4, (d.value / max) * H);
                const x = barGap + i * (barW + barGap);
                return (
                    <G key={i}>
                        <Rect x={x} y={H - bH} width={barW} height={bH}
                            fill={`url(#${gradId})`} rx={4} />
                        <SvgText x={x + barW / 2} y={H + 16} textAnchor="middle"
                            fill={labelColor} fontSize={9}>{d.label}</SvgText>
                    </G>
                );
            })}
        </Svg>
    );
}

// ─── Donut Chart ──────────────────────────────────────────────────────────────
function DonutChart({ segments, centerBg, textPrimary, textMuted }: { 
    segments: { value: number; color: string; label: string }[];
    centerBg: string;
    textPrimary: string;
    textMuted: string;
}) {
    const total = segments.reduce((s, d) => s + d.value, 0) || 1;
    const R = 54; const r = 34; const cx = 72; const cy = 72;
    let cumAngle = -Math.PI / 2;
    const paths = segments.map(seg => {
        const angle = (seg.value / total) * 2 * Math.PI;
        const x1 = cx + R * Math.cos(cumAngle);
        const y1 = cy + R * Math.sin(cumAngle);
        cumAngle += angle;
        const x2 = cx + R * Math.cos(cumAngle);
        const y2 = cy + R * Math.sin(cumAngle);
        const x3 = cx + r * Math.cos(cumAngle);
        const y3 = cy + r * Math.sin(cumAngle);
        const x4 = cx + r * Math.cos(cumAngle - angle);
        const y4 = cy + r * Math.sin(cumAngle - angle);
        const large = angle > Math.PI ? 1 : 0;
        const d = `M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} L ${x3} ${y3} A ${r} ${r} 0 ${large} 0 ${x4} ${y4} Z`;
        return { d, color: seg.color };
    });
    return (
        <Svg width={144} height={144}>
            {paths.map((p, i) => (
                <Path key={i} d={p.d} fill={p.color} opacity={0.9} />
            ))}
            <Circle cx={cx} cy={cy} r={r - 2} fill={centerBg} />
            <SvgText x={cx} y={cy - 6} textAnchor="middle" fill={textPrimary} fontSize={18} fontWeight="bold">
                {total}
            </SvgText>
            <SvgText x={cx} y={cy + 12} textAnchor="middle" fill={textMuted} fontSize={9}>
                đơn
            </SvgText>
        </Svg>
    );
}

// ─── Horizontal Bar ────────────────────────────────────────────────────────────
function HBar({ value, max, color, barBg }: { value: number; max: number; color: string; barBg: string }) {
    const pct = max > 0 ? value / max : 0;
    return (
        <View style={{ height: 8, backgroundColor: barBg, borderRadius: 4, overflow: 'hidden', flex: 1 }}>
            <Animated.View
                style={{ height: 8, backgroundColor: color, borderRadius: 4, width: `${Math.round(pct * 100)}%` }}
            />
        </View>
    );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ title, value, sub, Icon, color, trend, delay, colors }: {
    title: string; value: string; sub?: string; Icon: any; color: string; trend?: 'up' | 'down'; delay: number; colors: any;
}) {
    return (
        <Animated.View entering={FadeInUp.duration(400).delay(delay).springify().damping(18)} style={[kpi.wrap, { borderColor: colors.cardBorder }]}>
            <BlurView intensity={20} tint={colors.blurTint} style={StyleSheet.absoluteFill} />
            <View style={[kpi.inner, { backgroundColor: colors.cardBg }]}>
                <View style={[kpi.iconBox, { backgroundColor: color + '22' }]}>
                    <Icon size={20} color={color} />
                </View>
                <Text style={[kpi.title, { color: colors.textMuted }]}>{title}</Text>
                <Text style={[kpi.value, { color }]}>{value}</Text>
                {sub ? <Text style={[kpi.sub, { color: colors.textMuted }]}>{sub}</Text> : null}
                {trend && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 3 }}>
                        {trend === 'up'
                            ? <TrendingUp size={12} color="#34D399" />
                            : <TrendingDown size={12} color="#F87171" />
                        }
                        <Text style={{ fontSize: 10, color: trend === 'up' ? '#34D399' : '#F87171' }}>
                            Tháng này
                        </Text>
                    </View>
                )}
            </View>
        </Animated.View>
    );
}

const kpi = StyleSheet.create({
    wrap: { flex: 1, borderRadius: 20, overflow: 'hidden', borderWidth: 1 },
    inner: { padding: Spacing.lg },
    iconBox: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
    title: { fontSize: FontSizes.xs, marginBottom: 4 },
    value: { fontSize: 18, fontWeight: '800' },
    sub: { fontSize: FontSizes.xs, marginTop: 2 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function SalesReportsScreen() {
    const router = useRouter();
    const { isDark } = useThemeStore();
    const colors = ThemeColors.light;
    const [loading, setLoading] = useState(true);
    const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
    const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
    const [receivables, setReceivables] = useState<AccountReceivable[]>([]);
    const [payables, setPayables] = useState<AccountPayable[]>([]);

    const load = async () => {
        setLoading(true);
        const [so, po, ar, ap] = await Promise.allSettled([
            salesOrderApi.getOrders(),
            purchaseOrderApi.getOrders(),
            accountsReceivableApi.getReceivables(),
            accountsPayableApi.getPayables(),
        ]);
        if (so.status === 'fulfilled') setSalesOrders(Array.isArray(so.value) ? so.value : []);
        if (po.status === 'fulfilled') setPurchaseOrders(Array.isArray(po.value) ? po.value : []);
        if (ar.status === 'fulfilled') setReceivables(Array.isArray(ar.value) ? ar.value : []);
        if (ap.status === 'fulfilled') setPayables(Array.isArray(ap.value) ? ap.value : []);
        setLoading(false);
    };

    useEffect(() => { load(); }, []);

    // ── Aggregate revenue by month ──────────────────────────────────────────
    const revenueByMonth = useMemo(() => {
        const map: Record<number, number> = {};
        salesOrders.forEach(o => {
            const m = new Date(o.createdAt).getMonth();
            map[m] = (map[m] || 0) + (Number(o.totalAmount) || 0);
        });
        return MONTHS_VI.map((label, i) => ({ label, value: map[i] || 0 }));
    }, [salesOrders]);

    const purchaseCostByMonth = useMemo(() => {
        const map: Record<number, number> = {};
        purchaseOrders.forEach(o => {
            const m = new Date(o.createdAt).getMonth();
            map[m] = (map[m] || 0) + (Number(o.totalAmount) || 0);
        });
        return MONTHS_VI.map((label, i) => ({ label, value: map[i] || 0 }));
    }, [purchaseOrders]);

    // ── Order status breakdown ──────────────────────────────────────────────
    const salesStatusBreakdown = useMemo(() => {
        const map: Record<string, number> = {};
        salesOrders.forEach(o => { map[o.status] = (map[o.status] || 0) + 1; });
        const STATUS_COLORS: Record<string, string> = {
            PENDING: '#F59E0B', CONFIRMED: '#3B82F6', SHIPPED: '#6366F1',
            DELIVERED: '#10B981', COMPLETED: '#34D399', CANCELLED: '#EF4444', RETURNED: '#F97316',
        };
        return Object.entries(map).map(([k, v]) => ({
            label: k, value: v, color: STATUS_COLORS[k] || '#6B7280'
        }));
    }, [salesOrders]);

    // ── KPI totals ──────────────────────────────────────────────────────────
    const totalRevenue = useMemo(() => salesOrders.reduce((s, o) => s + (Number(o.totalAmount) || 0), 0), [salesOrders]);
    const totalCost = useMemo(() => purchaseOrders.reduce((s, o) => s + (Number(o.totalAmount) || 0), 0), [purchaseOrders]);
    const totalReceivable = useMemo(() => receivables.reduce((s, r) => s + (Number(r.amount) || 0), 0), [receivables]);
    const totalPayable = useMemo(() => payables.reduce((s, p) => s + (Number(p.amount) || 0), 0), [payables]);
    const maxArAp = Math.max(totalReceivable, totalPayable, 1);

    return (
        <View style={s.root}>
            <StatusBar style={colors.statusBar} />
            <LinearGradient colors={[...colors.gradientColors]} style={StyleSheet.absoluteFill} />
            {/* Glow orb */}
            <View style={[s.orb, { backgroundColor: colors.orbColor }]} />

            <SafeAreaView style={s.safe} edges={['top']}>
                {/* Header */}
                <Animated.View entering={FadeInDown.duration(400)} style={s.header}>
                    <Pressable style={[s.backBtn, { backgroundColor: colors.inputBg }]} onPress={() => router.back()}>
                        <ChevronLeft size={22} color={colors.textSecondary} />
                    </Pressable>
                    <View style={s.headerIcon}>
                        <LinearGradient colors={['#14B8A6', '#2DD4BF']} style={s.iconGrad}>
                            <BarChart3 size={20} color="#fff" strokeWidth={2} />
                        </LinearGradient>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[s.headerTitle, { color: colors.textPrimary }]}>Báo cáo</Text>
                        <Text style={[s.headerSub, { color: colors.textMuted }]}>Tổng quan doanh thu & chi phí</Text>
                    </View>
                    <Pressable style={[s.backBtn, { backgroundColor: colors.inputBg }]} onPress={load}>
                        <RefreshCw size={18} color={colors.textSecondary} />
                    </Pressable>
                </Animated.View>

                <ScrollView
                    contentContainerStyle={s.scroll}
                    showsVerticalScrollIndicator={false}
                    style={{ flex: 1 }}
                >
                    {/* KPI Row 1 */}
                    <View style={s.kpiRow}>
                        <KpiCard title="Doanh thu" value={fmtM(totalRevenue) + ' \u20AB'}
                            sub={`${salesOrders.length} đơn`} Icon={DollarSign} color="#34D399" trend="up" delay={80} colors={colors} />
                        <KpiCard title="Chi phi mua" value={fmtM(totalCost) + ' \u20AB'}
                            sub={`${purchaseOrders.length} đơn`} Icon={ShoppingCart} color="#818CF8" delay={160} colors={colors} />
                    </View>
                    <View style={[s.kpiRow, { marginTop: Spacing.md }]}>
                        <KpiCard title="Phai thu" value={fmtM(totalReceivable) + ' \u20AB'}
                            sub={`${receivables.length} KH`} Icon={TrendingUp} color="#38BDF8" delay={240} colors={colors} />
                        <KpiCard title="Phai tra" value={fmtM(totalPayable) + ' \u20AB'}
                            sub={`${payables.length} NCC`} Icon={TrendingDown} color="#F87171" delay={320} colors={colors} />
                    </View>

                    {/* Revenue Bar Chart */}
                    <Animated.View entering={FadeInUp.duration(400).delay(200).springify().damping(18)} style={[s.card, { borderColor: colors.cardBorder }]}>
                        <BlurView intensity={20} tint={colors.blurTint} style={StyleSheet.absoluteFill} />
                        <View style={[s.cardInner, { backgroundColor: colors.cardBg }]}>
                            <View style={s.chartHeader}>
                                <View style={[s.chartDot, { backgroundColor: '#34D399' }]} />
                                <Text style={[s.chartTitle, { color: colors.textPrimary }]}>Doanh thu ban hang (\u20AB)</Text>
                            </View>
                            <BarChart data={revenueByMonth} color1="#34D399" color2="#10B981" gradId="rev" lineColor={colors.divider} labelColor={colors.textMuted} />
                            <View style={s.chartLegend}>
                                <Text style={[s.legendMax, { color: colors.chevronColor }]}>Max: {fmtCurrency(Math.max(...revenueByMonth.map(d => d.value)))}</Text>
                                <Text style={[s.legendTotal, { color: colors.textSecondary }]}>Tổng: {fmtCurrency(totalRevenue)}</Text>
                            </View>
                        </View>
                    </Animated.View>

                    {/* Purchase Cost Bar Chart */}
                    <Animated.View entering={FadeInUp.duration(400).delay(280).springify().damping(18)} style={[s.card, { borderColor: colors.cardBorder }]}>
                        <BlurView intensity={20} tint={colors.blurTint} style={StyleSheet.absoluteFill} />
                        <View style={[s.cardInner, { backgroundColor: colors.cardBg }]}>
                            <View style={s.chartHeader}>
                                <View style={[s.chartDot, { backgroundColor: '#818CF8' }]} />
                                <Text style={[s.chartTitle, { color: colors.textPrimary }]}>Chi phi mua hang (\u20AB)</Text>
                            </View>
                            <BarChart data={purchaseCostByMonth} color1="#818CF8" color2="#6366F1" gradId="pur" lineColor={colors.divider} labelColor={colors.textMuted} />
                            <View style={s.chartLegend}>
                                <Text style={[s.legendMax, { color: colors.chevronColor }]}>Max: {fmtCurrency(Math.max(...purchaseCostByMonth.map(d => d.value)))}</Text>
                                <Text style={[s.legendTotal, { color: colors.textSecondary }]}>Tổng: {fmtCurrency(totalCost)}</Text>
                            </View>
                        </View>
                    </Animated.View>

                    {/* Donut + Sales Status */}
                    <Animated.View entering={FadeInUp.duration(400).delay(340).springify().damping(18)} style={[s.card, { borderColor: colors.cardBorder }]}>
                        <BlurView intensity={20} tint={colors.blurTint} style={StyleSheet.absoluteFill} />
                        <View style={[s.cardInner, { backgroundColor: colors.cardBg }]}>
                            <View style={s.chartHeader}>
                                <View style={[s.chartDot, { backgroundColor: '#F59E0B' }]} />
                                <Text style={[s.chartTitle, { color: colors.textPrimary }]}>Trạng thái đơn bán hàng</Text>
                            </View>
                            <View style={s.donutRow}>
                                <DonutChart 
                                    segments={salesStatusBreakdown.length > 0 ? salesStatusBreakdown : [{ value: 1, color: '#1E293B', label: 'Không có' }]}
                                    centerBg={isDark ? 'rgba(15,23,42,0.95)' : 'rgba(241,245,249,0.95)'}
                                    textPrimary={colors.textPrimary}
                                    textMuted={colors.textMuted}
                                />
                                <View style={s.legendList}>
                                    {salesStatusBreakdown.map((seg, i) => (
                                        <View key={i} style={s.legendItem}>
                                            <View style={[s.legendDot, { backgroundColor: seg.color }]} />
                                            <Text style={[s.legendLabel, { color: colors.textSecondary }]} numberOfLines={1}>{seg.label}</Text>
                                            <Text style={[s.legendVal, { color: seg.color }]}>{seg.value}</Text>
                                        </View>
                                    ))}
                                    {salesStatusBreakdown.length === 0 && (
                                        <Text style={{ color: colors.chevronColor, fontSize: 12 }}>Chưa có dữ liệu</Text>
                                    )}
                                </View>
                            </View>
                        </View>
                    </Animated.View>

                    {/* AR vs AP Comparison */}
                    <Animated.View entering={FadeInUp.duration(400).delay(400).springify().damping(18)} style={[s.card, { borderColor: colors.cardBorder }]}>
                        <BlurView intensity={20} tint={colors.blurTint} style={StyleSheet.absoluteFill} />
                        <View style={[s.cardInner, { backgroundColor: colors.cardBg }]}>
                            <View style={s.chartHeader}>
                                <View style={[s.chartDot, { backgroundColor: '#38BDF8' }]} />
                                <Text style={[s.chartTitle, { color: colors.textPrimary }]}>Công nợ phải thu vs phải trả</Text>
                            </View>
                            <View style={s.arApRow}>
                                {/* Receivable */}
                                <View style={s.arApItem}>
                                    <Text style={[s.arApLabel, { color: colors.textMuted }]}>Phải thu</Text>
                                    <Text style={[s.arApVal, { color: '#38BDF8' }]}>{fmtCurrency(totalReceivable)}</Text>
                                    <HBar value={totalReceivable} max={maxArAp} color="#38BDF8" barBg={colors.divider} />
                                </View>
                                {/* Payable */}
                                <View style={s.arApItem}>
                                    <Text style={[s.arApLabel, { color: colors.textMuted }]}>Phải trả</Text>
                                    <Text style={[s.arApVal, { color: '#F87171' }]}>{fmtCurrency(totalPayable)}</Text>
                                    <HBar value={totalPayable} max={maxArAp} color="#F87171" barBg={colors.divider} />
                                </View>
                                {/* Net */}
                                <View style={[s.netBox, { backgroundColor: totalReceivable >= totalPayable ? 'rgba(52,211,153,0.12)' : 'rgba(248,113,113,0.12)' }]}>
                                    <Text style={[s.arApLabel, { color: colors.textMuted }]}>Chênh lệch</Text>
                                    <Text style={[s.arApVal, { color: totalReceivable >= totalPayable ? '#34D399' : '#F87171', fontSize: 16 }]}>
                                        {totalReceivable >= totalPayable ? '+' : ''}{fmtCurrency(totalReceivable - totalPayable)}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </Animated.View>

                    {/* Profit Estimate */}
                    <Animated.View entering={FadeInUp.duration(400).delay(460).springify().damping(18)} style={[s.card, { borderColor: colors.cardBorder }]}>
                        <BlurView intensity={20} tint={colors.blurTint} style={StyleSheet.absoluteFill} />
                        <View style={[s.cardInner, { backgroundColor: colors.cardBg }]}>
                            <View style={s.chartHeader}>
                                <View style={[s.chartDot, { backgroundColor: '#F59E0B' }]} />
                                <Text style={[s.chartTitle, { color: colors.textPrimary }]}>Lợi nhuận gộp ước tính</Text>
                            </View>
                            <View style={s.profitRow}>
                                <View style={s.profitItem}>
                                    <Text style={[s.arApLabel, { color: colors.textMuted }]}>Doanh thu</Text>
                                    <Text style={[s.arApVal, { color: '#34D399' }]}>+ {fmtCurrency(totalRevenue)}</Text>
                                </View>
                                <View style={s.profitItem}>
                                    <Text style={[s.arApLabel, { color: colors.textMuted }]}>Chi phí mua</Text>
                                    <Text style={[s.arApVal, { color: '#F87171' }]}>- {fmtCurrency(totalCost)}</Text>
                                </View>
                                <View style={[s.netBox, {
                                    backgroundColor: (totalRevenue - totalCost) >= 0 ? 'rgba(52,211,153,0.15)' : 'rgba(248,113,113,0.15)',
                                    borderWidth: 1,
                                    borderColor: (totalRevenue - totalCost) >= 0 ? 'rgba(52,211,153,0.3)' : 'rgba(248,113,113,0.3)',
                                }]}>
                                    <Text style={[s.arApLabel, { color: colors.textMuted }]}>Lợi nhuận gộp</Text>
                                    <Text style={[s.arApVal, {
                                        fontSize: 20, fontWeight: '800',
                                        color: (totalRevenue - totalCost) >= 0 ? '#34D399' : '#F87171',
                                    }]}>
                                        {(totalRevenue - totalCost) >= 0 ? '+' : ''}{fmtCurrency(totalRevenue - totalCost)}
                                    </Text>
                                    {totalRevenue > 0 && (
                                        <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 4 }}>
                                            Biên lợi nhuận: {((totalRevenue - totalCost) / totalRevenue * 100).toFixed(1)}%
                                        </Text>
                                    )}
                                </View>
                            </View>
                        </View>
                    </Animated.View>

                    <View style={{ height: 120 }} />
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const s = StyleSheet.create({
    root: { flex: 1 },
    safe: { flex: 1 },
    orb: {
        position: 'absolute', top: -60, right: -60, width: 220, height: 220,
        borderRadius: 110,
    },
    header: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
        paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, paddingBottom: Spacing.md,
    },
    backBtn: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    headerIcon: { marginRight: 4 },
    iconGrad: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: FontSizes.lg, fontWeight: FontWeights.bold },
    headerSub: { fontSize: FontSizes.xs, marginTop: 1 },
    scroll: { paddingHorizontal: Spacing.xl },
    kpiRow: { flexDirection: 'row', gap: Spacing.md },
    card: {
        borderRadius: 24, overflow: 'hidden', borderWidth: 1,
        marginTop: Spacing.lg,
    },
    cardInner: { padding: Spacing.lg },
    chartHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.md },
    chartDot: { width: 10, height: 10, borderRadius: 5 },
    chartTitle: { fontSize: FontSizes.sm, fontWeight: FontWeights.semibold, flex: 1 },
    chartLegend: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
    legendMax: { fontSize: 10 },
    legendTotal: { fontSize: 10, fontWeight: '600' },
    donutRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg },
    legendList: { flex: 1, gap: 8 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    legendDot: { width: 8, height: 8, borderRadius: 4 },
    legendLabel: { flex: 1, fontSize: 11 },
    legendVal: { fontSize: 13, fontWeight: '700' },
    arApRow: { gap: Spacing.md },
    arApItem: { gap: 6 },
    arApLabel: { fontSize: FontSizes.xs },
    arApVal: { fontSize: FontSizes.base, fontWeight: '700' },
    netBox: { borderRadius: 16, padding: Spacing.md, marginTop: 4 },
    profitRow: { gap: Spacing.md },
    profitItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
