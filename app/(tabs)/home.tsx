// Home Screen — Default screen after login
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    View, Text, StyleSheet, Pressable, ScrollView,
    RefreshControl, Animated as RNAnimated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import {
    Bell, Settings,
    // Lương group
    CalendarCheck, Boxes, Banknote,
    // Nhân sự group
    Users, CalendarOff, LogOut,
    // Video group — mỗi loại một icon riêng
    Drill, Flame, Zap, Sparkles, Wrench, Scan,
    // Header icons
    DollarSign, UserCog, Video,
    // Công nợ group
    ArrowDownToLine, ArrowUpFromLine, BarChart2, ShoppingCart, CreditCard,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';

import { Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants/Tokens';
import { ThemeColors } from '@/constants/ThemeColors';
import { useAuthStore } from '@/store';
import { getRoleLabel } from '@/lib/role-permissions';
import { notificationApi } from '@/lib/notification-api';
import { employeeApi } from '@/lib/employee-api';

// ─── Types ────────────────────────────────────────────────────

interface ActionItem {
    id: string;
    label: string;
    Icon: any;
    iconColor: string;
    bgColor: string;
    route: string;
    animated?: boolean;
}

interface ActionGroup {
    id: string;
    title: string;
    headerGradient: readonly [string, string];
    headerIcon: any;
    items: ActionItem[];
}

// ─── Data ─────────────────────────────────────────────────────

const ACTION_GROUPS: ActionGroup[] = [
    {
        id: 'salary',
        title: 'Lương',
        headerGradient: ['#10B981', '#34D399'],
        headerIcon: DollarSign,
        items: [
            {
                id: 'attendance',
                label: 'Chấm công',
                Icon: CalendarCheck,
                iconColor: '#10B981',
                bgColor: 'rgba(16,185,129,0.12)',
                route: '/attendance',
            },
            {
                id: 'product-outputs',
                label: 'Tổng hợp sản phẩm',
                Icon: Boxes,
                iconColor: '#0EA5E9',
                bgColor: 'rgba(14,165,233,0.12)',
                route: '/product-outputs',
            },
            {
                id: 'salary',
                label: 'Bảng lương',
                Icon: Banknote,
                iconColor: '#F59E0B',
                bgColor: 'rgba(245,158,11,0.12)',
                route: '/salary',
            },
        ],
    },
    {
        id: 'hr',
        title: 'Nhân sự',
        headerGradient: ['#6366F1', '#818CF8'],
        headerIcon: UserCog,
        items: [
            {
                id: 'employees',
                label: 'Danh sách nhân viên',
                Icon: Users,
                iconColor: '#6366F1',
                bgColor: 'rgba(99,102,241,0.12)',
                route: '/employees',
            },
            {
                id: 'leave-request',
                label: 'Đơn xin nghỉ phép',
                Icon: CalendarOff,
                iconColor: '#A855F7',
                bgColor: 'rgba(168,85,247,0.12)',
                route: '/leave-request',
            },
            {
                id: 'resign-request',
                label: 'Đơn xin nghỉ việc',
                Icon: LogOut,
                iconColor: '#EF4444',
                bgColor: 'rgba(239,68,68,0.12)',
                route: '/resignation-request',
            },
        ],
    },
    {
        id: 'debt',
        title: 'Công nợ',
        headerGradient: ['#F59E0B', '#FBBF24'],
        headerIcon: CreditCard,
        items: [
            {
                id: 'receivables',
                label: 'Khách hàng',
                Icon: ArrowDownToLine,
                iconColor: '#10B981',
                bgColor: 'rgba(16,185,129,0.12)',
                route: '/sales/receivables',
            },
            {
                id: 'payables',
                label: 'Nhà cung cấp',
                Icon: ArrowUpFromLine,
                iconColor: '#EF4444',
                bgColor: 'rgba(239,68,68,0.12)',
                route: '/purchase/payables',
            },
            {
                id: 'report-sales',
                label: 'Báo cáo bán hàng',
                Icon: BarChart2,
                iconColor: '#6366F1',
                bgColor: 'rgba(99,102,241,0.12)',
                route: '/sales/reports',
            },
            {
                id: 'report-purchase',
                label: 'Báo cáo mua hàng',
                Icon: ShoppingCart,
                iconColor: '#F59E0B',
                bgColor: 'rgba(245,158,11,0.12)',
                route: '/sales/reports',
            },
        ],
    },
    {
        id: 'tutorials',
        title: 'Video hướng dẫn',
        headerGradient: ['#F59E0B', '#FB923C'],
        headerIcon: Video,
        items: [
            {
                id: 'tutorial-drill',
                label: 'Khoan cắt',
                Icon: Drill,
                iconColor: '#0156A7',
                bgColor: 'rgba(1,86,167,0.12)',
                route: '/tutorials',
                animated: true,
            },
            {
                id: 'tutorial-weld',
                label: 'Hàn',
                Icon: Flame,
                iconColor: '#EF4444',
                bgColor: 'rgba(239,68,68,0.12)',
                route: '/tutorials',
                animated: true,
            },
            {
                id: 'tutorial-punch',
                label: 'Đột dập',
                Icon: Zap,
                iconColor: '#F59E0B',
                bgColor: 'rgba(245,158,11,0.12)',
                route: '/tutorials',
                animated: true,
            },
            {
                id: 'tutorial-polish',
                label: 'Đánh bóng',
                Icon: Sparkles,
                iconColor: '#10B981',
                bgColor: 'rgba(16,185,129,0.12)',
                route: '/tutorials',
                animated: true,
            },
            {
                id: 'tutorial-assembly',
                label: 'Lắp ráp',
                Icon: Wrench,
                iconColor: '#6366F1',
                bgColor: 'rgba(99,102,241,0.12)',
                route: '/tutorials',
                animated: true,
            },
            {
                id: 'tutorial-laser',
                label: 'Laser',
                Icon: Scan,
                iconColor: '#A855F7',
                bgColor: 'rgba(168,85,247,0.12)',
                route: '/tutorials',
                animated: true,
            },
        ],
    },
];

// ─── Greeting helper ──────────────────────────────────────────

function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Chào buổi sáng';
    if (hour < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
}

// ─── Animated icon wrapper ────────────────────────────────────
// Pulse animation for video tutorial icons

function PulseIcon({ Icon, color, size }: { Icon: any; color: string; size: number }) {
    const scale = useRef(new RNAnimated.Value(1)).current;

    useEffect(() => {
        const pulse = RNAnimated.loop(
            RNAnimated.sequence([
                RNAnimated.timing(scale, {
                    toValue: 1.18,
                    duration: 900,
                    useNativeDriver: true,
                }),
                RNAnimated.timing(scale, {
                    toValue: 1,
                    duration: 900,
                    useNativeDriver: true,
                }),
            ])
        );
        pulse.start();
        return () => pulse.stop();
    }, [scale]);

    return (
        <RNAnimated.View style={{ transform: [{ scale }] }}>
            <Icon size={size} color={color} strokeWidth={1.6} />
        </RNAnimated.View>
    );
}

// ─── Sub-components ───────────────────────────────────────────

function HeroCard({ name, role }: { name: string; role: string }) {
    return (
        <Animated.View entering={FadeInDown.duration(500).delay(60).springify().damping(16)} style={s.heroWrap}>
            <LinearGradient
                colors={['#0156A7', '#0284C7', '#38BDF8']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={s.heroGradient}
            >
                <View style={s.orb1} />
                <View style={s.orb2} />

                <View style={s.heroContent}>
                    <View style={s.heroLeft}>
                        <Text style={s.heroGreeting}>{getGreeting()},</Text>
                        <Text style={s.heroName} numberOfLines={1}>{name}</Text>
                        <View style={s.roleBadge}>
                            <View style={s.roleDot} />
                            <Text style={s.roleText}>{role}</Text>
                        </View>
                    </View>
                    <LinearGradient
                        colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.1)']}
                        style={s.heroAvatar}
                    >
                        <Text style={s.heroAvatarText}>
                            {name.split(' ').map(w => w[0]).slice(-2).join('').toUpperCase()}
                        </Text>
                    </LinearGradient>
                </View>
            </LinearGradient>
        </Animated.View>
    );
}

function ActionGroupCard({ group, delay, onPress }: {
    group: ActionGroup;
    delay: number;
    onPress: (route: string) => void;
}) {
    const colors = ThemeColors.light;
    const HeaderIcon = group.headerIcon;

    return (
        <Animated.View
            entering={FadeInUp.duration(450).delay(delay).springify().damping(18)}
            style={[s.groupCard, { borderColor: colors.cardBorder }]}
        >
            <BlurView intensity={18} tint="light" style={StyleSheet.absoluteFill} />
            <View style={[s.groupInner, { backgroundColor: colors.cardBg }]}>
                {/* Group header — no chevron */}
                <View style={s.groupHeader}>
                    <LinearGradient colors={group.headerGradient} style={s.groupHeaderIcon}>
                        <HeaderIcon size={14} color="#FFF" strokeWidth={2.5} />
                    </LinearGradient>
                    <Text style={[s.groupTitle, { color: colors.textPrimary }]}>{group.title}</Text>
                </View>

                <View style={[s.groupDivider, { backgroundColor: colors.divider }]} />

                {/* Action items grid — outline style icons */}
                <View style={s.itemsGrid}>
                    {group.items.map((item) => {
                        const ItemIcon = item.Icon;
                        return (
                            <Pressable
                                key={item.id}
                                style={({ pressed }) => [
                                    s.actionItem,
                                    pressed && s.actionItemPressed,
                                ]}
                                onPress={() => onPress(item.route)}
                            >
                                <View style={[s.actionIconWrap, { backgroundColor: item.bgColor }]}>
                                    {item.animated ? (
                                        <PulseIcon Icon={ItemIcon} color={item.iconColor} size={22} />
                                    ) : (
                                        <ItemIcon size={22} color={item.iconColor} strokeWidth={1.6} />
                                    )}
                                </View>
                                <Text style={[s.actionLabel, { color: colors.textSecondary }]} numberOfLines={2}>
                                    {item.label}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>
            </View>
        </Animated.View>
    );
}

// ─── Main Screen ──────────────────────────────────────────────

export default function HomeScreen() {
    const router = useRouter();
    const { user } = useAuthStore();
    const colors = ThemeColors.light;
    const [unreadCount, setUnreadCount] = useState(0);
    const [refreshing, setRefreshing] = useState(false);
    const [fullName, setFullName] = useState<string>('');

    const roleLabel = getRoleLabel(user?.role);

    // Fetch employee fullName — user.name từ User table thường là email prefix
    // fullName thực sự nằm ở Employee.fullName
    useEffect(() => {
        if (!user) return;
        const fetchName = async () => {
            try {
                // Thử lấy theo employeeId nếu có, fallback về user.id
                const empId = (user as any).employeeId || user.id;
                const emp = await employeeApi.getEmployeeById(empId);
                if (emp?.fullName) setFullName(emp.fullName);
            } catch {
                // Fallback: dùng user.name hoặc email prefix
            }
        };
        fetchName();
    }, [user]);

    // Tên hiển thị: ưu tiên fullName từ employee, sau đó user.name, cuối cùng email prefix
    const displayName = fullName || user?.name || user?.email?.split('@')[0] || 'Bạn';

    const loadUnread = useCallback(async () => {
        try {
            const res = await notificationApi.getNotifications({ take: 1 });
            setUnreadCount(res.unreadCount ?? 0);
        } catch { }
    }, []);

    useEffect(() => {
        loadUnread();
    }, [loadUnread]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadUnread();
        setRefreshing(false);
    }, [loadUnread]);

    return (
        <View style={s.root}>
            <StatusBar style="dark" />
            <LinearGradient colors={colors.gradientColors} style={StyleSheet.absoluteFill} />

            <SafeAreaView style={s.safe} edges={['top']}>
                {/* ── Top bar ── */}
                <Animated.View entering={FadeInDown.duration(350)} style={s.topBar}>
                    <View style={s.topLeft}>
                        <Text style={[s.appName, { color: colors.textAccent }]}>Tin Phát</Text>
                        <Text style={[s.appSub, { color: colors.textMuted }]}>Quản lý sản xuất</Text>
                    </View>

                    <View style={s.topActions}>
                        <Pressable
                            style={[s.topBtn, { backgroundColor: colors.inputBg }]}
                            onPress={() => router.push('/notifications')}
                        >
                            <Bell size={20} color={colors.textSecondary} strokeWidth={1.8} />
                            {unreadCount > 0 && (
                                <View style={s.badge}>
                                    <Text style={s.badgeText}>
                                        {unreadCount > 99 ? '99+' : String(unreadCount)}
                                    </Text>
                                </View>
                            )}
                        </Pressable>

                        <Pressable
                            style={[s.topBtn, { backgroundColor: colors.inputBg }]}
                            onPress={() => router.push('/settings')}
                        >
                            <Settings size={20} color={colors.textSecondary} strokeWidth={1.8} />
                        </Pressable>
                    </View>
                </Animated.View>

                {/* ── Scrollable content ── */}
                <ScrollView
                    contentContainerStyle={s.scroll}
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
                    <HeroCard name={displayName} role={roleLabel} />

                    {ACTION_GROUPS.map((group, i) => (
                        <ActionGroupCard
                            key={group.id}
                            group={group}
                            delay={120 + i * 80}
                            onPress={(route) => router.push(route as any)}
                        />
                    ))}

                    <View style={{ height: 120 }} />
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────

const s = StyleSheet.create({
    root: { flex: 1 },
    safe: { flex: 1 },

    // Top bar
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.xl,
        paddingTop: Spacing.sm,
        paddingBottom: Spacing.md,
    },
    topLeft: { flex: 1 },
    appName: {
        fontSize: FontSizes.xl,
        fontWeight: FontWeights.extrabold,
        letterSpacing: -0.3,
    },
    appSub: {
        fontSize: FontSizes.xs,
        marginTop: 1,
    },
    topActions: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    topBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    badge: {
        position: 'absolute',
        top: 4,
        right: 4,
        minWidth: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#EF4444',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 3,
        borderWidth: 1.5,
        borderColor: '#FFFFFF',
    },
    badgeText: {
        fontSize: 9,
        fontWeight: FontWeights.bold,
        color: '#FFFFFF',
    },

    // Scroll
    scroll: {
        paddingHorizontal: Spacing.xl,
        paddingTop: Spacing.sm,
        gap: Spacing.md,
    },

    // Hero card
    heroWrap: {
        borderRadius: BorderRadius.xxl,
        overflow: 'hidden',
        shadowColor: '#0156A7',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 8,
    },
    heroGradient: {
        padding: Spacing.xl,
        minHeight: 130,
        overflow: 'hidden',
    },
    orb1: {
        position: 'absolute',
        width: 160,
        height: 160,
        borderRadius: 80,
        backgroundColor: 'rgba(255,255,255,0.08)',
        top: -40,
        right: -30,
    },
    orb2: {
        position: 'absolute',
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(255,255,255,0.06)',
        bottom: -20,
        left: 60,
    },
    heroContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    heroLeft: { flex: 1, paddingRight: Spacing.md },
    heroGreeting: {
        fontSize: FontSizes.sm,
        color: 'rgba(255,255,255,0.75)',
        fontWeight: FontWeights.medium,
        marginBottom: 4,
    },
    heroName: {
        fontSize: FontSizes.xxl,
        fontWeight: FontWeights.extrabold,
        color: '#FFFFFF',
        marginBottom: 10,
    },
    roleBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(255,255,255,0.18)',
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: BorderRadius.full,
    },
    roleDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#34D399',
    },
    roleText: {
        fontSize: FontSizes.xs,
        color: '#FFFFFF',
        fontWeight: FontWeights.semibold,
    },
    heroAvatar: {
        width: 64,
        height: 64,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    heroAvatarText: {
        fontSize: FontSizes.xl,
        fontWeight: FontWeights.extrabold,
        color: '#FFFFFF',
    },

    // Group card
    groupCard: {
        borderRadius: BorderRadius.xl,
        overflow: 'hidden',
        borderWidth: 1,
    },
    groupInner: {
        padding: Spacing.lg,
    },
    // Header — no chevron, just icon + title
    groupHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        marginBottom: Spacing.md,
    },
    groupHeaderIcon: {
        width: 28,
        height: 28,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    groupTitle: {
        fontSize: FontSizes.base,
        fontWeight: FontWeights.bold,
    },
    groupDivider: {
        height: 1,
        marginBottom: Spacing.lg,
    },

    // Items grid — 3 columns, outline icon style
    itemsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    actionItem: {
        width: '33.33%',
        alignItems: 'center',
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.xs,
        gap: Spacing.sm,
        borderRadius: BorderRadius.md,
    },
    actionItemPressed: {
        opacity: 0.65,
        transform: [{ scale: 0.96 }],
    },
    // Soft tinted background, no gradient — outline icon sits on top
    actionIconWrap: {
        width: 54,
        height: 54,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionLabel: {
        fontSize: FontSizes.xs,
        fontWeight: FontWeights.medium,
        textAlign: 'center',
        lineHeight: 16,
    },
});
