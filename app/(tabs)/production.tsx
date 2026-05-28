 // Production Tab Screen — Glassmorphism
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import {
    CalendarRange, ClipboardList, PackageSearch, AlertTriangle,
    CheckSquare, Gauge, BarChart3, Settings2, ChevronRight,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';

import { Timings } from '@/constants/GlassTokens';
import { Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants/Tokens';
import { ThemeColors } from '@/constants/ThemeColors';

const productionModules = [
    { id: 'plans', title: 'Kế hoạch SX', subtitle: 'Lập kế hoạch sản xuất', Icon: CalendarRange, gradient: ['#6366F1', '#818CF8'] as const, route: '/production/plans' },
    { id: 'orders', title: 'Lệnh SX', subtitle: 'Quản lý lệnh sản xuất', Icon: ClipboardList, gradient: ['#8B5CF6', '#A78BFA'] as const, route: '/production/orders' },
    { id: 'work-orders', title: 'Lệnh công việc', subtitle: 'Theo dõi tiến độ SX', Icon: CheckSquare, gradient: ['#0EA5E9', '#38BDF8'] as const, route: '/production/work-orders' },
    { id: 'material-requests', title: 'Yêu cầu vật tư', subtitle: 'Đề xuất NVL', Icon: PackageSearch, gradient: ['#EC4899', '#F472B6'] as const, route: '/production/material-requests' },
    { id: 'shortages', title: 'Vật tư thiếu', subtitle: 'NVL dưới mức tối thiểu', Icon: AlertTriangle, gradient: ['#EF4444', '#F87171'] as const, route: '/production/shortages' },
    { id: 'quality', title: 'Kiểm định chất lượng', subtitle: 'QC & xác nhận sản lượng', Icon: CheckSquare, gradient: ['#10B981', '#34D399'] as const, route: '/production/quality' },
    { id: 'tracking', title: 'Theo dõi sản lượng', subtitle: 'Số liệu sản xuất', Icon: Gauge, gradient: ['#F59E0B', '#FBBF24'] as const, route: '/production/tracking' },
    { id: 'reports', title: 'Báo cáo SX', subtitle: 'Thống kê & phân tích', Icon: BarChart3, gradient: ['#14B8A6', '#2DD4BF'] as const, route: '/production/reports' },
];

export default function ProductionScreen() {
    const router = useRouter();
    const colors = ThemeColors.light;
    const [ready, setReady] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setReady(true), 50);
        return () => clearTimeout(timer);
    }, []);

    if (!ready) {
        return (
            <View style={{ flex: 1, backgroundColor: '#F0F8FF', justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="small" color="#0156A7" />
            </View>
        );
    }

    return (
        <View style={s.root}>
                <StatusBar style="dark" />
            <LinearGradient colors={colors.gradientColors} style={StyleSheet.absoluteFill} />

            <SafeAreaView style={s.safe} edges={['top']}>
                <Animated.View entering={FadeInDown.duration(400)} style={s.header}>
                    <View style={s.headerText}>
                        <Text style={[s.title, { color: colors.textPrimary }]}>Sản xuất</Text>
                        <Text style={[s.sub, { color: colors.textMuted }]}>Quản lý quy trình sản xuất</Text>
                    </View>
                </Animated.View>

                <ScrollView contentContainerStyle={[s.list, { paddingBottom: 100 }]} showsVerticalScrollIndicator={false}>
                    {productionModules.map((m, i) => (
                        <Animated.View
                            key={m.id}
                            entering={FadeInUp.duration(Timings.entrance).delay(60 + i * 55).springify().damping(18)}
                        >
                            <Pressable
                                style={[s.card, { borderColor: colors.cardBorder }]}
                                onPress={() => router.push(m.route as any)}
                            >
                                <BlurView intensity={20} tint={colors.blurTint} style={StyleSheet.absoluteFill} />
                                <View style={[s.cardInner, { backgroundColor: colors.cardBg }]}>
                                    <LinearGradient colors={m.gradient} style={s.iconWrap}>
                                        <m.Icon size={22} color="#FFFFFF" strokeWidth={2} />
                                    </LinearGradient>
                                    <View style={s.textWrap}>
                                        <Text style={[s.cardTitle, { color: colors.textPrimary }]}>{m.title}</Text>
                                        <Text style={[s.cardSub, { color: colors.textMuted }]}>{m.subtitle}</Text>
                                    </View>
                                    <ChevronRight size={18} color={colors.chevronColor} />
                                </View>
                            </Pressable>
                        </Animated.View>
                    ))}
                    <View style={{ height: 100 }} />
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const s = StyleSheet.create({
    root: { flex: 1 }, safe: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg, paddingBottom: Spacing.md },
    headerText: { flex: 1 },
    title: { fontSize: FontSizes.xxxl, fontWeight: FontWeights.bold },
    sub: { fontSize: FontSizes.sm, marginTop: 4 },
    list: { paddingHorizontal: Spacing.xl, gap: Spacing.md },
    card: { borderRadius: BorderRadius.xl, overflow: 'hidden', borderWidth: 1 },
    cardInner: { flexDirection: 'row', alignItems: 'center', padding: Spacing.lg },
    iconWrap: { width: 46, height: 46, borderRadius: 13, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
    textWrap: { flex: 1 },
    cardTitle: { fontSize: FontSizes.base, fontWeight: FontWeights.semibold, marginBottom: 2 },
    cardSub: { fontSize: FontSizes.xs },
});
