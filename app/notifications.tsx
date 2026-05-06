// Notifications Screen — Glassmorphism
import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, Pressable, ScrollView,
    RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import {
    ChevronLeft, Bell, BellOff, CheckCheck,
    Package, Factory, AlertTriangle, Truck, Info,
} from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';

import { notificationApi, AppNotification, NotificationType } from '@/lib/notification-api';
import { Spacing, FontSizes, FontWeights } from '@/constants/Tokens';
import { useThemeStore } from '@/store';
import { ThemeColors } from '@/constants/ThemeColors';
import { secureStorage } from '@/lib/secure-storage';
import { connectSocket, getSocket } from '@/lib/socket';

// ─── Helpers ──────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Vừa xong';
    if (mins < 60) return `${mins} phút trước`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} giờ trước`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days} ngày trước`;
    return new Date(dateStr).toLocaleDateString('vi-VN');
}

// Type config now accepts isDark to compute colors
function getTypeConfig(isDark: boolean): Record<NotificationType, { Icon: any; color: string; bg: string }> {
    return {
        NEW_ORDER: { Icon: Package, color: '#3B82F6', bg: 'rgba(59,130,246,0.1)' },
        PRODUCTION_COMPLETED: { Icon: Factory, color: '#10B981', bg: 'rgba(16,185,129,0.1)' },
        LOW_STOCK: { Icon: AlertTriangle, color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
        GOODS_RECEIPT: { Icon: Truck, color: '#0EA5E9', bg: 'rgba(14,165,233,0.1)' },
        GENERAL: { Icon: Info, color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)' },
    };
}

// ─── Components ───────────────────────────────────────────────

function NotifCard({ notif, index, onRead, blurTint, cardBg, textPrimary, textMuted, cardBorder, isDark }: {
    notif: AppNotification;
    index: number;
    onRead: (id: string) => void;
    blurTint: 'light' | 'dark';
    cardBg: string;
    textPrimary: string;
    textMuted: string;
    cardBorder: string;
    isDark: boolean;
}) {
    const TYPE_CONFIG = getTypeConfig(isDark);
    const cfg = TYPE_CONFIG[notif.type] ?? TYPE_CONFIG.GENERAL;
    const { Icon } = cfg;

    return (
        <Animated.View entering={FadeInUp.duration(350).delay(index * 40).springify().damping(18)}>
            <Pressable
                style={[s.card, !notif.read && s.cardUnread, { borderColor: notif.read ? cardBorder : (isDark ? 'rgba(129,140,248,0.4)' : 'rgba(129,140,248,0.3)') }]}
                onPress={() => !notif.read && onRead(notif.id)}
            >
                <BlurView intensity={isDark ? 20 : 18} tint={blurTint} style={StyleSheet.absoluteFill} />
                {!notif.read && <View style={s.unreadBar} />}

                <View style={[s.cardInner, { backgroundColor: cardBg }]}>
                    {/* Icon */}
                    <View style={[s.iconWrap, { backgroundColor: cfg.bg }]}>
                        <Icon size={20} color={cfg.color} />
                    </View>

                    {/* Content */}
                    <View style={s.content}>
                        <View style={s.titleRow}>
                            <Text style={[s.title, { color: notif.read ? textMuted : textPrimary }, !notif.read && s.titleUnread]} numberOfLines={1}>
                                {notif.title}
                            </Text>
                            {!notif.read && <View style={s.dot} />}
                        </View>
                        <Text style={[s.body, { color: textMuted }]} numberOfLines={2}>{notif.body}</Text>
                        <Text style={[s.time, { color: textMuted + 'CC' }]}>{timeAgo(notif.createdAt)}</Text>
                    </View>
                </View>
            </Pressable>
        </Animated.View>
    );
}

function EmptyState({ colors }: { colors: any }) {
    return (
        <Animated.View entering={FadeInUp.duration(500).springify()} style={s.empty}>
            <View style={[s.emptyIcon, { borderColor: colors.cardBorder }]}>
                <BlurView intensity={20} tint={colors.blurTint} style={StyleSheet.absoluteFill} />
                <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.cardBg }]} />
                <BellOff size={36} color={colors.textMuted} />
            </View>
            <Text style={[s.emptyTitle, { color: colors.textSecondary }]}>Không có thông báo</Text>
            <Text style={[s.emptyBody, { color: colors.textMuted }]}>Bạn sẽ nhận được thông báo khi có đơn hàng mới, sản xuất hoàn thành, hoặc tồn kho thấp.</Text>
        </Animated.View>
    );
}

// ─── Main Screen ──────────────────────────────────────────────

