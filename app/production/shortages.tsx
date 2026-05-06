// Material Shortages Screen — Glassmorphism (Vật tư thiếu)
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, RefreshControl } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import { AlertTriangle, ChevronLeft, RefreshCw } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';

import { inventoryApi } from '@/lib/inventory-api';
import { Timings } from '@/constants/GlassTokens';
import { Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants/Tokens';
import { useThemeStore } from '@/store';
import { ThemeColors } from '@/constants/ThemeColors';
import { useDarkDialog } from '@/components/ui/DarkDialog';

interface ShortageItem {
    id: string;
    productName: string;
    name: string;
    currentStock: number;
    minStock: number;
    shortage: number;
}

export default function MaterialShortagesScreen() {
    const router = useRouter();
    const [shortages, setShortages] = useState<ShortageItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const { isDark } = useThemeStore();
    const colors = ThemeColors.light;
    const { showDialog, DialogComponent } = useDarkDialog();

    useEffect(() => { load(); }, []);

    const load = async () => {
        try {
            setLoading(true);
            const stocks = await inventoryApi.getStock();
            const shortageItems: ShortageItem[] = stocks
                .filter((stock: any) => stock.quantity < 10)
                .map((stock: any) => ({
                    id: stock.id,
                    productName: stock.product?.name || 'N/A',
                    name: stock.spec?.name || 'N/A',
                    currentStock: stock.quantity,
                    minStock: 10,
                    shortage: Math.max(0, 10 - stock.quantity),
                }));
            setShortages(shortageItems);
        } catch (e: any) {
            showDialog('Lỗi', e.response?.data?.message || 'Không thể tải dữ liệu');
        } finally { setLoading(false); setRefreshing(false); }
    };

    const getSeverity = (shortage: number) => {
        if (shortage >= 8) return { label: 'Nghiêm trọng', color: '#EF4444' };
        if (shortage >= 5) return { label: 'Cảnh báo', color: '#F59E0B' };
        return { label: 'Thấp', color: '#38BDF8' };
    };

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
                        <LinearGradient colors={['#EF4444', '#F87171']} style={s.iconGrad}>
                            <AlertTriangle size={20} color="#fff" strokeWidth={2} />
                        </LinearGradient>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[s.headerTitle, { color: colors.textPrimary }]}>Vật tư thiếu</Text>
                        <Text style={[s.headerSub, { color: colors.textMuted }]}>NVL dưới mức tối thiểu</Text>
                    </View>
                    <Pressable style={[s.backBtn, { backgroundColor: colors.inputBg }]} onPress={() => { setRefreshing(true); load(); }}>
                        <RefreshCw size={16} color={colors.textSecondary} />
                    </Pressable>
                </Animated.View>

                {/* Stats */}
                <Animated.View entering={FadeInUp.duration(Timings.entrance).delay(80)} style={s.statsRow}>
                    {[
                        { label: 'Tổng thiếu', value: shortages.length, color: '#F59E0B' },
                        { label: 'Nghiêm trọng', value: shortages.filter(i => i.shortage >= 8).length, color: '#EF4444' },
                        { label: 'Cảnh báo', value: shortages.filter(i => i.shortage >= 5 && i.shortage < 8).length, color: '#FBBF24' },
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

                <ScrollView contentContainerStyle={s.listContent} showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#F59E0B" />}>
                    {loading ? (
                        <View style={s.emptyW}><Text style={[s.emptyT, { color: colors.textMuted }]}>Đang tải...</Text></View>
                    ) : shortages.length === 0 ? (
                        <View style={s.emptyW}>
                            <AlertTriangle size={44} color={colors.textMuted} />
                            <Text style={[s.emptyT, { color: colors.textMuted }]}>Không có vật tư thiếu</Text>
                        </View>
                    ) : (
                        <View style={s.listGap}>
                            {shortages.map((item, i) => {
                                const sev = getSeverity(item.shortage);
                                return (
                                    <Animated.View key={item.id} entering={FadeInUp.duration(300).delay(i * 35).springify().damping(18)}>
                                        <View style={[s.card, { borderColor: colors.cardBorder }]}>
                                            <BlurView intensity={20} tint={colors.blurTint} style={StyleSheet.absoluteFill} />
                                            <View style={[s.cardInner, { backgroundColor: colors.cardBg }]}>
                                                <View style={s.cardH}>
                                                    <View style={[s.sevDot, { backgroundColor: sev.color + '25' }]}>
                                                        <AlertTriangle size={16} color={sev.color} />
                                                    </View>
                                                    <View style={s.nw}>
                                                        <Text style={[s.cTitle, { color: colors.textPrimary }]}>{item.productName}</Text>
                                                        <Text style={[s.cSub, { color: colors.textMuted }]}>{item.name}</Text>
                                                    </View>
                                                    <View style={[s.sevBadge, { backgroundColor: sev.color + '18', borderColor: sev.color + '40' }]}>
                                                        <Text style={[s.sevText, { color: sev.color }]}>{sev.label}</Text>
                                                    </View>
                                                </View>
                                                <View style={s.metaRow}>
                                                    <View style={s.metaItem}>
                                                        <Text style={[s.metaL, { color: colors.textMuted }]}>Tồn kho</Text>
                                                        <Text style={[s.metaV, { color: colors.textPrimary }]}>{item.currentStock}</Text>
                                                    </View>
                                                    <View style={s.metaItem}>
                                                        <Text style={[s.metaL, { color: colors.textMuted }]}>Tối thiểu</Text>
                                                        <Text style={[s.metaV, { color: colors.textPrimary }]}>{item.minStock}</Text>
                                                    </View>
                                                    <View style={s.metaItem}>
                                                        <Text style={[s.metaL, { color: colors.textMuted }]}>Thiếu</Text>
                                                        <Text style={[s.metaV, { color: sev.color }]}>{item.shortage}</Text>
                                                    </View>
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
    listContent: { paddingHorizontal: Spacing.xl },
    emptyW: { alignItems: 'center', paddingVertical: 60, gap: Spacing.md },
    emptyT: { fontSize: FontSizes.base },
    listGap: { gap: Spacing.md },
    card: { borderRadius: 18, overflow: 'hidden', borderWidth: 1 },
    cardInner: { padding: Spacing.md },
    cardH: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
    sevDot: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    nw: { flex: 1 },
    cTitle: { fontSize: FontSizes.sm, fontWeight: FontWeights.semibold },
    cSub: { fontSize: FontSizes.xs, marginTop: 2 },
    sevBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
    sevText: { fontSize: 10, fontWeight: FontWeights.semibold },
    metaRow: { flexDirection: 'row', gap: Spacing.md },
    metaItem: { flex: 1, alignItems: 'center' },
    metaL: { fontSize: 10 },
    metaV: { fontSize: FontSizes.sm, fontWeight: FontWeights.bold, marginTop: 2 },
});
