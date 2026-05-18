// Material Requests Screen — Glassmorphism (Yêu cầu vật tư)
import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, RefreshControl } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import { PackageSearch, ChevronLeft, RefreshCw } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';

import { materialRequestApi, MaterialRequest } from '@/lib/material-request-api';
import { Timings } from '@/constants/GlassTokens';
import { Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants/Tokens';
import { StatusBadge } from '@/components/ui/GlassDataScreen';
import { useThemeStore } from '@/store';
import { ThemeColors } from '@/constants/ThemeColors';
import { useDarkDialog } from '@/components/ui/DarkDialog';

const STATUS_MAP: Record<string, { label: string; color: string }> = {
    PENDING: { label: 'Chờ duyệt', color: '#F59E0B' },
    APPROVED: { label: 'Đã duyệt', color: '#3B82F6' },
    FULFILLED: { label: 'Đã cấp', color: '#10B981' },
    REJECTED: { label: 'Từ chối', color: '#EF4444' },
};

const fmtDate = (d?: string) =>
    d ? new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

export default function MaterialRequestsScreen() {
    const router = useRouter();
    const [requests, setRequests] = useState<MaterialRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const { isDark } = useThemeStore();
    const colors = ThemeColors.light;
    const { showDialog, DialogComponent } = useDarkDialog();

    useEffect(() => { load(); }, []);

    const load = async () => {
        try {
            setLoading(true);
            const data = await materialRequestApi.getRequests();
            setRequests(Array.isArray(data) ? data : []);
        } catch (e: any) {
            showDialog('Lỗi', e.response?.data?.message || 'Không thể tải yêu cầu vật tư');
        } finally { setLoading(false); setRefreshing(false); }
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
                        <LinearGradient colors={['#EC4899', '#F472B6']} style={s.iconGrad}>
                            <PackageSearch size={20} color="#fff" strokeWidth={2} />
                        </LinearGradient>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[s.headerTitle, { color: colors.textPrimary }]}>Yêu cầu vật tư</Text>
                        <Text style={[s.headerSub, { color: colors.textMuted }]}>Danh sách YCVT</Text>
                    </View>
                    <Pressable style={[s.backBtn, { backgroundColor: colors.inputBg }]} onPress={() => { setRefreshing(true); load(); }}>
                        <RefreshCw size={16} color={colors.textSecondary} />
                    </Pressable>
                </Animated.View>

                <ScrollView contentContainerStyle={s.listContent} showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#818CF8" />}>
                    {loading ? (
                        <View style={s.emptyW}><Text style={[s.emptyT, { color: colors.textMuted }]}>Đang tải...</Text></View>
                    ) : requests.length === 0 ? (
                        <View style={s.emptyW}>
                            <PackageSearch size={44} color={colors.textMuted} />
                            <Text style={[s.emptyT, { color: colors.textMuted }]}>Không có yêu cầu vật tư</Text>
                        </View>
                    ) : (
                        <View style={s.listGap}>
                            {requests.map((r, i) => {
                                const st = STATUS_MAP[r.status] || { label: r.status, color: '#94A3B8' };
                                return (
                                    <Animated.View key={r.id} entering={FadeInUp.duration(300).delay(i * 35).springify().damping(18)}>
                                        <View style={[s.card, { borderColor: colors.cardBorder }]}>
                                            <BlurView intensity={20} tint={colors.blurTint} style={StyleSheet.absoluteFill} />
                                            <View style={[s.cardInner, { backgroundColor: colors.cardBg }]}>
                                                <View style={s.cardH}>
                                                    <View style={s.nw}>
                                                        <Text style={[s.cTitle, { color: colors.textPrimary }]}>{`YCVT-${r.id.slice(0, 6).toUpperCase()}`}</Text>
                                                    </View>
                                                    <StatusBadge label={st.label} color={st.color} />
                                                </View>
                                                <View style={s.metaRow}>
                                                    <Text style={[s.dateT, { color: colors.textMuted }]}>{fmtDate(r.requestDate)}</Text>
                                                </View>
                                                {r.note && (
                                                    <Text style={[s.note, { color: colors.textMuted }]} numberOfLines={2}>{r.note}</Text>
                                                )}
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
    listContent: { paddingHorizontal: Spacing.xl },
    emptyW: { alignItems: 'center', paddingVertical: 60, gap: Spacing.md },
    emptyT: { fontSize: FontSizes.base },
    listGap: { gap: Spacing.md },
    card: { borderRadius: 18, overflow: 'hidden', borderWidth: 1 },
    cardInner: { padding: Spacing.md },
    cardH: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
    nw: { flex: 1, marginRight: Spacing.sm },
    cTitle: { fontSize: FontSizes.base, fontWeight: FontWeights.semibold },
    metaRow: { marginTop: Spacing.sm },
    dateT: { fontSize: FontSizes.xs },
    note: { fontSize: FontSizes.xs, marginTop: 4 },
});
