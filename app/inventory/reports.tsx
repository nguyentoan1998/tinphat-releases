// Inventory Reports Screen — Rich charts & analytics
import React, { useState, useEffect, useMemo } from 'react';
import {
    View, Text, StyleSheet, Pressable, ScrollView,
    RefreshControl, Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import {
    BarChart3, ChevronLeft, TrendingUp, TrendingDown,
    Package2, Warehouse, ArrowDownCircle, ArrowUpCircle,
    RefreshCw, AlertTriangle,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';

import { inventoryApi, Stock } from '@/lib/inventory-api';
import { Spacing, FontSizes, FontWeights } from '@/constants/Tokens';
import { useThemeStore } from '@/store';
import { ThemeColors } from '@/constants/ThemeColors';
import { useDarkDialog } from '@/components/ui/DarkDialog';

const { width: SCREEN_W } = Dimensions.get('window');
const fmtCurrency = (n: number) =>
    n >= 1_000_000 ? (n / 1_000_000).toFixed(1) + 'M' :
        n >= 1_000 ? (n / 1_000).toFixed(0) + 'K' :
            n.toLocaleString('vi-VN');
const fmtFull = (n: number) => n.toLocaleString('vi-VN') + 'đ';

// ─── Mini Bar Chart ──────────────────────────────────────────────────────────
function BarChartMini({
    data, color, maxH = 80,
}: { data: { label: string; value: number }[]; color: string; maxH?: number }) {
    const max = Math.max(...data.map(d => d.value), 1);
    return (
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: maxH + 28 }}>
            {data.map((d, i) => {
                const h = Math.max(4, Math.round((d.value / max) * maxH));
                return (
                    <View key={i} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                        <Text style={{ fontSize: 9, color, fontWeight: '600' }}>
                            {d.value > 0 ? d.value : ''}
                        </Text>
                        <View style={{ width: '80%', height: h, borderRadius: 5, backgroundColor: color + 'CC' }} />
                        <Text style={{ fontSize: 8, color: '#9CA3AF', textAlign: 'center' }} numberOfLines={1}>
                            {d.label}
                        </Text>
                    </View>
                );
            })}
        </View>
    );
}

