import React, { useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, Animated, TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Bell, Package, Factory, AlertTriangle, Truck, Info } from 'lucide-react-native';
import { useNotificationStore } from '@/store';
import { AppNotification } from '@/lib/notification-api';
import { Spacing, FontSizes, FontWeights } from '@/constants/Tokens';

const TYPE_CONFIG: Record<string, { icon: any; color: string }> = {
    NEW_ORDER: { icon: Package, color: '#0EA5E9' },
    PRODUCTION_COMPLETED: { icon: Factory, color: '#10B981' },
    LOW_STOCK: { icon: AlertTriangle, color: '#F59E0B' },
    GOODS_RECEIPT: { icon: Truck, color: '#6366F1' },
    GENERAL: { icon: Info, color: '#59677B' },
};

export default function NotificationToast() {
    const router = useRouter();
    const lastNotification = useNotificationStore(s => s.lastSocketNotification);
    const [current, setCurrent] = React.useState<AppNotification | null>(null);
    const translateY = useRef(new Animated.Value(-120)).current;
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!lastNotification) return;
        if (current?.id === lastNotification.id) return;

        setCurrent(lastNotification);

        Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 80,
            friction: 12,
        }).start();

        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            Animated.timing(translateY, {
                toValue: -120,
                duration: 250,
                useNativeDriver: true,
            }).start(() => setCurrent(null));
        }, 4000);

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [lastNotification]);

    if (!current) return null;

    const cfg = TYPE_CONFIG[current.type] ?? TYPE_CONFIG.GENERAL;
    const Icon = cfg.icon;

    return (
        <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => {
                Animated.timing(translateY, { toValue: -120, duration: 200, useNativeDriver: true }).start();
                setCurrent(null);
                router.push('/notifications' as any);
            }}
            style={styles.wrapper}
        >
            <Animated.View style={[styles.toast, { transform: [{ translateY }] }]}>
                <View style={[styles.iconWrap, { backgroundColor: `${cfg.color}18` }]}>
                    <Icon size={18} color={cfg.color} strokeWidth={2} />
                </View>
                <View style={styles.content}>
                    <Text style={styles.title} numberOfLines={1}>{current.title}</Text>
                    <Text style={styles.body} numberOfLines={1}>{current.body}</Text>
                </View>
            </Animated.View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 99999,
        paddingTop: 50,
        paddingHorizontal: Spacing.lg,
    },
    toast: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        backgroundColor: '#FFF',
        borderRadius: 14,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: 'rgba(1, 86, 167, 0.45)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 10,
    },
    iconWrap: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: { flex: 1 },
    title: {
        fontSize: FontSizes.sm,
        fontWeight: FontWeights.semibold,
        color: '#212529',
    },
    body: {
        fontSize: FontSizes.xs,
        color: '#59677B',
        marginTop: 2,
    },
});
