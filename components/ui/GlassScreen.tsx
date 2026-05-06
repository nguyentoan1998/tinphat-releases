// GlassScreen — Reusable gradient screen shell with header (theme-aware)
import React from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, {
    FadeInUp,
    useSharedValue,
    useAnimatedStyle,
    withSpring,
} from 'react-native-reanimated';
import { ChevronRight } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';

import { Springs, Timings } from '@/constants/GlassTokens';
import { Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants/Tokens';
import { useThemeStore } from '@/store';
import { ThemeColors } from '@/constants/ThemeColors';

interface MenuItem {
    id: string;
    title: string;
    subtitle: string;
    Icon: any;
    gradient: readonly [string, string, ...string[]];
}

interface GlassScreenProps {
    title: string;
    subtitle: string;
    items: MenuItem[];
    onItemPress: (id: string) => void;
    refreshing?: boolean;
    onRefresh?: () => void;
    headerIcon?: React.ReactNode;
    children?: React.ReactNode;
}

function GlassMenuItem({ item, index, onPress, colors }: { item: MenuItem; index: number; onPress: () => void; colors: any }) {
    const scale = useSharedValue(1);
    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    return (
        <Animated.View
            entering={FadeInUp.duration(Timings.entrance).delay(200 + index * 80).springify().damping(18)}
            style={animatedStyle}
        >
            <Pressable
                onPress={onPress}
                onPressIn={() => { scale.value = withSpring(0.96, Springs.snappy); }}
                onPressOut={() => { scale.value = withSpring(1, Springs.bouncy); }}
            >
                <View style={[itemStyles.card, { borderColor: colors.cardBorder }]}>
                    <BlurView intensity={25} tint={colors.blurTint} style={StyleSheet.absoluteFill} />
                    <View style={[itemStyles.cardInner, { backgroundColor: colors.cardBg }]}>
                        <LinearGradient colors={item.gradient} style={itemStyles.iconCircle}>
                            <item.Icon size={22} color="#FFFFFF" strokeWidth={2} />
                        </LinearGradient>
                        <View style={itemStyles.textWrap}>
                            <Text style={[itemStyles.title, { color: colors.textPrimary }]}>{item.title}</Text>
                            <Text style={[itemStyles.subtitle, { color: colors.textSecondary }]}>{item.subtitle}</Text>
                        </View>
                        <ChevronRight size={18} color={colors.chevronColor} />
                    </View>
                </View>
            </Pressable>
        </Animated.View>
    );
}

export default function GlassScreen({
    title,
    subtitle,
    items,
    onItemPress,
    refreshing = false,
    onRefresh,
    headerIcon,
    children,
}: GlassScreenProps) {
    const { isDark } = useThemeStore();
    const colors = isDark ? ThemeColors.dark : ThemeColors.light;

    return (
        <View style={[styles.container, { backgroundColor: colors.screenBg }]}>
            <StatusBar style={colors.statusBar} />
            <LinearGradient
                colors={colors.gradientColors}
                style={StyleSheet.absoluteFill}
            />
            <View style={[styles.orb, { top: -40, right: -60, backgroundColor: colors.orbColor }]} />

            <SafeAreaView style={styles.flex} edges={['top']}>
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={
                        onRefresh ? (
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0156A7" />
                        ) : undefined
                    }
                >
                    {/* Header */}
                    <Animated.View
                        entering={FadeInUp.duration(Timings.entrance).delay(50)}
                        style={styles.header}
                    >
                        {headerIcon}
                        <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
                        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
                    </Animated.View>

                    {/* Children (custom content) */}
                    {children}

                    {/* Menu Items */}
                    <View style={styles.menuList}>
                        {items.map((item, i) => (
                            <GlassMenuItem
                                key={item.id}
                                item={item}
                                index={i}
                                onPress={() => onItemPress(item.id)}
                                colors={colors}
                            />
                        ))}
                    </View>

                    <View style={{ height: 100 }} />
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const itemStyles = StyleSheet.create({
    card: {
        borderRadius: BorderRadius.xl,
        overflow: 'hidden',
        borderWidth: 1,
    },
    cardInner: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing.lg,
    },
    iconCircle: {
        width: 48, height: 48, borderRadius: 14,
        justifyContent: 'center', alignItems: 'center',
        marginRight: Spacing.md,
    },
    textWrap: { flex: 1 },
    title: {
        fontSize: FontSizes.base,
        fontWeight: FontWeights.semibold,
        marginBottom: 2,
    },
    subtitle: {
        fontSize: FontSizes.xs,
    },
});

const styles = StyleSheet.create({
    container: { flex: 1 },
    flex: { flex: 1 },
    scrollContent: { paddingHorizontal: Spacing.xl },

    orb: {
        position: 'absolute',
        width: 200, height: 200, borderRadius: 100,
    },

    header: {
        paddingTop: Spacing.md,
        marginBottom: Spacing.xxl,
    },
    title: {
        fontSize: FontSizes.xxxl,
        fontWeight: FontWeights.bold,
    },
    subtitle: {
        fontSize: FontSizes.sm,
        marginTop: Spacing.xs,
    },

    menuList: {
        gap: Spacing.md,
    },
});
