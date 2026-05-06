// Splash Screen — Proper route screen, shows 5s then navigates
import React, { useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withDelay,
    withRepeat,
    withSequence,
    Easing,
    withSpring,
} from 'react-native-reanimated';
import { useAuthStore } from '@/store';
import { notificationApi } from '@/lib/notification-api';
import StockFlowLogo from '@/components/TinPhatLogo';

const SPLASH_DURATION = 5000; // 5 seconds

export default function SplashScreen() {
    const router = useRouter();
    const { isAuthenticated, checkAuth } = useAuthStore();

    // Animation values
    const logoOpacity = useSharedValue(0);
    const logoScale = useSharedValue(0.7);
    const logoTranslateY = useSharedValue(20);
    const loaderOpacity = useSharedValue(0);
    const orb1Scale = useSharedValue(0.8);
    const orb2Scale = useSharedValue(0.6);

    useEffect(() => {
        // Start auth check immediately (in background)
        checkAuth();

        // ── Animations ──
        orb1Scale.value = withRepeat(
            withSequence(
                withTiming(1.2, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
                withTiming(0.8, { duration: 2500, easing: Easing.inOut(Easing.ease) })
            ),
            -1, true
        );
        orb2Scale.value = withRepeat(
            withSequence(
                withTiming(1.1, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
                withTiming(0.7, { duration: 3000, easing: Easing.inOut(Easing.ease) })
            ),
            -1, true
        );

        // Logo entrance
        logoOpacity.value = withDelay(200, withTiming(1, { duration: 700 }));
        logoScale.value = withDelay(200, withSpring(1, { damping: 12, stiffness: 80 }));
        logoTranslateY.value = withDelay(200, withTiming(0, { duration: 600 }));

        // Spinner fade in
        loaderOpacity.value = withDelay(700, withTiming(1, { duration: 400 }));

        // Navigate after 5 seconds
        const timer = setTimeout(async () => {
            const { isAuthenticated: authed } = useAuthStore.getState();
            if (authed) {
                try {
                    const { count } = await notificationApi.getUnreadCount();
                    router.replace(count > 0 ? ('/notifications' as any) : '/(tabs)');
                } catch {
                    router.replace('/(tabs)');
                }
            } else {
                router.replace('/login');
            }
        }, SPLASH_DURATION);

        return () => clearTimeout(timer);
    }, []);

    const logoAnimStyle = useAnimatedStyle(() => ({
        opacity: logoOpacity.value,
        transform: [
            { scale: logoScale.value },
            { translateY: logoTranslateY.value },
        ],
    }));

    const loaderContainerStyle = useAnimatedStyle(() => ({
        opacity: loaderOpacity.value,
    }));

    const orb1Style = useAnimatedStyle(() => ({
        transform: [{ scale: orb1Scale.value }],
    }));

    const orb2Style = useAnimatedStyle(() => ({
        transform: [{ scale: orb2Scale.value }],
    }));

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />
            <LinearGradient
                colors={['#F0F8FF', '#F9F9F9', '#FFFFFF']}
                style={StyleSheet.absoluteFill}
            />

            {/* Decorative orbs */}
            <Animated.View style={[styles.orb1, orb1Style, { backgroundColor: 'rgba(1, 86, 167, 0.05)' }]} />
            <Animated.View style={[styles.orb2, orb2Style, { backgroundColor: 'rgba(1, 86, 167, 0.08)' }]} />

            {/* Star dots */}
            <View style={styles.star1} />
            <View style={styles.star2} />
            <View style={styles.star3} />
            <View style={styles.star4} />
            <View style={styles.star5} />

            {/* Logo */}
            <Animated.View style={[styles.center, logoAnimStyle]}>
                <StockFlowLogo size={130} showText={true} />
            </Animated.View>

            {/* Spinner */}
            <Animated.View style={[styles.spinnerContainer, loaderContainerStyle]}>
                <ActivityIndicator size="large" color="#0156A7" />
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    orb1: {
        position: 'absolute',
        width: 320,
        height: 320,
        borderRadius: 160,
        backgroundColor: 'rgba(1, 86, 167, 0.05)',
        top: '15%',
        left: '50%',
        marginLeft: -160,
    },
    orb2: {
        position: 'absolute',
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: 'rgba(1, 86, 167, 0.08)',
        bottom: '20%',
        right: '10%',
    },
    star1: { position: 'absolute', width: 3, height: 3, borderRadius: 2, backgroundColor: 'rgba(165,180,252,0.6)', top: '12%', left: '20%' },
    star2: { position: 'absolute', width: 2, height: 2, borderRadius: 1, backgroundColor: 'rgba(94,234,212,0.5)', top: '25%', right: '15%' },
    star3: { position: 'absolute', width: 3, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.3)', top: '70%', left: '12%' },
    star4: { position: 'absolute', width: 2, height: 2, borderRadius: 1, backgroundColor: 'rgba(165,180,252,0.4)', bottom: '15%', left: '30%' },
    star5: { position: 'absolute', width: 3, height: 3, borderRadius: 2, backgroundColor: 'rgba(94,234,212,0.4)', top: '40%', right: '8%' },
    center: {
        alignItems: 'center',
        marginBottom: 60,
    },
    spinnerContainer: {
        position: 'absolute',
        bottom: 80,
        alignItems: 'center',
    },
});
