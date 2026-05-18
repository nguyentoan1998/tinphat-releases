// GlassInput — Frosted glass text input with floating label (theme-aware)
import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, TextInput, View, TextInputProps, Pressable } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    interpolate,
} from 'react-native-reanimated';
import { GlassTokens } from '@/constants/GlassTokens';
import { BorderRadius, Spacing, FontSizes, FontWeights } from '@/constants/Tokens';
import { useThemeStore } from '@/store';

interface GlassInputProps extends TextInputProps {
    label: string;
    icon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    /** @deprecated theme is now auto-detected from ThemeStore */
    theme?: 'light' | 'dark';
    error?: string;
}

export default function GlassInput({
    label,
    icon,
    rightIcon,
    theme,
    error,
    value,
    onFocus,
    onBlur,
    ...rest
}: GlassInputProps) {
    const { isDark } = useThemeStore();
    // Use explicit prop if provided (e.g. auth screens always dark), otherwise follow store
    const resolvedTheme = theme ?? (isDark ? 'dark' : 'light');
    const tokens = GlassTokens[resolvedTheme].input;
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef<TextInput>(null);
    const labelPosition = useSharedValue(value ? 1 : 0);

    useEffect(() => {
        labelPosition.value = withTiming(value || isFocused ? 1 : 0, { duration: 200 });
    }, [value, isFocused]);

    const animatedLabelStyle = useAnimatedStyle(() => ({
        transform: [
            { translateY: interpolate(labelPosition.value, [0, 1], [0, -26]) },
            { scale: interpolate(labelPosition.value, [0, 1], [1, 0.75]) },
        ],
        opacity: interpolate(labelPosition.value, [0, 1], [0.6, 1]),
    }));

    const handleFocus = (e: any) => {
        setIsFocused(true);
        onFocus?.(e);
    };

    const handleBlur = (e: any) => {
        setIsFocused(false);
        onBlur?.(e);
    };

    return (
        <Pressable onPress={() => inputRef.current?.focus()} style={styles.outer}>
            {/* Floating label — sits above the input border, not clipped */}
            <Animated.Text
                style={[
                    styles.label,
                    {
                        color: isFocused ? '#0156A7' : tokens.placeholder,
                        backgroundColor: tokens.background,
                    },
                    animatedLabelStyle,
                ]}
            >
                {label}
            </Animated.Text>

            {/* Input container with border */}
            <View
                style={[
                    styles.container,
                    {
                        backgroundColor: tokens.background,
                        borderColor: isFocused
                            ? '#0156A7'
                            : error
                                ? '#D0202F'
                                : tokens.border,
                    },
                ]}
            >
                {icon && <View style={styles.iconLeft}>{icon}</View>}
                <TextInput
                    ref={inputRef}
                    style={[styles.input, { color: tokens.text }]}
                    placeholderTextColor="transparent"
                    value={value}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    {...rest}
                />
                {rightIcon && <View style={styles.iconRight}>{rightIcon}</View>}
            </View>

            {error && (
                <Animated.Text style={[styles.errorText, { color: isDark ? '#FCA5A5' : '#EF4444' }]}>{error}</Animated.Text>
            )}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    outer: {
        // Space above container so floating label isn't clipped
        paddingTop: 8,
    },
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: BorderRadius.lg,
        paddingHorizontal: Spacing.lg,
        height: 58,
    },
    iconLeft: {
        marginRight: Spacing.md,
        opacity: 0.7,
    },
    iconRight: {
        marginLeft: Spacing.md,
        opacity: 0.7,
    },
    label: {
        position: 'absolute',
        left: Spacing.lg,
        top: 20,
        fontSize: FontSizes.base,
        fontWeight: FontWeights.regular,
        zIndex: 1,
        paddingHorizontal: 4,
    },
    input: {
        flex: 1,
        fontSize: FontSizes.base,
        fontWeight: FontWeights.medium,
        paddingVertical: 0,
    },
    errorText: {
        fontSize: FontSizes.xs,
        marginTop: 4,
        marginLeft: Spacing.lg,
    },
});
