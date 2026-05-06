// Production Tracking Screen — Product Outputs (Theo dõi sản lượng)
import React, { useState, useEffect, useMemo } from 'react';
import {
    View, Text, StyleSheet, Pressable, ScrollView, TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import { Timer, Search, CheckCircle2, Clock, ChevronLeft, Gauge } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import Svg, { Circle } from 'react-native-svg';

import { productOutputApi, ProductOutput } from '@/lib/product-output-api';
import { productionOrderApi, ProductionOrder } from '@/lib/production-order-api';
import { Timings } from '@/constants/GlassTokens';
import { Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants/Tokens';
import { useThemeStore } from '@/store';
import { ThemeColors } from '@/constants/ThemeColors';

const fmtDate = (d: string) => new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
const fmtNum = (n: any) => Number(n || 0).toLocaleString('vi-VN');

function MiniProgress({ pct, color, trackColor }: { pct: number; color: string; trackColor: string }) {
    const R = 10; const circ = 2 * Math.PI * R;
    return (
        <Svg width={28} height={28} style={{ transform: [{ rotate: '-90deg' }] }}>
            <Circle cx={14} cy={14} r={R} stroke={trackColor} strokeWidth={3} fill="none" />
            <Circle cx={14} cy={14} r={R} stroke={color} strokeWidth={3} fill="none"
                strokeDasharray={`${(pct / 100) * circ} ${circ}`} strokeLinecap="round" />
        </Svg>
    );
}

export default function TrackingScreen() {
    const router = useRouter();
    const [outputs, setOutputs] = useState<ProductOutput[]>([]);
    const [orders, setOrders] = useState<ProductionOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [tab, setTab] = useState<'outputs' | 'orders'>('orders');
    const { isDark } = useThemeStore();
    const colors = ThemeColors.light;

    useEffect(() => { load(); }, []);

    const load = async () => {
        setLoading(true);
        const [o, po] = await Promise.allSettled([
            productOutputApi.getOutputs(),
            productionOrderApi.getOrders(),
        ]);
        if (o.status === 'fulfilled') setOutputs(Array.isArray(o.value) ? o.value : []);
        if (po.status === 'fulfilled') setOrders(Array.isArray(po.value) ? po.value : []);
        setLoading(false);
    };

    const filteredOrders = useMemo(() => {
        if (!search.trim()) return orders;
        const q = search.toLowerCase();
        return orders.filter(o =>
            o.orderNumber?.toLowerCase().includes(q) ||
            o.Product?.name?.toLowerCase().includes(q) ||
            o.BOM?.Product?.name?.toLowerCase().includes(q)
        );
    }, [orders, search]);

    const filteredOutputs = useMemo(() => {
        if (!search.trim()) return outputs;
        const q = search.toLowerCase();
        return outputs.filter(o =>
            o.Employee?.fullName?.toLowerCase().includes(q) ||
            o.Product?.name?.toLowerCase().includes(q) ||
            o.ProductionOrder?.orderNumber?.toLowerCase().includes(q)
        );
    }, [outputs, search]);

    const totalOutput = useMemo(() => outputs.reduce((s, o) => s + Number(o.quantity || 0), 0), [outputs]);
    const verifiedOutput = useMemo(() => outputs.filter(o => o.verified).reduce((s, o) => s + Number(o.quantity || 0), 0), [outputs]);
    const inProgressCount = useMemo(() => orders.filter(o => o.status === 'IN_PROGRESS').length, [orders]);

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
                        <LinearGradient colors={['#F59E0B', '#FBBF24']} style={s.iconGrad}>
                            <Gauge size={20} color="#fff" strokeWidth={2} />
                        </LinearGradient>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[s.headerTitle, { color: colors.textPrimary }]}>Theo dõi</Text>
                        <Text style={[s.headerSub, { color: colors.textMuted }]}>Tiến độ & sản lượng</Text>
                    </View>
                </Animated.View>

                {/* Stats */}
                <Animated.View entering={FadeInUp.duration(Timings.entrance).delay(80)} style={s.statsRow}>
                    {[
                        { label: 'Đang SX', value: inProgressCount, color: '#FBBF24', unit: 'lệnh' },
                        { label: 'Tổng SL', value: fmtNum(totalOutput), color: '#818CF8', unit: 'sp' },
                        { label: 'Đã duyệt', value: fmtNum(verifiedOutput), color: '#34D399', unit: 'sp' },
                    ].map(st => (
                        <View key={st.label} style={[s.statCard, { borderColor: colors.cardBorder }]}>
                            <BlurView intensity={20} tint={colors.blurTint} style={StyleSheet.absoluteFill} />
                            <View style={[s.statInner, { backgroundColor: colors.cardBg }]}>
                                <Text style={[s.statValue, { color: st.color }]}>{st.value}</Text>
                                <Text style={[s.statUnit, { color: colors.textMuted }]}>{st.unit}</Text>
                                <Text style={[s.statLabel, { color: colors.textMuted }]}>{st.label}</Text>
                            </View>
                        </View>
                    ))}
                </Animated.View>

                {/* Tabs */}
                <View style={[s.tabRow, { backgroundColor: colors.inputBg }]}>
                    {([['orders', 'Lệnh SX'], ['outputs', 'Sản lượng']] as const).map(([key, label]) => (
                        <Pressable key={key} onPress={() => setTab(key)} style={[s.tabBtn, tab === key && s.tabBtnA]}>
                            <Text style={[s.tabT, { color: colors.textMuted }, tab === key && { color: colors.textAccent, fontWeight: FontWeights.bold }]}>{label}</Text>
                        </Pressable>
                    ))}
                </View>

                {/* Search */}
                <View style={[s.searchWrap, { borderColor: colors.cardBorder }]}>
                    <BlurView intensity={15} tint={colors.blurTint} style={StyleSheet.absoluteFill} />
                    <Search size={15} color={colors.textMuted} />
                    <TextInput style={[s.searchInput, { color: colors.textPrimary }]} placeholder="Tìm kiếm..." placeholderTextColor={colors.textMuted}
                        value={search} onChangeText={setSearch} />
                </View>

                <ScrollView contentContainerStyle={s.listContent} showsVerticalScrollIndicator={false}>
                    {loading ? (
                        <View style={s.emptyW}><Text style={[s.emptyT, { color: colors.textMuted }]}>Đang tải...</Text></View>
                    ) : tab === 'orders' ? (
                        filteredOrders.length === 0 ? (
                            <View style={s.emptyW}><Timer size={40} color={colors.textMuted} /><Text style={[s.emptyT, { color: colors.textMuted }]}>Không có lệnh SX</Text></View>
                        ) : (
                            <View style={s.listGap}>
                                {filteredOrders.map((o, i) => {
                                    const pct = Number(o.quantity) > 0 ? Math.min(100, Math.round((Number(o.producedQty) / Number(o.quantity)) * 100)) : 0;
                                    const stColor = o.status === 'COMPLETED' ? '#10B981' : o.status === 'IN_PROGRESS' ? '#6366F1' : '#F59E0B';
                                    return (
                                        <Animated.View key={o.id} entering={FadeInUp.duration(300).delay(i * 30).springify().damping(18)}>
                                            <View style={[s.card, { borderColor: colors.cardBorder }]}>
                                                <BlurView intensity={20} tint={colors.blurTint} style={StyleSheet.absoluteFill} />
                                                <View style={[s.cardInner, { backgroundColor: colors.cardBg }]}>
                                                    <View style={{ position: 'relative', width: 28, height: 28 }}>
                                                        <MiniProgress pct={pct} color={stColor} trackColor={colors.divider} />
                                                    </View>
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={[s.cardTitle, { color: colors.textPrimary }]}>{o.orderNumber}</Text>
                                                        <Text style={[s.cardSub, { color: colors.textMuted }]} numberOfLines={1}>
                                                            {o.Product?.name || o.BOM?.Product?.name || '—'}
                                                        </Text>
                                                    </View>
                                                    <View style={s.rightCol}>
                                                        <Text style={[s.pct, { color: stColor }]}>{pct}%</Text>
                                                        <Text style={[s.qty, { color: colors.textMuted }]}>{fmtNum(o.producedQty)}/{fmtNum(o.quantity)}</Text>
                                                    </View>
                                                </View>
                                                {/* Progress bar */}
                                                <View style={[s.barBg, { backgroundColor: colors.divider }]}>
                                                    <View style={[s.barFill, { width: `${pct}%`, backgroundColor: stColor }]} />
                                                </View>
                                            </View>
                                        </Animated.View>
                                    );
                                })}
                            </View>
                        )
                    ) : (
                        filteredOutputs.length === 0 ? (
                            <View style={s.emptyW}><Timer size={40} color={colors.textMuted} /><Text style={[s.emptyT, { color: colors.textMuted }]}>Không có sản lượng</Text></View>
                        ) : (
                            <View style={s.listGap}>
                                {filteredOutputs.map((o, i) => (
                                    <Animated.View key={o.id} entering={FadeInUp.duration(300).delay(i * 30).springify().damping(18)}>
                                        <View style={[s.card, { borderColor: colors.cardBorder }]}>
                                            <BlurView intensity={20} tint={colors.blurTint} style={StyleSheet.absoluteFill} />
                                            <View style={[s.cardInner, { backgroundColor: colors.cardBg }]}>
                                                <View style={[s.verifyDot, { backgroundColor: o.verified ? '#10B981' : '#F59E0B' }]}>
                                                    {o.verified
                                                        ? <CheckCircle2 size={14} color="#FFFFFF" />
                                                        : <Clock size={14} color="#FFFFFF" />
                                                    }
                                                </View>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={[s.cardTitle, { color: colors.textPrimary }]}>{o.Employee?.fullName || '—'}</Text>
                                                    <Text style={[s.cardSub, { color: colors.textMuted }]} numberOfLines={1}>{o.Product?.name || '—'}</Text>
                                                    <Text style={[s.cardDate, { color: colors.textMuted }]}>{fmtDate(o.outputDate)}</Text>
                                                </View>
                                                <View style={s.rightCol}>
                                                    <Text style={[s.pct, { color: '#818CF8' }]}>{fmtNum(o.quantity)}</Text>
                                                    <Text style={[s.qty, { color: colors.textMuted }]}>sản phẩm</Text>
                                                </View>
                                            </View>
                                        </View>
                                    </Animated.View>
                                ))}
                            </View>
                        )
                    )}
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
    statsRow: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.xl, marginBottom: Spacing.md },
    statCard: { flex: 1, borderRadius: BorderRadius.xl, overflow: 'hidden', borderWidth: 1 },
    statInner: { padding: 10, alignItems: 'center' },
    statValue: { fontSize: 18, fontWeight: FontWeights.bold },
    statUnit: { fontSize: 9 },
    statLabel: { fontSize: 9, marginTop: 1 },
    tabRow: { flexDirection: 'row', marginHorizontal: Spacing.xl, marginBottom: Spacing.md, borderRadius: 12, padding: 3 },
    tabBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
    tabBtnA: { backgroundColor: 'rgba(99,102,241,0.3)' },
    tabT: { fontSize: FontSizes.sm, fontWeight: FontWeights.medium },
    searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: Spacing.xl, marginBottom: Spacing.md, paddingHorizontal: Spacing.md, paddingVertical: 9, borderRadius: 12, overflow: 'hidden', borderWidth: 1 },
    searchInput: { flex: 1, fontSize: FontSizes.sm },
    listContent: { paddingHorizontal: Spacing.xl },
    emptyW: { alignItems: 'center', paddingVertical: 60, gap: Spacing.md },
    emptyT: { fontSize: FontSizes.base },
    listGap: { gap: Spacing.sm },
    card: { borderRadius: 16, overflow: 'hidden', borderWidth: 1 },
    cardInner: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.md },
    cardTitle: { fontSize: FontSizes.sm, fontWeight: FontWeights.semibold },
    cardSub: { fontSize: FontSizes.xs, marginTop: 1 },
    cardDate: { fontSize: 10, marginTop: 2 },
    rightCol: { alignItems: 'flex-end' },
    pct: { fontSize: 16, fontWeight: '800' },
    qty: { fontSize: 10 },
    barBg: { height: 3, marginHorizontal: Spacing.md, marginBottom: Spacing.sm, borderRadius: 2 },
    barFill: { height: 3, borderRadius: 2 },
    verifyDot: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
});
