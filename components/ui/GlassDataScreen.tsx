// GlassDataScreen — Reusable glass screen with theme support
import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    RefreshControl,
    FlatList,
    Pressable,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, usePathname } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, {
    FadeInUp,
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    withSequence,
    withRepeat,
} from 'react-native-reanimated';
import { ChevronLeft, Plus } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';

import { Springs, Timings } from '@/constants/GlassTokens';
import { Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants/Tokens';
import { useThemeStore } from '@/store';
import { ThemeColors, AppTheme } from '@/constants/ThemeColors';

export interface GlassDataScreenProps {
    title: string;
    subtitle?: string;
    showBack?: boolean;
    showAdd?: boolean;
    onAdd?: () => void;
    loading?: boolean;
    refreshing?: boolean;
    onRefresh?: () => void;
    emptyMessage?: string;
    emptyIcon?: React.ReactNode;
    headerContent?: React.ReactNode;
    children: React.ReactNode;
}

export default function GlassDataScreen({
    title,
    subtitle,
    showBack = true,
    showAdd,
    onAdd,
    loading,
    refreshing = false,
    onRefresh,
    emptyMessage,
    emptyIcon,
    headerContent,
    children,
}: GlassDataScreenProps) {
    const router = useRouter();
    const pathname = usePathname();
    const { isDark } = useThemeStore();
    const colors = isDark ? ThemeColors.dark : ThemeColors.light;

    return (
        <View style={[styles.container, { backgroundColor: colors.screenBg }]}>
            <StatusBar style={colors.statusBar} />
            <LinearGradient colors={colors.gradientColors} style={StyleSheet.absoluteFill} />
            <View style={[styles.orb, { backgroundColor: colors.orbColor }]} />

            <SafeAreaView style={styles.flex} edges={['top']}>
                {/* Top Bar */}
                <Animated.View
                    entering={FadeInUp.duration(Timings.entrance).delay(50)}
                    style={styles.topBar}
                >
                    {showBack && (
                        <Pressable style={[styles.backBtn, { backgroundColor: colors.inputBg }]} onPress={() => {
                            // Sub-navigation: orders pages go back to menu
                            if (pathname === '/sales/orders' || pathname === '/purchase/orders') {
                                router.push('/sales/orders-menu' as any);
                            } else if (pathname === '/sales/invoices' || pathname === '/purchase/receipts') {
                                router.push('/sales/invoices-menu' as any);
                            } else if (pathname === '/sales/customers' || pathname === '/purchase/suppliers') {
                                router.push('/sales/contacts-menu' as any);
                            } else if (pathname === '/sales/receivables' || pathname === '/purchase/payables') {
                                router.push('/sales/payments-menu' as any);
                            } else if (pathname === '/sales/quotes' || pathname === '/purchase/quotes') {
                                router.push('/sales/quotes-menu' as any);
                            } else if (pathname === '/sales/orders-menu' || pathname === '/sales/invoices-menu' || pathname === '/sales/contacts-menu' || pathname === '/sales/payments-menu' || pathname === '/sales/quotes-menu') {
                                router.push('/(tabs)/sales');
                            } else if (pathname.includes('/inventory/')) {
                                router.push('/(tabs)/inventory');
                            } else if (pathname.includes('/production/')) {
                                router.push('/(tabs)/production');
                            } else if (pathname.includes('/sales/') || pathname.includes('/purchase/')) {
                                router.push('/(tabs)/sales');
                            } else {
                                router.back();
                            }
                        }}>
                            <ChevronLeft size={22} color={colors.textSecondary} />
                        </Pressable>
                    )}
                    <View style={styles.titleWrap}>
                        <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>{title}</Text>
                        {subtitle ? <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text> : null}
                    </View>
                    {showAdd && (
                        <Pressable style={[styles.addBtn, { backgroundColor: 'rgba(1, 86, 167, 0.15)' }]} onPress={onAdd}>
                            <Plus size={20} color="#0156A7" />
                        </Pressable>
                    )}
                </Animated.View>

                {/* Header Extra Content */}
                {headerContent && (
                    <Animated.View entering={FadeInUp.duration(Timings.entrance).delay(100)}>
                        {headerContent}
                    </Animated.View>
                )}

                {/* Content */}
                {loading ? (
                    <View style={styles.flex}>
                        <View style={styles.scrollContent}>
                            {[1, 2, 3, 4, 5].map((_, i) => (
                                <SkeletonCard key={i} index={i} isDark={isDark} />
                            ))}
                        </View>
                    </View>
                ) : (
                    <ScrollView
                        style={styles.flex}
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            onRefresh ? (
                                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0156A7" />
                            ) : undefined
                        }
                    >
                        {children}
                        <View style={{ height: 100 }} />
                    </ScrollView>
                )}
            </SafeAreaView>
        </View>
    );
}

