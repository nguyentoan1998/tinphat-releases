// Production Reports Screen — Manufacturing Analytics
import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import { BarChart3, ChevronLeft, RefreshCw, TrendingUp, Package, Users, CheckCircle2 } from 'lucide-react-native';
import Svg, { Rect, Line, Text as SvgText, Defs, LinearGradient as SvgGrad, Stop, G } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';

import { productionOrderApi, ProductionOrder } from '@/lib/production-order-api';
import { productOutputApi, ProductOutput } from '@/lib/product-output-api';
import { productionPlanApi, ProductionPlan } from '@/lib/production-plan-api';
import { Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants/Tokens';
import { useThemeStore } from '@/store';
import { ThemeColors } from '@/constants/ThemeColors';

const { width: SW } = Dimensions.get('window');
const CHART_W = SW - Spacing.xl * 2 - 32;
const MONTHS_VI = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];
const fmtNum = (n: number) => n.toLocaleString('vi-VN');

function BarChart({ data, color1, color2, gid, lineColor, labelColor }: { data: { label: string; value: number }[]; color1: string; color2: string; gid: string; lineColor: string; labelColor: string }) {
    const max = Math.max(...data.map(d => d.value), 1);
    const H = 140; const barGap = 5;
    const barW = Math.max(10, (CHART_W - barGap * (data.length + 1)) / data.length);
    return (
        <Svg width={CHART_W} height={H + 20}>
            <Defs>
                <SvgGrad id={gid} x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor={color1} stopOpacity="1" />
                    <Stop offset="1" stopColor={color2} stopOpacity="0.2" />
                </SvgGrad>
            </Defs>
            {[0.33, 0.66, 1].map((t, i) => (
                <Line key={i} x1={0} y1={H - H * t} x2={CHART_W} y2={H - H * t} stroke={lineColor} strokeWidth={1} />
            ))}
            {data.map((d, i) => {
                const bH = Math.max(3, (d.value / max) * H);
                const x = barGap + i * (barW + barGap);
                return (
                    <G key={i}>
                        <Rect x={x} y={H - bH} width={barW} height={bH} fill={`url(#${gid})`} rx={3} />
                        <SvgText x={x + barW / 2} y={H + 14} textAnchor="middle" fill={labelColor} fontSize={9}>{d.label}</SvgText>
                    </G>
                );
            })}
        </Svg>
    );
}

function KpiCard({ label, value, sub, Icon, color, delay, colors }: any) {
    return (
        <Animated.View entering={FadeInUp.duration(400).delay(delay).springify().damping(18)} style={[kpi.wrap, { borderColor: colors.cardBorder }]}>
            <BlurView intensity={20} tint={colors.blurTint} style={StyleSheet.absoluteFill} />
            <View style={[kpi.inner, { backgroundColor: colors.cardBg }]}>
                <View style={[kpi.icon, { backgroundColor: color + '20' }]}><Icon size={18} color={color} /></View>
                <Text style={[kpi.label, { color: colors.textMuted }]}>{label}</Text>
                <Text style={[kpi.value, { color }]}>{value}</Text>
                {sub ? <Text style={[kpi.sub, { color: colors.textMuted }]}>{sub}</Text> : null}
            </View>
        </Animated.View>
    );
}
const kpi = StyleSheet.create({
    wrap: { flex: 1, borderRadius: 18, overflow: 'hidden', borderWidth: 1 },
    inner: { padding: Spacing.md },
    icon: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
    label: { fontSize: 10 },
    value: { fontSize: 17, fontWeight: '800', marginTop: 2 },
    sub: { fontSize: 10, marginTop: 2 },
});

