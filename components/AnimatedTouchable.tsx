// Animated Touchable Component with Press Feedback
import React, { useRef } from 'react';
import { Animated, TouchableOpacity, TouchableOpacityProps, StyleSheet } from 'react-native';

interface AnimatedTouchableProps extends TouchableOpacityProps {
    scaleValue?: number;
    children: React.ReactNode;
}

export default function AnimatedTouchable({
    scaleValue = 0.97,
    children,
    onPress,
    style,
    ...props
}: AnimatedTouchableProps) {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Animated.spring(scaleAnim, {
            toValue: scaleValue,
            useNativeDriver: true,
            speed: 50,
            bounciness: 4,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            speed: 50,
            bounciness: 4,
        }).start();
    };

    const handlePress = (event: any) => {
        if (onPress) {
            onPress(event);
        }
    };

    return (
        <TouchableOpacity
            {...props}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            onPress={handlePress}
            activeOpacity={0.9}
        >
            <Animated.View style={[style, { transform: [{ scale: scaleAnim }] }]}>
                {children}
            </Animated.View>
        </TouchableOpacity>
    );
}
