// Settings Screen — Main
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    View, Text, StyleSheet, Pressable, ScrollView,
    Switch, Alert, Animated as RNAnimated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import {
    ChevronLeft, ChevronRight,
    UserPen, Lock, Bell, BellOff,
    Users, LogOut,
    ShieldCheck, Mail,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';

import { Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants/Tokens';
import { ThemeColors } from '@/constants/ThemeColors';
import { useAuthStore, useNotificationStore } from '@/store';
import { getRoleLabel, isHomeMenuVisible, type UserRole } from '@/lib/role-permissions';
import { employeeApi } from '@/lib/employee-api';
import { useDarkDialog } from '@/components/ui/DarkDialog';
import { getSocket } from '@/lib/socket';
import * as SecureStore from 'expo-secure-store';

const NOTIF_PREF_KEY = 'notif_enabled';

// ─── Row component ────────────────────────────────────────────

function SettingRow({
    Icon,
    iconColor,
    iconBg,
    label,
    sublabel,
    onPress,
    rightElement,
    danger,
    last,
}: {
    Icon: any;
    iconColor: string;
    iconBg: string;
    label: string;
    sublabel?: string;
    onPress?: () => void;
    rightElement?: React.ReactNode;
    danger?: boolean;
    last?: boolean;
}) {
    const colors = ThemeColors.light;
    return (
        <Pressable
            style={({ pressed }) => [
                s.row,
                !last && { borderBottomWidth: 1, borderBottomColor: colors.divider },
                pressed && onPress && { backgroundColor: 'rgba(0,0,0,0.03)' },
            ]}
            onPress={onPress}
            disabled={!onPress && !rightElement}
        >
            <View style={[s.rowIcon, { backgroundColor: iconBg }]}>
                <Icon size={18} color={iconColor} strokeWidth={1.8} />
            </View>
            <View style={s.rowContent}>
                <Text style={[s.rowLabel, danger && { color: '#EF4444' }, { color: danger ? '#EF4444' : colors.textPrimary }]}>
                    {label}
                </Text>
                {sublabel ? (
                    <Text style={[s.rowSublabel, { color: colors.textMuted }]}>{sublabel}</Text>
                ) : null}
            </View>
            {rightElement ?? (
                onPress ? <ChevronRight size={16} color={colors.textMuted} /> : null
            )}
        </Pressable>
    );
}

// ─── Section wrapper ──────────────────────────────────────────

function Section({ title, children, delay }: { title?: string; children: React.ReactNode; delay: number }) {
    const colors = ThemeColors.light;
    return (
        <Animated.View entering={FadeInUp.duration(400).delay(delay).springify().damping(18)}>
            {title ? (
                <Text style={[s.sectionTitle, { color: colors.textMuted }]}>{title}</Text>
            ) : null}
            <View style={[s.card, { borderColor: colors.cardBorder }]}>
                <BlurView intensity={18} tint="light" style={StyleSheet.absoluteFill} />
                <View style={[s.cardInner, { backgroundColor: colors.cardBg }]}>
                    {children}
                </View>
            </View>
        </Animated.View>
    );
}

// ─── Main Screen ──────────────────────────────────────────────

export default function SettingsScreen() {
    const router = useRouter();
    const { user, logout } = useAuthStore();
    const colors = ThemeColors.light;
    const { showDialog, DialogComponent } = useDarkDialog();

    const [fullName, setFullName] = useState('');
    const [notifEnabled, setNotifEnabled] = useState(true);
    const [loggingOut, setLoggingOut] = useState(false);

    const isAdmin = user?.role === 'ADMIN';
    const roleLabel = getRoleLabel(user?.role);
    const displayName = fullName || user?.name || user?.email?.split('@')[0] || 'Bạn';
    const initials = displayName.split(' ').map((w: string) => w[0]).slice(-2).join('').toUpperCase();

    // Load employee fullName
    useEffect(() => {
        if (!user) return;
        const empId = (user as any).employeeId || user.id;
        employeeApi.getEmployeeById(empId)
            .then(emp => { if (emp?.fullName) setFullName(emp.fullName); })
            .catch(() => { });
    }, [user]);

    // Load notification preference
    useEffect(() => {
        SecureStore.getItemAsync(NOTIF_PREF_KEY)
            .then(val => { if (val !== null) setNotifEnabled(val === 'true'); })
            .catch(() => { });
    }, []);

    const notifStore = useNotificationStore();

    const handleToggleNotif = useCallback(async (val: boolean) => {
        setNotifEnabled(val);
        try {
            await SecureStore.setItemAsync(NOTIF_PREF_KEY, String(val));
            if (!val) {
                notifStore.disableNotifications();
            } else {
                notifStore.enableNotifications();
            }
        } catch { }
    }, [notifStore]);

    const handleLogout = useCallback(() => {
        Alert.alert(
            'Đăng xuất',
            'Bạn có chắc muốn đăng xuất không?',
            [
                { text: 'Hủy', style: 'cancel' },
                {
                    text: 'Đăng xuất',
                    style: 'destructive',
                    onPress: async () => {
                        setLoggingOut(true);
                        try {
                            await logout();
                            router.replace('/login');
                        } catch {
                            setLoggingOut(false);
                        }
                    },
                },
            ]
        );
    }, [logout, router]);

    return (
        <View style={s.root}>
            <StatusBar style="dark" />
            <LinearGradient colors={colors.gradientColors} style={StyleSheet.absoluteFill} />

            <SafeAreaView style={s.safe} edges={['top']}>
                {/* ── Header ── */}
                <Animated.View entering={FadeInDown.duration(350)} style={s.header}>
                    <Pressable
                        style={[s.headerBtn, { backgroundColor: colors.inputBg }]}
                        onPress={() => router.canGoBack() ? router.back() : router.replace('/home')}
                    >
                        <ChevronLeft size={22} color={colors.textSecondary} />
                    </Pressable>
                    <Text style={[s.headerTitle, { color: colors.textPrimary }]}>Cài đặt</Text>
                    <View style={{ width: 38 }} />
                </Animated.View>

                <ScrollView
                    contentContainerStyle={s.scroll}
                    showsVerticalScrollIndicator={false}
                >
                    {/* ── User card ── */}
                    <Animated.View
                        entering={FadeInDown.duration(500).delay(60).springify().damping(16)}
                        style={s.userCardWrap}
                    >
                        <LinearGradient
                            colors={['#0156A7', '#0284C7', '#38BDF8']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={s.userCard}
                        >
                            {/* Decorative orbs */}
                            <View style={s.orb1} />
                            <View style={s.orb2} />

                            <View style={s.userCardRow}>
                                {/* Avatar */}
                                <LinearGradient
                                    colors={['rgba(255,255,255,0.35)', 'rgba(255,255,255,0.15)']}
                                    style={s.avatar}
                                >
                                    <Text style={s.avatarText}>{initials}</Text>
                                </LinearGradient>

                                {/* Info */}
                                <View style={s.userInfo}>
                                    <Text style={s.userName} numberOfLines={1}>{displayName}</Text>
                                    <View style={s.userMeta}>
                                        <Mail size={11} color="rgba(255,255,255,0.7)" />
                                        <Text style={s.userEmail} numberOfLines={1}>{user?.email}</Text>
                                    </View>
                                    <View style={s.roleBadge}>
                                        <ShieldCheck size={11} color="#34D399" />
                                        <Text style={s.roleText}>{roleLabel}</Text>
                                    </View>
                                </View>
                            </View>
                        </LinearGradient>
                    </Animated.View>

                    {/* ── Tài khoản ── */}
                    <Section title="Tài khoản" delay={120}>
                        <SettingRow
                            Icon={UserPen}
                            iconColor="#6366F1"
                            iconBg="rgba(99,102,241,0.12)"
                            label="Cập nhật thông tin"
                            sublabel="Chỉnh sửa hồ sơ nhân viên"
                            onPress={() => router.push('/settings/profile')}
                        />
                        <SettingRow
                            Icon={Lock}
                            iconColor="#0EA5E9"
                            iconBg="rgba(14,165,233,0.12)"
                            label="Đổi mật khẩu"
                            sublabel="Bảo mật tài khoản"
                            onPress={() => router.push('/settings/change-password')}
                            last
                        />
                    </Section>

                    {/* ── Thông báo ── */}
                    <Section title="Thông báo" delay={200}>
                        <SettingRow
                            Icon={notifEnabled ? Bell : BellOff}
                            iconColor={notifEnabled ? '#F59E0B' : '#9CA3AF'}
                            iconBg={notifEnabled ? 'rgba(245,158,11,0.12)' : 'rgba(156,163,175,0.12)'}
                            label="Bật thông báo"
                            sublabel={notifEnabled ? 'Đang bật' : 'Đang tắt'}
                            last
                            rightElement={
                                <Switch
                                    value={notifEnabled}
                                    onValueChange={handleToggleNotif}
                                    trackColor={{
                                        false: 'rgba(156,163,175,0.3)',
                                        true: 'rgba(245,158,11,0.4)',
                                    }}
                                    thumbColor={notifEnabled ? '#F59E0B' : '#9CA3AF'}
                                    ios_backgroundColor="rgba(156,163,175,0.3)"
                                />
                            }
                        />
                    </Section>

                    {/* ── Quản trị (Admin only) ── */}
                    {isAdmin && (
                        <Section title="Quản trị" delay={280}>
                            <SettingRow
                                Icon={Users}
                                iconColor="#EF4444"
                                iconBg="rgba(239,68,68,0.12)"
                                label="Quản lý người dùng"
                                sublabel="Thêm, sửa, xóa tài khoản"
                                onPress={() => router.push('/users')}
                                last
                            />
                        </Section>
                    )}

                    {/* ── Đăng xuất ── */}
                    <Section delay={isAdmin ? 360 : 280}>
                        <SettingRow
                            Icon={LogOut}
                            iconColor="#EF4444"
                            iconBg="rgba(239,68,68,0.1)"
                            label={loggingOut ? 'Đang đăng xuất...' : 'Đăng xuất'}
                            onPress={loggingOut ? undefined : handleLogout}
                            danger
                            last
                        />
                    </Section>

                    {/* App version */}
                    <Animated.View
                        entering={FadeInUp.duration(300).delay(400)}
                        style={s.versionWrap}
                    >
                        <Text style={[s.versionText, { color: colors.textMuted }]}>
                            Tin Phát App · v1.0.0
                        </Text>
                    </Animated.View>

                    <View style={{ height: 120 }} />
                </ScrollView>
            </SafeAreaView>

            {DialogComponent}
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────

const s = StyleSheet.create({
    root: { flex: 1 },
    safe: { flex: 1 },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.xl,
        paddingTop: Spacing.sm,
        paddingBottom: Spacing.md,
    },
    headerBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: FontSizes.lg,
        fontWeight: FontWeights.bold,
    },

    // Scroll
    scroll: {
        paddingHorizontal: Spacing.xl,
        paddingTop: Spacing.xs,
        gap: Spacing.sm,
    },

    // User card
    userCardWrap: {
        borderRadius: BorderRadius.xxl,
        overflow: 'hidden',
        shadowColor: '#0156A7',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.22,
        shadowRadius: 14,
        elevation: 7,
        marginBottom: Spacing.xs,
    },
    userCard: {
        padding: Spacing.xl,
        overflow: 'hidden',
    },
    orb1: {
        position: 'absolute',
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: 'rgba(255,255,255,0.07)',
        top: -30,
        right: -20,
    },
    orb2: {
        position: 'absolute',
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255,255,255,0.05)',
        bottom: -15,
        left: 50,
    },
    userCardRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.lg,
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.3)',
        flexShrink: 0,
    },
    avatarText: {
        fontSize: FontSizes.xl,
        fontWeight: FontWeights.extrabold,
        color: '#FFFFFF',
    },
    userInfo: { flex: 1, gap: 4 },
    userName: {
        fontSize: FontSizes.lg,
        fontWeight: FontWeights.extrabold,
        color: '#FFFFFF',
    },
    userMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    userEmail: {
        fontSize: FontSizes.xs,
        color: 'rgba(255,255,255,0.75)',
        flex: 1,
    },
    roleBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: BorderRadius.full,
        marginTop: 2,
    },
    roleText: {
        fontSize: FontSizes.xs,
        color: '#FFFFFF',
        fontWeight: FontWeights.semibold,
    },

    // Section
    sectionTitle: {
        fontSize: FontSizes.xs,
        fontWeight: FontWeights.semibold,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: Spacing.sm,
        marginLeft: 4,
        marginTop: Spacing.xs,
    },
    card: {
        borderRadius: BorderRadius.xl,
        overflow: 'hidden',
        borderWidth: 1,
    },
    cardInner: {
        borderRadius: BorderRadius.xl,
    },

    // Row
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        paddingVertical: 14,
        gap: Spacing.md,
        minHeight: 56,
    },
    rowIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        flexShrink: 0,
    },
    rowContent: { flex: 1 },
    rowLabel: {
        fontSize: FontSizes.sm,
        fontWeight: FontWeights.medium,
    },
    rowSublabel: {
        fontSize: FontSizes.xs,
        marginTop: 2,
    },

    // Version
    versionWrap: {
        alignItems: 'center',
        paddingVertical: Spacing.md,
    },
    versionText: {
        fontSize: FontSizes.xs,
    },
});
