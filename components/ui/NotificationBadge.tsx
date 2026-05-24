import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNotificationStore } from '@/store';

interface NotificationBadgeProps {
    size?: number;
}

export default function NotificationBadge({ size = 18 }: NotificationBadgeProps) {
    const unreadCount = useNotificationStore(s => s.unreadCount);
    if (unreadCount === 0) return null;

    const display = unreadCount > 99 ? '99+' : String(unreadCount);

    return (
        <View style={[s.badge, { minWidth: size, height: size, borderRadius: size / 2 }]}>
            <Text style={[s.text, { fontSize: size * 0.6 }]}>{display}</Text>
        </View>
    );
}

const s = StyleSheet.create({
    badge: {
        position: 'absolute',
        top: -4,
        right: -6,
        backgroundColor: '#EF4444',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 3,
        borderWidth: 1.5,
        borderColor: '#FFF',
    },
    text: {
        color: '#FFF',
        fontWeight: '700',
        textAlign: 'center',
    },
});
