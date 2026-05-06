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

    if (variant === 'outline') {
        return (
            <Animated.View style={[animatedStyle, style]}>
                <Pressable
                    onPress={onPress}
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                    disabled={isDisabled}
                    style={[
                        styles.outline,
                        {
                            borderColor: '#0156A7', // VietinBank Blue border
                            backgroundColor: 'rgba(1, 86, 167, 0.05)', // Light blue background
                        },
                        isDisabled && styles.disabled,
                    ]}
                >
                    {icon}
                    <Text style={[styles.outlineText, { color: colors.textPrimary }]}>{title}</Text>
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
                    style={styles.ghost}
                >
                    <Text style={[styles.ghostText, { color: colors.textSecondary }]}>{title}</Text>
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
                    style={[styles.filled]}
                >
                    {loading ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                        <>
                            {icon}
                            <Text style={styles.filledText}>{title}</Text>
                        </>
                    )}
                </LinearGradient>
            </Pressable>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
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