// ─── Horizontal Bar (for warehouse breakdown) ─────────────────────────────────
function HBarRow({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
    const pct = max > 0 ? value / max : 0;
    const barW = Math.max(4, Math.round(pct * (SCREEN_W - 120)));
    return (
        <View style={{ marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ fontSize: FontSizes.xs, color: '#9CA3AF' }} numberOfLines={1}>{label}</Text>
                <Text style={{ fontSize: FontSizes.xs, color, fontWeight: '700' }}>{fmtCurrency(value)}</Text>
            </View>
            <View style={{ height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.07)' }}>
                <View style={{ width: barW, height: 8, borderRadius: 4, backgroundColor: color }} />
            </View>
        </View>
    );
}

// ─── Donut / Pie Segment ──────────────────────────────────────────────────────
function DonutLegend({ items }: { items: { label: string; value: number; color: string }[] }) {
    const total = items.reduce((s, i) => s + i.value, 0);
    return (
        <View style={{ gap: 8 }}>
            {items.map((it) => (
                <View key={it.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: it.color }} />
                    <Text style={{ flex: 1, fontSize: FontSizes.xs, color: '#9CA3AF' }}>{it.label}</Text>
                    <Text style={{ fontSize: FontSizes.xs, color: it.color, fontWeight: '700' }}>
                        {total > 0 ? Math.round((it.value / total) * 100) : 0}%
                    </Text>
                    <Text style={{ fontSize: FontSizes.xs, color: '#6B7280', minWidth: 40, textAlign: 'right' }}>
                        {it.value}
                    </Text>
                </View>
            ))}
        </View>
    );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function InventoryReportsScreen() {
    const router = useRouter();
    const [stock, setStock] = useState<Stock[]>([]);
    const [ins, setIns] = useState<any[]>([]);
    const [outs, setOuts] = useState<any[]>([]);
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const { isDark } = useThemeStore();
    const colors = ThemeColors.light;
    const { showDialog, DialogComponent } = useDarkDialog();

    useEffect(() => { load(); }, []);

    const load = async () => {
        try {
            setLoading(true);
            const [stockRes, insRes, outsRes, whRes] = await Promise.all([
                inventoryApi.getStock().catch(() => []),
                inventoryApi.getInbound().catch(() => []),
                inventoryApi.getOutbound().catch(() => []),
                inventoryApi.getWarehouses().catch(() => []),
            ]);
            setStock(Array.isArray(stockRes) ? stockRes : []);
            setIns(Array.isArray(insRes) ? insRes : []);
            setOuts(Array.isArray(outsRes) ? outsRes : []);
            setWarehouses(Array.isArray(whRes) ? whRes : []);
        } catch (e: any) {
            showDialog('Lỗi', 'Không thể tải báo cáo kho');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // ── Computed analytics ────────────────────────────────────────────────────
    const totalValue = useMemo(
        () => stock.reduce((s, x) => s + Number(x.quantity) * 0, 0),
        [stock]
    );
    const totalQty = useMemo(() => stock.reduce((s, x) => s + Number(x.quantity), 0), [stock]);
    const lowStock = useMemo(() => stock.filter(x => Number(x.quantity) <= 5).length, [stock]);

    // Warehouse breakdown by value
    const warehouseBreakdown = useMemo(() => {
        const map: Record<string, { name: string; value: number; qty: number }> = {};
        stock.forEach(x => {
            const wId = x.warehouseId;
            const wName = warehouses.find(w => w.id === wId)?.name || wId.slice(0, 8);
            if (!map[wId]) map[wId] = { name: wName, value: 0, qty: 0 };
            map[wId].value += Number(x.quantity) * 0;
            map[wId].qty += Number(x.quantity);
        });
        return Object.values(map).sort((a, b) => b.value - a.value).slice(0, 6);
    }, [stock, warehouses]);
    const maxWhValue = Math.max(...warehouseBreakdown.map(w => w.value), 1);

    // Movement bar chart: last 7 days
    const movementChart = useMemo(() => {
        const days: { label: string; in: number; out: number }[] = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const key = d.toISOString().slice(0, 10);
            const label = `${d.getDate()}/${d.getMonth() + 1}`;
            const inCount = ins.filter(m => (m.createdAt || '').startsWith(key)).length;
            const outCount = outs.filter(m => (m.createdAt || '').startsWith(key)).length;
            days.push({ label, in: inCount, out: outCount });
        }
        return days;
    }, [ins, outs]);

    // Product type breakdown
    const productTypeData = useMemo(() => {
        const map: Record<string, number> = {};
        stock.forEach(x => {
            const type = x.Product?.productType || 'OTHER';
            map[type] = (map[type] || 0) + 1;
        });
        const typeColors: Record<string, string> = {
            RAW_MATERIAL: '#F59E0B', SEMI_FINISHED: '#3B82F6',
            FINISHED_PRODUCT: '#10B981', TOOLS: '#8B5CF6',
            BOLTS: '#EC4899', NYLON: '#06B6D4', OTHER: '#6B7280',
        };
        const typeLabels: Record<string, string> = {
            RAW_MATERIAL: 'Nguyên liệu', SEMI_FINISHED: 'BTP',
            FINISHED_PRODUCT: 'Thành phẩm', TOOLS: 'Công cụ',
            BOLTS: 'Bulong', NYLON: 'Nilon', OTHER: 'Khác',
        };
        return Object.entries(map)
            .map(([k, v]) => ({ label: typeLabels[k] || k, value: v, color: typeColors[k] || '#6B7280' }))
            .sort((a, b) => b.value - a.value);
    }, [stock]);

    const CARD_BG = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.85)';
    const BORDER = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)';

    const summaryCards = [
        { label: 'Mặt hàng tồn', value: stock.length, color: '#38BDF8', Icon: Package2, sub: `${totalQty.toLocaleString('vi-VN')} đơn vị` },
        { label: 'Giá trị tồn kho', value: fmtFull(totalValue), color: '#34D399', Icon: Warehouse, sub: `${warehouseBreakdown.length} kho` },
        { label: 'Nhập kho', value: ins.length, color: '#818CF8', Icon: ArrowDownCircle, sub: '30 ngày gần nhất' },
        { label: 'Xuất kho', value: outs.length, color: '#FB923C', Icon: ArrowUpCircle, sub: '30 ngày gần nhất' },
    ];

    return (
        <View style={s.root}>
            <StatusBar style={isDark ? 'light' : 'dark'} />
            <LinearGradient colors={colors.gradientColors} style={StyleSheet.absoluteFill} />
            <SafeAreaView style={s.safe} edges={['top']}>

                {/* Header */}
                <Animated.View entering={FadeInDown.duration(400)} style={s.header}>
                    <Pressable style={[s.iconBtn, { backgroundColor: colors.inputBg }]} onPress={() => router.replace('/(tabs)/inventory')}>
                        <ChevronLeft size={20} color={colors.textSecondary} />
                    </Pressable>
                    <View style={s.headerIcon}>
                        <LinearGradient colors={['#6366F1', '#818CF8']} style={s.iconGrad}>
                            <BarChart3 size={20} color="#fff" strokeWidth={2} />
                        </LinearGradient>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[s.title, { color: colors.textPrimary }]}>Báo cáo kho</Text>
                        <Text style={[s.sub, { color: colors.textMuted }]}>Thống kê & phân tích tồn kho</Text>
                    </View>
                    <Pressable style={[s.iconBtn, { backgroundColor: colors.inputBg }]} onPress={() => { setRefreshing(true); load(); }}>
                        <RefreshCw size={16} color={colors.textSecondary} />
                    </Pressable>
                </Animated.View>

                <ScrollView
                    contentContainerStyle={s.scroll}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#818CF8" />}
                >
                    {loading ? (
                        <View style={{ paddingTop: 80, alignItems: 'center' }}>
                            <Text style={[s.emptyT, { color: colors.textMuted }]}>Đang tải báo cáo...</Text>
                        </View>
                    ) : (
                        <>
                            {/* ── Summary Cards ── */}
                            <Animated.View entering={FadeInUp.duration(400).delay(60).springify().damping(18)}>
                                <Text style={[s.sectionTitle, { color: colors.textPrimary }]}>Tổng quan</Text>
                                <View style={s.grid2}>
                                    {summaryCards.map((c, i) => (
                                        <Animated.View key={c.label} entering={FadeInUp.duration(350).delay(80 + i * 50).springify().damping(18)}
                                            style={[s.summCard, { borderColor: BORDER }]}>
                                            <BlurView intensity={20} tint={colors.blurTint} style={StyleSheet.absoluteFill} />
                                            <View style={[s.summInner, { backgroundColor: CARD_BG }]}>
                                                <View style={[s.summIcon, { backgroundColor: c.color + '22' }]}>
                                                    <c.Icon size={18} color={c.color} />
                                                </View>
                                                <Text style={[s.summVal, { color: c.color }]} numberOfLines={1}>{c.value}</Text>
                                                <Text style={[s.summLabel, { color: colors.textPrimary }]}>{c.label}</Text>
                                                <Text style={[s.summSub, { color: colors.textMuted }]}>{c.sub}</Text>
                                            </View>
                                        </Animated.View>
                                    ))}
                                </View>
                            </Animated.View>

                            {/* ── Low Stock Alert ── */}
                            {lowStock > 0 && (
                                <Animated.View entering={FadeInUp.duration(400).delay(200).springify().damping(18)}
                                    style={[s.alertCard, { borderColor: 'rgba(251,146,60,0.4)', backgroundColor: isDark ? 'rgba(251,146,60,0.1)' : 'rgba(251,146,60,0.07)' }]}>
                                    <AlertTriangle size={18} color="#FB923C" />
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontSize: FontSizes.sm, fontWeight: FontWeights.semibold, color: '#FB923C' }}>
                                            {lowStock} mặt hàng sắp hết tồn kho
                                        </Text>
                                        <Text style={{ fontSize: FontSizes.xs, color: '#9CA3AF', marginTop: 2 }}>
                                            Số lượng tồn ≤ 5 đơn vị
                                        </Text>
                                    </View>
                                </Animated.View>
                            )}

                            {/* ── Movement Chart last 7 days ── */}
                            <Animated.View entering={FadeInUp.duration(400).delay(240).springify().damping(18)}
                                style={[s.chartCard, { borderColor: BORDER }]}>
                                <BlurView intensity={20} tint={colors.blurTint} style={StyleSheet.absoluteFill} />
                                <View style={[s.chartInner, { backgroundColor: CARD_BG }]}>
                                    <View style={s.chartHeader}>
                                        <Text style={[s.chartTitle, { color: colors.textPrimary }]}>Nhập / Xuất 7 ngày gần nhất</Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', gap: 12, marginBottom: 14 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                                            <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: '#818CF8' }} />
                                            <Text style={{ fontSize: 11, color: '#9CA3AF' }}>Nhập</Text>
                                        </View>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                                            <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: '#FB923C' }} />
                                            <Text style={{ fontSize: 11, color: '#9CA3AF' }}>Xuất</Text>
                                        </View>
                                    </View>
                                    <View style={{ flexDirection: 'row', gap: 4 }}>
                                        {/* IN bars */}
                                        <View style={{ flex: 1 }}>
                                            <BarChartMini
                                                data={movementChart.map(d => ({ label: d.label, value: d.in }))}
                                                color="#818CF8"
                                                maxH={70}
                                            />
                                        </View>
                                    </View>
                                    <View style={{ marginTop: -12 }}>
                                        <BarChartMini
                                            data={movementChart.map(d => ({ label: d.label, value: d.out }))}
                                            color="#FB923C"
                                            maxH={70}
                                        />
                                    </View>
                                </View>
                            </Animated.View>

                            {/* ── Warehouse Value Breakdown ── */}
                            {warehouseBreakdown.length > 0 && (
                                <Animated.View entering={FadeInUp.duration(400).delay(300).springify().damping(18)}
                                    style={[s.chartCard, { borderColor: BORDER }]}>
                                    <BlurView intensity={20} tint={colors.blurTint} style={StyleSheet.absoluteFill} />
                                    <View style={[s.chartInner, { backgroundColor: CARD_BG }]}>
                                        <Text style={[s.chartTitle, { color: colors.textPrimary }]}>Giá trị theo kho</Text>
                                        <View style={{ marginTop: 12 }}>
                                            {warehouseBreakdown.map((w, i) => {
                                                const palette = ['#38BDF8', '#34D399', '#818CF8', '#F59E0B', '#FB923C', '#EC4899'];
                                                return (
                                                    <HBarRow
                                                        key={i}
                                                        label={w.name}
                                                        value={w.value}
                                                        max={maxWhValue}
                                                        color={palette[i % palette.length]}
                                                    />
                                                );
                                            })}
                                        </View>
                                    </View>
                                </Animated.View>
                            )}

                            {/* ── Product Type Breakdown ── */}
                            {productTypeData.length > 0 && (
                                <Animated.View entering={FadeInUp.duration(400).delay(360).springify().damping(18)}
                                    style={[s.chartCard, { borderColor: BORDER }]}>
                                    <BlurView intensity={20} tint={colors.blurTint} style={StyleSheet.absoluteFill} />
                                    <View style={[s.chartInner, { backgroundColor: CARD_BG }]}>
                                        <Text style={[s.chartTitle, { color: colors.textPrimary }]}>Phân loại sản phẩm</Text>
                                        <View style={{ marginTop: 14 }}>
                                            <DonutLegend items={productTypeData} />
                                        </View>
                                        {/* Progress bars as visual */}
                                        <View style={{ marginTop: 16, gap: 6 }}>
                                            {productTypeData.map((it) => {
                                                const total = productTypeData.reduce((s, x) => s + x.value, 0);
                                                const pct = total > 0 ? it.value / total : 0;
                                                return (
                                                    <View key={it.label} style={{ height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.07)' }}>
                                                        <View style={{ width: `${Math.round(pct * 100)}%`, height: 6, borderRadius: 3, backgroundColor: it.color }} />
                                                    </View>
                                                );
                                            })}
                                        </View>
                                    </View>
                                </Animated.View>
                            )}

                            {/* ── Top value items ── */}
                            <Animated.View entering={FadeInUp.duration(400).delay(420).springify().damping(18)}
                                style={[s.chartCard, { borderColor: BORDER }]}>
                                <BlurView intensity={20} tint={colors.blurTint} style={StyleSheet.absoluteFill} />
                                <View style={[s.chartInner, { backgroundColor: CARD_BG }]}>
                                    <Text style={[s.chartTitle, { color: colors.textPrimary }]}>Top 5 mặt hàng cao giá trị</Text>
                                    <View style={{ marginTop: 12, gap: 10 }}>
                                        {[...stock]
                                            .sort((a, b) => (Number(b.quantity) * 0) - (Number(a.quantity) * 0))
                                            .slice(0, 5)
                                            .map((x, i) => {
                                                const val = Number(x.quantity) * 0;
                                                const name = x.Product?.name || 'N/A';
                                                const spec = x.Product?.name || '';
                                                const rankColors = ['#F59E0B', '#94A3B8', '#B45309', '#0EA5E9', '#8B5CF6'];
                                                return (
                                                    <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                                        <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: rankColors[i] + '30', justifyContent: 'center', alignItems: 'center' }}>
                                                            <Text style={{ fontSize: 11, fontWeight: '800', color: rankColors[i] }}>#{i + 1}</Text>
                                                        </View>
                                                        <View style={{ flex: 1 }}>
                                                            <Text style={{ fontSize: FontSizes.xs, fontWeight: FontWeights.semibold, color: colors.textPrimary }} numberOfLines={1}>{name}</Text>
                                                            {spec ? <Text style={{ fontSize: 10, color: '#9CA3AF' }} numberOfLines={1}>{spec}</Text> : null}
                                                        </View>
                                                        <View style={{ alignItems: 'flex-end' }}>
                                                            <Text style={{ fontSize: FontSizes.xs, fontWeight: FontWeights.bold, color: '#34D399' }}>{fmtCurrency(val)}đ</Text>
                                                            <Text style={{ fontSize: 10, color: '#9CA3AF' }}>SL: {x.quantity}</Text>
                                                        </View>
                                                    </View>
                                                );
                                            })}
                                    </View>
                                </View>
                            </Animated.View>

                            <View style={{ height: 100 }} />
                        </>
                    )}
                </ScrollView>
            </SafeAreaView>
            {DialogComponent}
        </View>
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
    scroll: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.sm },
    emptyT: { fontSize: FontSizes.base, textAlign: 'center' },

    sectionTitle: { fontSize: FontSizes.base, fontWeight: FontWeights.bold, marginBottom: Spacing.sm },
    grid2: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.lg },
    summCard: { width: '47.5%', borderRadius: 18, overflow: 'hidden', borderWidth: 1 },
    summInner: { padding: Spacing.md, gap: 4 },
    summIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
    summVal: { fontSize: 18, fontWeight: FontWeights.bold, marginTop: 2 },
    summLabel: { fontSize: FontSizes.xs, fontWeight: FontWeights.semibold },
    summSub: { fontSize: 10, marginTop: 1 },

    alertCard: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, borderWidth: 1, padding: Spacing.md, marginBottom: Spacing.md },

    chartCard: { borderRadius: 18, overflow: 'hidden', borderWidth: 1, marginBottom: Spacing.md },
    chartInner: { padding: Spacing.lg },
    chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    chartTitle: { fontSize: FontSizes.sm, fontWeight: FontWeights.bold },
});
