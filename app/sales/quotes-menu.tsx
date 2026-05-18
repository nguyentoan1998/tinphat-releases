// Quotes Menu — Sales Quotation & Purchase Quotation
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { FileText, ShoppingCart, ChevronRight, ChevronLeft } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { Timings } from '@/constants/GlassTokens';
import { Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants/Tokens';
import { useThemeStore } from '@/store';
import { ThemeColors } from '@/constants/ThemeColors';

const MENU_ITEMS = [
    { id: 'sales-quotes', title: 'Báo giá bán hàng', subtitle: 'Gửi báo giá cho khách hàng', Icon: FileText, gradient: ['#EC4899', '#F472B6'] as const, route: '/sales/quotes' },
    { id: 'purchase-quotes', title: 'Yêu cầu báo giá mua', subtitle: 'Hỏi giá từ nhà cung cấp', Icon: ShoppingCart, gradient: ['#6366F1', '#818CF8'] as const, route: '/purchase/quotes' },
];

export default function QuotesMenuScreen() {
    const router = useRouter();
    const { isDark } = useThemeStore();
    const colors = ThemeColors.light;

    return (
        <View style={s.root}>
            <StatusBar style={isDark ? "light" : "dark"} />
            <LinearGradient colors={colors.gradientColors} style={StyleSheet.absoluteFill} />
            <SafeAreaView style={s.safe} edges={['top']}>
                <Animated.View entering={FadeInUp.duration(Timings.entrance)} style={s.header}>
                    <Pressable style={[s.backBtn, { backgroundColor: colors.inputBg }]} onPress={() => router.back()}>
                        <ChevronLeft size={22} color={colors.textSecondary} />
                    </Pressable>
                    <View>
                        <Text style={[s.headerTitle, { color: colors.textPrimary }]}>Báo giá</Text>
                        <Text style={[s.headerSub, { color: colors.textMuted }]}>Bán hàng & Mua hàng</Text>
                    </View>
                </Animated.View>
                <View style={s.cards}>
                    {MENU_ITEMS.map((item, idx) => (
                        <Animated.View key={item.id} entering={FadeInUp.duration(400).delay(100 + idx * 120).springify().damping(18)}>
                            <Pressable style={({ pressed }) => [s.card, { borderColor: colors.cardBorder }, pressed && s.cardPressed]} onPress={() => router.push(item.route as any)}>
                                <BlurView intensity={20} tint={colors.blurTint} style={StyleSheet.absoluteFill} />
                                <View style={[s.cardInner, { backgroundColor: colors.cardBg }]}>
                                    <LinearGradient colors={item.gradient} style={s.iconWrap}>
                                        <item.Icon size={28} color="#FFFFFF" />
                                    </LinearGradient>
                                    <View style={s.cardText}>
                                        <Text style={[s.cardTitle, { color: colors.textPrimary }]}>{item.title}</Text>
                                        <Text style={[s.cardSub, { color: colors.textMuted }]}>{item.subtitle}</Text>
                                    </View>
                                    <ChevronRight size={20} color={colors.chevronColor} />
                                </View>
                            </Pressable>
                        </Animated.View>
                    ))}
                </View>
            </SafeAreaView>
        </View>
    );
}

const s = StyleSheet.create({
    root: { flex: 1 }, safe: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl, paddingBottom: Spacing.lg },
    backBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: FontSizes.xxl, fontWeight: FontWeights.bold },
    headerSub: { fontSize: FontSizes.base, marginTop: 4 },
    cards: { paddingHorizontal: Spacing.xl, gap: Spacing.md },
    card: { borderRadius: BorderRadius.xl, overflow: 'hidden', borderWidth: 1 },
    cardPressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
    cardInner: { flexDirection: 'row', alignItems: 'center', padding: Spacing.xl, gap: Spacing.lg },
    iconWrap: { width: 56, height: 56, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    cardText: { flex: 1 },
    cardTitle: { fontSize: FontSizes.lg, fontWeight: FontWeights.bold },
    cardSub: { fontSize: FontSizes.sm, marginTop: 4 },
});
