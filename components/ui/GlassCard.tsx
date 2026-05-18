// GlassCard — Frosted glass container with blur + border
import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { GlassTokens } from '@/constants/GlassTokens';
import { BorderRadius, Spacing } from '@/constants/Tokens';

interface GlassCardProps {
    children: React.ReactNode;
    intensity?: number;
    theme?: 'light' | 'dark';
    style?: ViewStyle;
    noPadding?: boolean;
}

export default function GlassCard({
    children,
    intensity,
    theme = 'light',
    style,
    noPadding,
}: GlassCardProps) {
    const tokens = GlassTokens[theme].card;

    return (
        <View style={[styles.wrapper, style]}>
            <BlurView
                intensity={intensity ?? tokens.blur}
                tint={tokens.tint}
                style={StyleSheet.absoluteFill}
            />
            <View
                style={[
                    styles.inner,
                    {
                        backgroundColor: tokens.background,
                        borderColor: tokens.border,
                    },
                    noPadding && styles.noPadding,
                ]}
            >
                {children}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        borderRadius: BorderRadius.xl,
        overflow: 'hidden',
    },
    inner: {
        borderRadius: BorderRadius.xl,
        borderWidth: 1,
        padding: Spacing.xl,
    },
    noPadding: {
        padding: 0,
    },
});
