// Animated FAB (Floating Action Button) with Bounce
import React, { useEffect, useRef } from 'react';
import { Animated, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/Colors';
import { Spacing, FontWeights, Shadows } from '@/constants/Tokens';

interface AnimatedFABProps {
    onPress: () => void;
    icon?: string;
    backgroundColor?: string;
    size?: number;
}

export default function AnimatedFAB({
    onPress,
    icon = '+',
    backgroundColor = Colors.primary[500],
    size = 56,
}: AnimatedFABProps) {
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const bounceAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        // Entrance animation
        Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            tension: 50,
            friction: 7,
        }).start();
    }, []);

    const handlePressIn = () => {
        Animated.spring(bounceAnim, {
            toValue: 0.9,
            useNativeDriver: true,
            speed: 50,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(bounceAnim, {
            toValue: 1,
            useNativeDriver: true,
            speed: 50,
            bounciness: 10,
        }).start();
    };

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    transform: [{ scale: Animated.multiply(scaleAnim, bounceAnim) }],
                },
            ]}
        >
            <TouchableOpacity
                style={[
                    styles.fab,
                    {
                        backgroundColor,
                        width: size,
                        height: size,
                        borderRadius: size / 2,
                    },
                ]}
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                activeOpacity={0.9}
            >
                <Text style={styles.fabIcon}>{icon}</Text>
            </TouchableOpacity>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        right: Spacing.xl,
        bottom: Spacing.xl,
    },
    fab: {
        justifyContent: 'center',
        alignItems: 'center',
        ...Shadows.large,
        elevation: 8,
    },
    fabIcon: {
        fontSize: 32,
        color: Colors.neutral.white,
        fontWeight: FontWeights.bold,
    },
});
