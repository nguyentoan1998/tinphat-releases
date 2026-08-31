// Home Screen — Default screen after login
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    View, Text, StyleSheet, Pressable, ScrollView,
    RefreshControl, Animated as RNAnimated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import {
    Bell, Settings,
    // Lương group
    CalendarCheck, Boxes, Banknote, Tag,
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

import { Spacing, FontSizes, FontWeights, BorderRadius, Shadows } from '@/constants/Tokens';
import { ThemeColors } from '@/constants/ThemeColors';
import { useAuthStore, useNotificationStore } from '@/store';
import { getRoleLabel, isHomeMenuVisible, type UserRole } from '@/lib/role-permissions';
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
            {
                id: 'product-prices',
                label: 'Đơn giá sản phẩm',
                Icon: Tag,
                iconColor: '#8B5CF6',
                bgColor: 'rgba(139,92,246,0.12)',
                route: '/product-prices',
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
            <View style={s.heroGlass}>
                <View style={s.heroContent}>
                    <View style={s.heroLeft}>
                        <Text style={s.heroGreeting}>{getGreeting()},</Text>
                        <Text style={s.heroName} numberOfLines={1}>{name}</Text>
                        <View style={s.roleBadge}>
                            <View style={s.roleDot} />
                            <Text style={s.roleText}>{role}</Text>
                        </View>
                    </View>
                    <View style={s.heroAvatar}>
                        <Text style={s.heroAvatarText}>
                            {name.split(' ').map(w => w[0]).slice(-2).join('').toUpperCase()}
                        </Text>
                    </View>
                </View>
            </View>
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
            style={s.groupCard}
        >
            <View style={s.groupInner}>
                {/* Group header — no chevron */}
                <View style={s.groupHeader}>
                    <LinearGradient colors={group.headerGradient} style={s.groupHeaderIcon}>
                        <HeaderIcon size={14} color="#FFF" strokeWidth={2.5} />
                    </LinearGradient>
                    <Text style={s.groupTitle}>{group.title}</Text>
                </View>

                <View style={s.groupDivider} />

                {/* Action items grid — modern card style */}
                <View style={s.itemsGrid}>
                    {group.items.map((item, i) => {
                        const ItemIcon = item.Icon;
                        return (
                            <Animated.View
                                key={item.id}
                                entering={FadeInUp.duration(300).delay(i * 60).springify().damping(20)}
                                style={s.actionItemWrap}
                            >
                                <Pressable
                                    style={({ pressed }) => [
                                        s.actionItem,
                                        pressed && s.actionItemPressed,
                                    ]}
                                    onPress={() => onPress(item.route)}
                                >
                                    <View style={[s.actionIconWrap, { backgroundColor: item.bgColor, borderColor: item.iconColor + '30' }]}>
                                        {item.animated ? (
                                            <PulseIcon Icon={ItemIcon} color={item.iconColor} size={24} />
                                        ) : (
                                            <ItemIcon size={24} color={item.iconColor} strokeWidth={1.8} />
                                        )}
                                    </View>
                                    <Text style={s.actionLabel} numberOfLines={2}>
                                        {item.label}
                                    </Text>
                                </Pressable>
                            </Animated.View>
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
    const unreadCount = useNotificationStore((s) => s.unreadCount);
    const [refreshing, setRefreshing] = useState(false);
    const [fullName, setFullName] = useState<string>('');

    const role = user?.role as UserRole | undefined;
    const roleLabel = getRoleLabel(user?.role);

    const visibleGroups = useMemo(() =>
        ACTION_GROUPS
            .map((group) => ({
                ...group,
                items: group.items.filter((item) => isHomeMenuVisible(item.id, role)),
            }))
            .filter((group) => group.items.length > 0),
        [role],
    );

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

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        useNotificationStore.getState().fetchUnreadCount();
        setRefreshing(false);
    }, []);

    return (
        <View style={s.root}>
            <StatusBar style="dark" />
            <LinearGradient colors={['#F0F8FF', '#F9F9F9', '#FFFFFF']} style={StyleSheet.absoluteFill} />

            <SafeAreaView style={s.safe} edges={['top']}>
                {/* ── Top bar ── */}
                <Animated.View entering={FadeInDown.duration(350)} style={s.topBar}>
                    <View style={s.topLeft}>
                        <Text style={[s.appName, { color: '#212529' }]}>Tin Phát</Text>
                        <Text style={[s.appSub, { color: '#59677B' }]}>Quản lý sản xuất</Text>
                    </View>

                    <View style={s.topActions}>
                        <Pressable
                            style={s.topBtn}
                            onPress={() => router.push('/notifications')}
                        >
                            <Bell size={20} color="#212529" strokeWidth={1.8} />
                            {unreadCount > 0 && (
                                <View style={s.badge}>
                                    <Text style={s.badgeText}>
                                        {unreadCount > 99 ? '99+' : String(unreadCount)}
                                    </Text>
                                </View>
                            )}
                        </Pressable>

                        <Pressable
                            style={s.topBtn}
                            onPress={() => router.push('/settings')}
                        >
                            <Settings size={20} color="#212529" strokeWidth={1.8} />
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

                    {visibleGroups.map((group, i) => (
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
        paddingTop: Spacing.md,
        paddingBottom: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
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
        width: 38,
        height: 38,
        borderRadius: 19,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        backgroundColor: '#FFFFFF',
        ...Shadows.small,
    },
    badge: {
        position: 'absolute',
        top: 0,
        right: 0,
        minWidth: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#EF4444',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 3,
        borderWidth: 1.5,
        borderColor: '#FFFFFF',
        zIndex: 10,
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
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        ...Shadows.medium,
    },
    heroGlass: {
        padding: Spacing.xl,
        minHeight: 120,
        overflow: 'hidden',
    },
    heroContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    heroLeft: { flex: 1, paddingRight: Spacing.md },
    heroGreeting: {
        fontSize: FontSizes.sm,
        color: '#59677B',
        fontWeight: FontWeights.medium,
        marginBottom: 4,
    },
    heroName: {
        fontSize: FontSizes.xxl,
        fontWeight: FontWeights.extrabold,
        color: '#212529',
        marginBottom: 10,
    },
    roleBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#F0F8FF',
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: 'rgba(1,86,167,0.15)',
        ...Shadows.small,
    },
    roleDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#34D399',
    },
    roleText: {
        fontSize: FontSizes.xs,
        color: '#0156A7',
        fontWeight: FontWeights.semibold,
    },
    heroAvatar: {
        width: 64,
        height: 64,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        backgroundColor: '#F0F8FF',
        borderWidth: 1.5,
        borderColor: 'rgba(1,86,167,0.2)',
    },
    heroAvatarText: {
        fontSize: FontSizes.xl,
        fontWeight: FontWeights.extrabold,
        color: '#0156A7',
    },

    // Group card
    groupCard: {
        borderRadius: BorderRadius.xl,
        overflow: 'hidden',
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        ...Shadows.medium,
    },
    groupInner: {
        padding: Spacing.lg,
        paddingBottom: Spacing.sm,
    },
    // Header — icon + title
    groupHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        marginBottom: Spacing.md,
    },
    groupHeaderIcon: {
        width: 32,
        height: 32,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    groupTitle: {
        fontSize: FontSizes.base,
        fontWeight: FontWeights.bold,
        color: '#212529',
    },
    groupDivider: {
        height: 1,
        marginBottom: Spacing.md,
        backgroundColor: '#E5E7EB',
    },

    // Items grid — 3 columns, modern card style
    itemsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 0,
    },
    actionItemWrap: {
        width: '33.33%',
        paddingHorizontal: 4,
        paddingVertical: 4,
    },
    actionItem: {
        alignItems: 'center',
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.xs,
        gap: Spacing.sm,
        borderRadius: BorderRadius.lg,
        backgroundColor: '#FFFFFF',
        ...Shadows.small,
    },
    actionItemPressed: {
        opacity: 0.8,
        transform: [{ scale: 0.95 }],
    },
    // Tinted background with colored border
    actionIconWrap: {
        width: 52,
        height: 50,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        borderWidth: 1,
    },
    actionLabel: {
        fontSize: 11,
        fontWeight: FontWeights.semibold,
        textAlign: 'center',
        lineHeight: 15,
        color: '#374151',
    },
});