export default function ProductionReportsScreen() {
    const router = useRouter();
    const [orders, setOrders] = useState<ProductionOrder[]>([]);
    const [outputs, setOutputs] = useState<ProductOutput[]>([]);
    const [plans, setPlans] = useState<ProductionPlan[]>([]);
    const [loading, setLoading] = useState(true);
    const { isDark } = useThemeStore();
    const colors = ThemeColors.light;

    const load = async () => {
        setLoading(true);
        const [o, out, p] = await Promise.allSettled([
            productionOrderApi.getOrders(),
            productOutputApi.getOutputs(),
            productionPlanApi.getPlans(),
        ]);
        if (o.status === 'fulfilled') setOrders(Array.isArray(o.value) ? o.value : []);
        if (out.status === 'fulfilled') setOutputs(Array.isArray(out.value) ? out.value : []);
        if (p.status === 'fulfilled') setPlans(Array.isArray(p.value) ? p.value : []);
        setLoading(false);
    };
    useEffect(() => { load(); }, []);

    const outputByMonth = useMemo(() => {
        const map: Record<number, number> = {};
        outputs.forEach(o => { const m = new Date(o.outputDate).getMonth(); map[m] = (map[m] || 0) + Number(o.quantity || 0); });
        return MONTHS_VI.map((label, i) => ({ label, value: map[i] || 0 }));
    }, [outputs]);

    const ordersByMonth = useMemo(() => {
        const map: Record<number, number> = {};
        orders.forEach(o => { const m = new Date(o.createdAt).getMonth(); map[m] = (map[m] || 0) + 1; });
        return MONTHS_VI.map((label, i) => ({ label, value: map[i] || 0 }));
    }, [orders]);

    const topEmployees = useMemo(() => {
        const map: Record<string, { name: string; qty: number }> = {};
        outputs.forEach(o => {
            const id = o.employeeId;
            if (!map[id]) map[id] = { name: o.Employee?.fullName || id, qty: 0 };
            map[id].qty += Number(o.quantity || 0);
        });
        return Object.values(map).sort((a, b) => b.qty - a.qty).slice(0, 5);
    }, [outputs]);

    const totalProduced = useMemo(() => outputs.reduce((s, o) => s + Number(o.quantity || 0), 0), [outputs]);
    const completionRate = useMemo(() => orders.length > 0 ? (orders.filter(o => o.status === 'COMPLETED').length / orders.length * 100).toFixed(1) : '0', [orders]);
    const verifyRate = useMemo(() => outputs.length > 0 ? (outputs.filter(o => o.verified).length / outputs.length * 100).toFixed(1) : '0', [outputs]);

    return (
        <View style={s.root}>
            <StatusBar style={isDark ? "light" : "dark"} />
            <LinearGradient colors={colors.gradientColors} style={StyleSheet.absoluteFill} />

            <SafeAreaView style={s.safe} edges={['top']}>
                <Animated.View entering={FadeInDown.duration(400)} style={s.header}>
                    <Pressable style={[s.backBtn, { backgroundColor: colors.inputBg }]} onPress={() => router.replace('/(tabs)/production')}>
                        <ChevronLeft size={22} color={colors.textSecondary} />
                    </Pressable>
                    <View style={s.headerIcon}>
                        <LinearGradient colors={['#14B8A6', '#2DD4BF']} style={s.iconGrad}>
                            <BarChart3 size={20} color="#fff" strokeWidth={2} />
                        </LinearGradient>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[s.headerTitle, { color: colors.textPrimary }]}>Báo cáo SX</Text>
                        <Text style={[s.headerSub, { color: colors.textMuted }]}>Sản lượng & hiệu suất</Text>
                    </View>
                    <Pressable style={[s.backBtn, { backgroundColor: colors.inputBg }]} onPress={load}>
                        <RefreshCw size={16} color={colors.textSecondary} />
                    </Pressable>
                </Animated.View>

                <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
                    <View style={s.kpiRow}>
                        <KpiCard label="Tổng lệnh SX" value={orders.length} sub={`${orders.filter(o => o.status === 'IN_PROGRESS').length} đang chạy`} Icon={Package} color="#818CF8" delay={80} colors={colors} />
                        <KpiCard label="Sản lượng" value={fmtNum(totalProduced)} sub="tổng sản phẩm" Icon={TrendingUp} color="#34D399" delay={140} colors={colors} />
                    </View>
                    <View style={[s.kpiRow, { marginTop: Spacing.md }]}>
                        <KpiCard label="Tỷ lệ hoàn thành" value={completionRate + '%'} sub="lệnh SX" Icon={CheckCircle2} color="#FBBF24" delay={200} colors={colors} />
                        <KpiCard label="Tỷ lệ QC" value={verifyRate + '%'} sub="sản lượng đã duyệt" Icon={BarChart3} color="#38BDF8" delay={260} colors={colors} />
                    </View>

                    {/* Output by month */}
                    <Animated.View entering={FadeInUp.duration(400).delay(180).springify().damping(18)} style={[s.card, { borderColor: colors.cardBorder }]}>
                        <BlurView intensity={20} tint={colors.blurTint} style={StyleSheet.absoluteFill} />
                        <View style={[s.cardInner, { backgroundColor: colors.cardBg }]}>
                            <View style={s.chartHdr}>
                                <View style={[s.dot, { backgroundColor: '#34D399' }]} />
                                <Text style={[s.chartTitle, { color: colors.textPrimary }]}>Sản lượng theo tháng</Text>
                            </View>
                            <BarChart data={outputByMonth} color1="#34D399" color2="#10B981" gid="out" lineColor={colors.divider} labelColor={colors.textMuted} />
                            <Text style={[s.chartNote, { color: colors.textMuted }]}>Tổng: {fmtNum(totalProduced)} sản phẩm</Text>
                        </View>
                    </Animated.View>

                    {/* Orders by month */}
                    <Animated.View entering={FadeInUp.duration(400).delay(260).springify().damping(18)} style={[s.card, { borderColor: colors.cardBorder }]}>
                        <BlurView intensity={20} tint={colors.blurTint} style={StyleSheet.absoluteFill} />
                        <View style={[s.cardInner, { backgroundColor: colors.cardBg }]}>
                            <View style={s.chartHdr}>
                                <View style={[s.dot, { backgroundColor: '#818CF8' }]} />
                                <Text style={[s.chartTitle, { color: colors.textPrimary }]}>Lệnh sản xuất theo tháng</Text>
                            </View>
                            <BarChart data={ordersByMonth} color1="#818CF8" color2="#6366F1" gid="ord" lineColor={colors.divider} labelColor={colors.textMuted} />
                            <Text style={[s.chartNote, { color: colors.textMuted }]}>Tổng: {orders.length} lệnh</Text>
                        </View>
                    </Animated.View>

                    {/* Top Employees */}
                    {topEmployees.length > 0 && (
                        <Animated.View entering={FadeInUp.duration(400).delay(320).springify().damping(18)} style={[s.card, { borderColor: colors.cardBorder }]}>
                            <BlurView intensity={20} tint={colors.blurTint} style={StyleSheet.absoluteFill} />
                            <View style={[s.cardInner, { backgroundColor: colors.cardBg }]}>
                                <View style={s.chartHdr}>
                                    <View style={[s.dot, { backgroundColor: '#FBBF24' }]} />
                                    <Text style={[s.chartTitle, { color: colors.textPrimary }]}>Top nhân viên sản xuất</Text>
                                </View>
                                {topEmployees.map((emp, i) => {
                                    const maxQ = topEmployees[0].qty;
                                    const pct = maxQ > 0 ? emp.qty / maxQ : 0;
                                    const rankColors = ['#FBBF24', '#818CF8', '#34D399', '#38BDF8', '#F87171'];
                                    return (
                                        <View key={i} style={s.empRow}>
                                            <View style={[s.rank, { backgroundColor: rankColors[i] + '22' }]}>
                                                <Text style={[s.rankT, { color: rankColors[i] }]}>#{i + 1}</Text>
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <View style={s.empHdr}>
                                                    <Text style={[s.empName, { color: colors.textPrimary }]} numberOfLines={1}>{emp.name}</Text>
                                                    <Text style={[s.empQty, { color: rankColors[i] }]}>{fmtNum(emp.qty)} sp</Text>
                                                </View>
                                                <View style={[s.barBg, { backgroundColor: colors.divider }]}>
                                                    <View style={[s.barFill, { width: `${Math.round(pct * 100)}%`, backgroundColor: rankColors[i] }]} />
                                                </View>
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>
                        </Animated.View>
                    )}

                    {/* Status breakdown */}
                    <Animated.View entering={FadeInUp.duration(400).delay(380).springify().damping(18)} style={[s.card, { borderColor: colors.cardBorder }]}>
                        <BlurView intensity={20} tint={colors.blurTint} style={StyleSheet.absoluteFill} />
                        <View style={[s.cardInner, { backgroundColor: colors.cardBg }]}>
                            <View style={s.chartHdr}>
                                <View style={[s.dot, { backgroundColor: '#38BDF8' }]} />
                                <Text style={[s.chartTitle, { color: colors.textPrimary }]}>Trạng thái lệnh SX</Text>
                            </View>
                            {[
                                { status: 'PLANNED', label: 'Kế hoạch', color: '#F59E0B' },
                                { status: 'IN_PROGRESS', label: 'Đang SX', color: '#6366F1' },
                                { status: 'COMPLETED', label: 'Hoàn thành', color: '#10B981' },
                                { status: 'CANCELLED', label: 'Đã hủy', color: '#EF4444' },
                            ].map(({ status, label, color }) => {
                                const cnt = orders.filter(o => o.status === status).length;
                                const pct = orders.length > 0 ? cnt / orders.length : 0;
                                return (
                                    <View key={status} style={s.statusRow}>
                                        <View style={[s.statusDot, { backgroundColor: color }]} />
                                        <Text style={[s.statusLabel, { color: colors.textMuted }]}>{label}</Text>
                                        <View style={[s.statusBarWrap, { backgroundColor: colors.divider }]}>
                                            <View style={[s.statusBar, { width: `${Math.round(pct * 100)}%`, backgroundColor: color }]} />
                                        </View>
                                        <Text style={[s.statusCount, { color }]}>{cnt}</Text>
                                    </View>
                                );
                            })}
                        </View>
                    </Animated.View>
                    <View style={{ height: 100 }} />
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const s = StyleSheet.create({
    root: { flex: 1 }, safe: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
    backBtn: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    headerIcon: { marginRight: 4 },
    iconGrad: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: FontSizes.lg, fontWeight: FontWeights.bold },
    headerSub: { fontSize: FontSizes.xs, marginTop: 1 },
    scroll: { paddingHorizontal: Spacing.xl },
    kpiRow: { flexDirection: 'row', gap: Spacing.md },
    card: { borderRadius: 22, overflow: 'hidden', borderWidth: 1, marginTop: Spacing.lg },
    cardInner: { padding: Spacing.lg },
    chartHdr: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.md },
    dot: { width: 10, height: 10, borderRadius: 5 },
    chartTitle: { fontSize: FontSizes.sm, fontWeight: FontWeights.semibold, flex: 1 },
    chartNote: { fontSize: 10, marginTop: 4, textAlign: 'right' },
    empRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 10 },
    rank: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    rankT: { fontSize: 11, fontWeight: '800' },
    empHdr: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    empName: { fontSize: FontSizes.sm, fontWeight: FontWeights.medium, flex: 1 },
    empQty: { fontSize: FontSizes.sm, fontWeight: '700' },
    barBg: { height: 5, borderRadius: 3 },
    barFill: { height: 5, borderRadius: 3 },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 10 },
    statusDot: { width: 8, height: 8, borderRadius: 4 },
    statusLabel: { fontSize: FontSizes.xs, width: 70 },
    statusBarWrap: { flex: 1, height: 6, borderRadius: 3 },
    statusBar: { height: 6, borderRadius: 3 },
    statusCount: { fontSize: FontSizes.sm, fontWeight: '700', width: 24, textAlign: 'right' },
});