// Skeleton loading card with shimmer effect
function SkeletonCard({ index, isDark }: { index: number; isDark: boolean }) {
    const opacity = useSharedValue(0.3);

    React.useEffect(() => {
        opacity.value = withRepeat(
            withSequence(
                withTiming(1, { duration: 1000 }),
                withTiming(0.3, { duration: 1000 })
            ),
            -1,
            false
        );
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
    }));

    const shimmerColor = isDark ? 'rgba(255,255,255,0.25)' : 'rgba(99,102,241,0.25)';
    const cardBorder = isDark ? 'rgba(255,255,255,0.2)' : 'rgba(1, 86, 167, 0.35)';
    const cardBg = isDark ? 'rgba(30,30,50,0.4)' : 'rgba(255,255,255,0.85)';

    return (
        <Animated.View
            entering={FadeInUp.duration(400).delay(index * 80).springify().damping(18)}
            style={{ marginBottom: Spacing.md }}
        >
            <View style={[skeletonStyles.card, { borderColor: cardBorder }]}>
                <BlurView intensity={20} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
                <View style={[skeletonStyles.cardInner, { backgroundColor: cardBg }]}>
                    <Animated.View style={[skeletonStyles.line, skeletonStyles.lineTitle, { backgroundColor: shimmerColor }, animatedStyle]} />
                    <Animated.View style={[skeletonStyles.line, skeletonStyles.lineSubtitle, { backgroundColor: shimmerColor }, animatedStyle]} />
                    <View style={skeletonStyles.row}>
                        <Animated.View style={[skeletonStyles.line, skeletonStyles.lineSmall, { backgroundColor: shimmerColor }, animatedStyle]} />
                        <Animated.View style={[skeletonStyles.line, skeletonStyles.lineSmall, { backgroundColor: shimmerColor }, animatedStyle]} />
                    </View>
                </View>
            </View>
        </Animated.View>
    );
}

const skeletonStyles = StyleSheet.create({
    card: {
        borderRadius: BorderRadius.xl,
        overflow: 'hidden',
        borderWidth: 1,
    },
    cardInner: {
        padding: Spacing.lg,
    },
    line: {
        height: 12,
        borderRadius: 6,
    },
    lineTitle: {
        width: '60%',
        height: 16,
        marginBottom: 8,
    },
    lineSubtitle: {
        width: '80%',
        marginBottom: 12,
    },
    lineSmall: {
        width: '40%',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
    },
});

// Reusable glass list card — theme-aware
export function GlassListCard({
    children,
    index = 0,
    onPress,
}: {
    children: React.ReactNode;
    index?: number;
    onPress?: () => void;
}) {
    const { isDark } = useThemeStore();
    const scale = useSharedValue(1);
    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const cardBorder = isDark ? 'rgba(255,255,255,0.2)' : 'rgba(1, 86, 167, 0.35)';
    const cardBg = isDark ? 'rgba(30,30,50,0.4)' : 'rgba(255,255,255,0.85)';

    const content = (
        <Animated.View
            entering={FadeInUp.duration(400).delay(index * 50).springify().damping(18)}
            style={animatedStyle}
        >
            <View style={[cardStyles.card, { borderColor: cardBorder }]}>
                <BlurView intensity={20} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
                <View style={[cardStyles.cardInner, { backgroundColor: cardBg }]}>{children}</View>
            </View>
        </Animated.View>
    );

    if (!onPress) return content;

    return (
        <Pressable
            onPress={onPress}
            onPressIn={() => { scale.value = withSpring(0.97, Springs.snappy); }}
            onPressOut={() => { scale.value = withSpring(1, Springs.bouncy); }}
        >
            {content}
        </Pressable>
    );
}

// Reusable status badge
export function StatusBadge({ label, color }: { label: string; color: string }) {
    return (
        <View style={[badgeStyles.badge, { backgroundColor: `${color}20`, borderColor: `${color}40` }]}>
            <View style={[badgeStyles.dot, { backgroundColor: color }]} />
            <Text style={[badgeStyles.text, { color }]}>{label}</Text>
        </View>
    );
}

const cardStyles = StyleSheet.create({
    card: {
        borderRadius: BorderRadius.xl,
        overflow: 'hidden',
        borderWidth: 1,
    },
    cardInner: {
        padding: Spacing.lg,
    },
});

const badgeStyles = StyleSheet.create({
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
        borderWidth: 1,
        gap: 4,
        alignSelf: 'flex-start',
    },
    dot: { width: 6, height: 6, borderRadius: 3 },
    text: { fontSize: 11, fontWeight: '600' },
});

const styles = StyleSheet.create({
    container: { flex: 1 },
    flex: { flex: 1 },
    scrollContent: { paddingHorizontal: Spacing.xl },

    orb: {
        position: 'absolute',
        width: 180, height: 180, borderRadius: 90,
        top: -40, right: -40,
    },

    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.md,
        gap: Spacing.md,
    },
    backBtn: {
        width: 40, height: 40, borderRadius: 20,
        justifyContent: 'center', alignItems: 'center',
    },
    titleWrap: { flex: 1 },
    title: {
        fontSize: FontSizes.xl,
        fontWeight: FontWeights.bold,
    },
    subtitle: {
        fontSize: FontSizes.xs,
        marginTop: 2,
    },
    addBtn: {
        width: 40, height: 40, borderRadius: 20,
        justifyContent: 'center', alignItems: 'center',
    },

    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