export default function NotificationsScreen() {
    const router = useRouter();
    const { isDark } = useThemeStore();
    const colors = ThemeColors.light;
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [markingAll, setMarkingAll] = useState(false);

    const load = useCallback(async () => {
        try {
            const res = await notificationApi.getNotifications({ take: 50 });
            setNotifications(res.items);
            setUnreadCount(res.unreadCount);
        } catch { }
    }, []);

    useEffect(() => { 
        load().finally(() => setLoading(false)); 
        
        let mounted = true;
        const handleNewNotification = (newNotif: AppNotification) => {
            if (mounted) {
                setNotifications(prev => [newNotif, ...prev]);
                setUnreadCount(prev => prev + 1);
            }
        };

        async function initSocket() {
            try {
                const token = await secureStorage.getToken();
                if (token && mounted) {
                    const socket = connectSocket(token);
                    socket.on('new_notification', handleNewNotification);
                }
            } catch (e) { }
        }
        initSocket();

        return () => {
            mounted = false;
            const socket = getSocket();
            socket.off('new_notification', handleNewNotification);
        };
    }, [load]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await load();
        setRefreshing(false);
    }, [load]);

    const handleRead = useCallback(async (id: string) => {
        try {
            await notificationApi.markAsRead(id);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch { }
    }, []);

    const handleMarkAll = useCallback(async () => {
        if (unreadCount === 0) return;
        setMarkingAll(true);
        try {
            await notificationApi.markAllAsRead();
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            setUnreadCount(0);
        } catch {
        } finally { setMarkingAll(false); }
    }, [unreadCount]);

    return (
        <View style={s.root}>
            <StatusBar style={isDark ? "light" : "dark"} />
            <LinearGradient colors={colors.gradientColors} style={StyleSheet.absoluteFill} />

            <SafeAreaView style={s.safe} edges={['top']}>
                {/* Header */}
                <Animated.View entering={FadeInDown.duration(400)} style={s.header}>
                    <Pressable style={[s.headerBtn, { backgroundColor: colors.inputBg }]} onPress={() => router.canGoBack() ? router.back() : router.replace('/home')}>
                        <ChevronLeft size={22} color={colors.textSecondary} />
                    </Pressable>

                    <View style={s.headerCenter}>
                        <Text style={[s.headerTitle, { color: colors.textPrimary }]}>Thông báo</Text>
                        {unreadCount > 0 && (
                            <View style={s.headerBadge}>
                                <Text style={s.headerBadgeText}>{unreadCount}</Text>
                            </View>
                        )}
                    </View>

                    <Pressable
                        style={[s.headerBtn, { backgroundColor: colors.inputBg }, unreadCount > 0 && { borderWidth: 1, borderColor: isDark ? 'rgba(129,140,248,0.4)' : 'rgba(129,140,248,0.3)' }]}
                        onPress={handleMarkAll}
                        disabled={unreadCount === 0 || markingAll}
                    >
                        {markingAll
                            ? <ActivityIndicator size="small" color={colors.textAccent} />
                            : <CheckCheck size={18} color={unreadCount > 0 ? (isDark ? '#818CF8' : '#6366F1') : colors.textMuted} />}
                    </Pressable>
                </Animated.View>

                {/* Filter hint */}
                {unreadCount > 0 && (
                    <Animated.View entering={FadeInDown.duration(300).delay(100)} style={[s.filterBar, { backgroundColor: isDark ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.05)', borderColor: isDark ? 'rgba(129,140,248,0.2)' : 'rgba(129,140,248,0.1)' }]}>
                        <Bell size={13} color={isDark ? '#A5B4FC' : '#818CF8'} />
                        <Text style={[s.filterText, { color: isDark ? '#A5B4FC' : '#4F46E5' }]}>
                            {unreadCount} thông báo chưa đọc · Nhấn OK để đọc tất cả
                        </Text>
                    </Animated.View>
                )}

                {/* List */}
                {loading ? (
                    <View style={s.loader}><ActivityIndicator color={colors.textAccent} size="large" /></View>
                ) : (
                    <ScrollView
                        contentContainerStyle={s.list}
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                                tintColor={colors.textAccent}
                                colors={[colors.textAccent]}
                            />
                        }
                    >
                        {notifications.length === 0
                            ? <EmptyState colors={colors} />
                            : notifications.map((n, i) => (
                                <NotifCard
                                    key={n.id}
                                    notif={n}
                                    index={i}
                                    onRead={handleRead}
                                    blurTint={colors.blurTint as 'light' | 'dark'}
                                    cardBg={colors.cardBg}
                                    textPrimary={colors.textPrimary}
                                    textMuted={colors.textMuted}
                                    cardBorder={colors.cardBorder}
                                    isDark={isDark}
                                />
                            ))
                        }
                        <View style={{ height: 120 }} />
                    </ScrollView>
                )}
            </SafeAreaView>
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────
const s = StyleSheet.create({
    root: { flex: 1 },
    safe: { flex: 1 },

    // Header
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
    headerBtn: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
    headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    headerTitle: { fontSize: FontSizes.lg, fontWeight: FontWeights.bold },
    headerBadge: { backgroundColor: '#6366F1', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, minWidth: 22, alignItems: 'center' },
    headerBadgeText: { fontSize: 11, fontWeight: FontWeights.bold, color: '#FFFFFF' },

    // Filter bar
    filterBar: { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: Spacing.xl, marginBottom: Spacing.sm, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
    filterText: { fontSize: FontSizes.xs, flex: 1 },

    // List
    list: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.sm, gap: 10 },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    // Card
    card: { borderRadius: 18, overflow: 'hidden', borderWidth: 1 },
    cardUnread: {},
    cardInner: { flexDirection: 'row', alignItems: 'flex-start', padding: 14, gap: 12 },
    unreadBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: '#6366F1', borderTopLeftRadius: 18, borderBottomLeftRadius: 18 },

    iconWrap: { width: 42, height: 42, borderRadius: 13, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },

    content: { flex: 1 },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
    title: { flex: 1, fontSize: FontSizes.sm, fontWeight: FontWeights.medium },
    titleUnread: { fontWeight: FontWeights.semibold },
    dot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#6366F1', flexShrink: 0 },
    body: { fontSize: FontSizes.xs, lineHeight: 17, marginBottom: 5 },
    time: { fontSize: 11 },

    // Empty
    empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 },
    emptyIcon: { width: 80, height: 80, borderRadius: 24, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', borderWidth: 1, marginBottom: 20 },
    emptyTitle: { fontSize: FontSizes.lg, fontWeight: FontWeights.semibold, marginBottom: 8 },
    emptyBody: { fontSize: FontSizes.sm, textAlign: 'center', lineHeight: 20 },
});
