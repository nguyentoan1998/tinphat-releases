// Production Quality Screen — QC Checklist & Output Verification
import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import {
    Settings2, CheckSquare, CheckCircle2, Clock, AlertTriangle, ChevronLeft, RefreshCw,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';

import { productOutputApi, ProductOutput } from '@/lib/product-output-api';
import { Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants/Tokens';
import { useThemeStore } from '@/store';
import { ThemeColors } from '@/constants/ThemeColors';
import { useDarkDialog } from '@/components/ui/DarkDialog';

const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
const fmtNum = (n: any) => Number(n || 0).toLocaleString('vi-VN');

type FilterKey = 'all' | 'pending' | 'verified';

const FILTERS: { key: FilterKey; label: string; activeColor: string }[] = [
    { key: 'all', label: 'Tất cả', activeColor: '#A5B4FC' },
    { key: 'pending', label: 'Chờ duyệt', activeColor: '#FBBF24' },
    { key: 'verified', label: 'Đã duyệt', activeColor: '#34D399' },
];

export default function QualityScreen() {
    const router = useRouter();
    const [outputs, setOutputs] = useState<ProductOutput[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<FilterKey>('all');
    const [actionId, setActionId] = useState<string | null>(null);
    const { isDark } = useThemeStore();
    const colors = ThemeColors.light;
    const { showDialog, DialogComponent } = useDarkDialog();

    useEffect(() => { load(); }, []);

    const load = async () => {
        setLoading(true);
        try {
            const d = await productOutputApi.getOutputs();
            setOutputs(Array.isArray(d) ? d : []);
        } catch { setOutputs([]); }
        finally { setLoading(false); }
    };

    const filtered = useMemo(() => {
        if (filter === 'pending') return outputs.filter(o => !o.verified);
        if (filter === 'verified') return outputs.filter(o => o.verified);
        return outputs;
    }, [outputs, filter]);

    const counts = useMemo(() => ({
        all: outputs.length,
        pending: outputs.filter(o => !o.verified).length,
        verified: outputs.filter(o => o.verified).length,
    }), [outputs]);

    const handleVerify = async (id: string) => {
        setActionId(id);
        try {
            await productOutputApi.updateOutput(id, { verified: true });
            setOutputs(prev => prev.map(o => o.id === id ? { ...o, verified: true } : o));
            showDialog('OK', 'Đã xác nhận sản lượng');
        } catch (e: any) {
            showDialog('Lỗi', e.response?.data?.message || 'Không thể xác nhận');
        } finally { setActionId(null); }
    };

    return (
        <View style={s.root}>
            <StatusBar style={isDark ? "light" : "dark"} />
            <LinearGradient colors={colors.gradientColors} style={StyleSheet.absoluteFill} />

            <SafeAreaView style={s.safe} edges={['top']}>
                {/* Header */}
                <Animated.View entering={FadeInDown.duration(400)} style={s.header}>
                    <Pressable style={[s.backBtn, { backgroundColor: colors.inputBg }]} onPress={() => router.replace('/(tabs)/production')}>
                        <ChevronLeft size={22} color={colors.textSecondary} />
                    </Pressable>
                    <View style={s.headerIcon}>
                        <LinearGradient colors={['#10B981', '#34D399']} style={s.iconGrad}>
                            <CheckSquare size={20} color="#fff" strokeWidth={2} />
                        </LinearGradient>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[s.headerTitle, { color: colors.textPrimary }]}>Chất lượng QC</Text>
                        <Text style={[s.headerSub, { color: colors.textMuted }]}>Kiểm tra & xác nhận sản lượng</Text>
                    </View>
                    <Pressable style={[s.backBtn, { backgroundColor: colors.inputBg }]} onPress={load}>
                        <RefreshCw size={16} color={colors.textSecondary} />
                    </Pressable>
                </Animated.View>

                {/* Stats */}
                <Animated.View entering={FadeInUp.duration(400).delay(80)} style={s.statsRow}>
                    {[
                        { label: 'Tổng', value: counts.all, color: '#818CF8' },
                        { label: 'Chờ duyệt', value: counts.pending, color: '#F59E0B' },
                        { label: 'Đã duyệt', value: counts.verified, color: '#10B981' },
                    ].map(st => (
                        <View key={st.label} style={[s.statCard, { borderColor: colors.cardBorder }]}>
                            <BlurView intensity={20} tint={colors.blurTint} style={StyleSheet.absoluteFill} />
                            <View style={[s.statInner, { backgroundColor: colors.cardBg }]}>
                                <Text style={[s.statValue, { color: st.color }]}>{st.value}</Text>
                                <Text style={[s.statLabel, { color: colors.textMuted }]}>{st.label}</Text>
                            </View>
                        </View>
                    ))}
                </Animated.View>

                {/* Filter chips */}
                <View style={s.filterRow}>
                    {FILTERS.map(f => {
                        const isActive = filter === f.key;
                        return (
                            <Pressable key={f.key} onPress={() => setFilter(f.key)}
                                style={[s.chip, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder }, isActive && s.chipActive]}>
                                {f.key === 'pending' && <AlertTriangle size={12} color={isActive ? '#FBBF24' : colors.textMuted} />}
                                {f.key === 'verified' && <CheckCircle2 size={12} color={isActive ? '#34D399' : colors.textMuted} />}
                                <Text style={[s.chipText, { color: colors.textMuted }, isActive && { color: f.activeColor }]}>{f.label}</Text>
                            </Pressable>
                        );
                    })}
                </View>

                <ScrollView contentContainerStyle={s.listContent} showsVerticalScrollIndicator={false}>
                    {loading ? (
                        <View style={s.emptyW}><Text style={[s.emptyT, { color: colors.textMuted }]}>Đang tải...</Text></View>
                    ) : filtered.length === 0 ? (
                        <View style={s.emptyW}>
                            <Settings2 size={44} color={colors.textMuted} />
                            <Text style={[s.emptyT, { color: colors.textMuted }]}>Không có dữ liệu</Text>
                        </View>
                    ) : (
                        <View style={s.listGap}>
                            {filtered.map((o, i) => (
                                <Animated.View key={o.id} entering={FadeInUp.duration(300).delay(i * 35).springify().damping(18)}>
                                    <View style={[s.card, { borderColor: colors.cardBorder, backgroundColor: colors.cardBg }]}>
                                        <BlurView intensity={20} tint={colors.blurTint} style={StyleSheet.absoluteFill} />
                                        {/* Row: status icon + info + qty */}
                                        <View style={s.cardTop}>
                                            <View style={[
                                                s.statusIcon,
                                                { backgroundColor: o.verified ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)' }
                                            ]}>
                                                {o.verified
                                                    ? <CheckCircle2 size={18} color="#34D399" />
                                                    : <Clock size={18} color="#FBBF24" />}
                                            </View>
                                            <View style={s.cardInfo}>
                                                <Text style={[s.cardTitle, { color: colors.textPrimary }]}>{o.Employee?.fullName || '—'}</Text>
                                                <Text style={[s.cardSub, { color: colors.textMuted }]}>{o.ProductionOrder?.orderNumber || '—'}</Text>
                                            </View>
                                            <View style={s.qtyBox}>
                                                <Text style={[s.qty, { color: o.verified ? '#34D399' : '#FBBF24' }]}>
                                                    {fmtNum(o.quantity)}
                                                </Text>
                                                <Text style={[s.qtyUnit, { color: colors.textMuted }]}>sp</Text>
                                            </View>
                                        </View>

                                        {/* Meta row */}
                                        <View style={s.cardMeta}>
                                            <Text style={[s.metaItem, { color: colors.textMuted }]}>{o.Product?.name || '—'}</Text>
                                            <Text style={[s.metaItem, { color: colors.textMuted }]}>{fmtDate(o.outputDate)}</Text>
                                        </View>

                                        {/* Verify button */}
                                        {!o.verified && (
                                            <Pressable
                                                style={s.verifyBtn}
                                                disabled={actionId === o.id}
                                                onPress={() => handleVerify(o.id)}
                                            >
                                                <CheckCircle2 size={15} color="#34D399" />
                                                <Text style={s.verifyBtnT}>
                                                    {actionId === o.id ? 'Đang xác nhận...' : 'Xác nhận QC'}
                                                </Text>
                                            </Pressable>
                                        )}
                                    </View>
                                </Animated.View>
                            ))}
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
    root: { flex: 1 },
    safe: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
    backBtn: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    headerIcon: { marginRight: 4 },
    iconGrad: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: FontSizes.lg, fontWeight: FontWeights.bold },
    headerSub: { fontSize: FontSizes.xs, marginTop: 1 },
    statsRow: { flexDirection: 'row', gap: Spacing.md, paddingHorizontal: Spacing.xl, marginBottom: Spacing.md },
    statCard: { flex: 1, borderRadius: BorderRadius.xl, overflow: 'hidden', borderWidth: 1 },
    statInner: { paddingVertical: 12, paddingHorizontal: 8, alignItems: 'center' },
    statValue: { fontSize: 22, fontWeight: FontWeights.bold },
    statLabel: { fontSize: 10 },
    filterRow: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.xl, marginBottom: Spacing.md },
    chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: BorderRadius.full, borderWidth: 1 },
    chipActive: { backgroundColor: 'rgba(99,102,241,0.15)', borderColor: 'rgba(99,102,241,0.3)' },
    chipText: { fontSize: FontSizes.xs, fontWeight: FontWeights.medium },
    listContent: { paddingHorizontal: Spacing.xl },
    emptyW: { alignItems: 'center', paddingVertical: 60, gap: Spacing.md },
    emptyT: { fontSize: FontSizes.base },
    listGap: { gap: Spacing.md },
    card: { borderRadius: 18, overflow: 'hidden', borderWidth: 1 },
    cardTop: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md },
    statusIcon: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    cardInfo: { flex: 1, marginLeft: Spacing.md },
    cardTitle: { fontSize: FontSizes.sm, fontWeight: FontWeights.semibold },
    cardSub: { fontSize: FontSizes.xs, marginTop: 2 },
    qtyBox: { alignItems: 'flex-end' },
    qty: { fontSize: 18, fontWeight: '800' },
    qtyUnit: { fontSize: 10 },
    cardMeta: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm },
    metaItem: { fontSize: FontSizes.xs },
    verifyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginHorizontal: Spacing.md, marginBottom: Spacing.md, paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(16,185,129,0.12)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)' },
    verifyBtnT: { fontSize: FontSizes.sm, fontWeight: FontWeights.semibold, color: '#34D399' },
});
