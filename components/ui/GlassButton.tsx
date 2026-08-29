// GlassButton — Glassmorphism button with press animation (theme-aware)
import React from 'react';
import { StyleSheet, Text, ActivityIndicator, ViewStyle } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
} from 'react-native-reanimated';
import { Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BorderRadius, Spacing, FontSizes, FontWeights, TouchTargets } from '@/constants/Tokens';
import { ResponsiveTouchTargets, ResponsiveFontSizes } from '@/constants/ResponsiveTokens';
import { useResponsive } from '@/hooks/useResponsive';
import { Springs } from '@/constants/GlassTokens';
import { useThemeStore } from '@/store';
import { ThemeColors } from '@/constants/ThemeColors';

interface GlassButtonProps {
    title: string;
    onPress: () => void;
    loading?: boolean;
    disabled?: boolean;
    variant?: 'filled' | 'outline' | 'ghost';
    gradient?: readonly [string, string, ...string[]];
    style?: ViewStyle;
    icon?: React.ReactNode;
}

// Dynamic styles using responsive values - defined BEFORE component for hoisting
const getStyles = (
    rTouchTargets: typeof ResponsiveTouchTargets.base,
    rFontSizes: typeof ResponsiveFontSizes.base
) => StyleSheet.create({
    filled: {
        height: rTouchTargets.comfortable,
        borderRadius: BorderRadius.lg,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        gap: Spacing.sm,
        paddingHorizontal: Spacing.xl,
    },
    filledText: {
        color: '#FFFFFF',
        fontSize: rFontSizes.base,
        fontWeight: FontWeights.semibold,
        letterSpacing: 0.5,
    },
    outline: {
        height: rTouchTargets.comfortable,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        gap: Spacing.sm,
        paddingHorizontal: Spacing.xl,
    },
    outlineText: {
        fontSize: rFontSizes.base,
        fontWeight: FontWeights.medium,
    },
    ghost: {
        height: rTouchTargets.min,
        justifyContent: 'center',
        alignItems: 'center',
    },
    ghostText: {
        fontSize: rFontSizes.sm,
        fontWeight: FontWeights.medium,
    },
    disabled: {
        opacity: 0.5,
    },
});

// Static styles as fallback for SSR
const staticStyles = StyleSheet.create({
    filled: {
        height: TouchTargets.comfortable,
        borderRadius: BorderRadius.lg,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        gap: Spacing.sm,
        paddingHorizontal: Spacing.xl,
    },
    filledText: {
        color: '#FFFFFF',
        fontSize: FontSizes.base,
        fontWeight: FontWeights.semibold,
        letterSpacing: 0.5,
    },
    outline: {
        height: TouchTargets.comfortable,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        gap: Spacing.sm,
        paddingHorizontal: Spacing.xl,
    },
    outlineText: {
        fontSize: FontSizes.base,
        fontWeight: FontWeights.medium,
    },
    ghost: {
        height: TouchTargets.min,
        justifyContent: 'center',
        alignItems: 'center',
    },
    ghostText: {
        fontSize: FontSizes.sm,
        fontWeight: FontWeights.medium,
    },
    disabled: {
        opacity: 0.5,
    },
});

export default function GlassButton({
    title,
    onPress,
    loading,
    disabled,
    variant = 'filled',
    gradient = ['#6366F1', '#4F46E5'],
    style,
    icon,
}: GlassButtonProps) {
    const { isDark } = useThemeStore();
    const colors = isDark ? ThemeColors.dark : ThemeColors.light;
    const { getValues } = useResponsive();
    const rTouchTargets = getValues(ResponsiveTouchTargets);
    const rFontSizes = getValues(ResponsiveFontSizes);
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const handlePressIn = () => {
        scale.value = withSpring(0.96, Springs.snappy);
    };

    const handlePressOut = () => {
        scale.value = withSpring(1, Springs.bouncy);
    };

    const isDisabled = disabled || loading;

    // Get responsive styles (now getStyles is hoisted)
    const dynamicStyles = getStyles(rTouchTargets, rFontSizes);
    const s = { ...staticStyles, ...dynamicStyles };

    if (variant === 'outline') {
        return (
            <Animated.View style={[animatedStyle, style]}>
                <Pressable
                    onPress={onPress}
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                    disabled={isDisabled}
                    style={[
                        s.outline,
                        {
                            borderColor: '#0156A7',
                            backgroundColor: 'rgba(1, 86, 167, 0.05)',
                        },
                        isDisabled && s.disabled,
                    ]}
                >
                    {icon}
                    <Text style={[s.outlineText, { color: colors.textPrimary }]}>{title}</Text>
                </Pressable>
            </Animated.View>
        );
    }

    if (variant === 'ghost') {
        return (
            <Animated.View style={[animatedStyle, style]}>
                <Pressable
                    onPress={onPress}
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                    disabled={isDisabled}
                    style={s.ghost}
                >
                    <Text style={[s.ghostText, { color: colors.textSecondary }]}>{title}</Text>
                </Pressable>
            </Animated.View>
        );
    }

    return (
        <Animated.View style={[animatedStyle, style]}>
            <Pressable
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                disabled={isDisabled}
            >
                <LinearGradient
                    colors={isDisabled ? ['#6B7280', '#4B5563'] : gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={s.filled}
                >
                    {loading ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                        <>
                            {icon}
                            <Text style={s.filledText}>{title}</Text>
                        </>
                    )}
                </LinearGradient>
            </Pressable>
        </Animated.View>
    );
}