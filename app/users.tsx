// Users Management Screen — Admin Only
import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, Pressable, ScrollView,
    RefreshControl, ActivityIndicator, Modal, TextInput,
    Alert, Switch, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import {
    ChevronLeft, Plus, Search, User, Mail, Shield,
    CheckCircle2, XCircle, Edit2, Eye, Trash2, Lock,
    ChevronRight, UserCheck, UserX, RefreshCcw,
} from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';

import { userApi, AppUser, UserRole, CreateUserDto, UpdateUserDto } from '@/lib/user-api';
import { useAuthStore, useThemeStore } from '@/store';
import { ThemeColors } from '@/constants/ThemeColors';
import { Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants/Tokens';
import { Springs, Timings } from '@/constants/GlassTokens';

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<UserRole, string> = {
    ADMIN: 'Quản trị viên',
    MANAGER: 'Quản lý',
    USER: 'Nhân viên',
};

const ROLE_COLORS: Record<UserRole, string> = {
    ADMIN: '#EF4444',
    MANAGER: '#F59E0B',
    USER: '#6366F1',
};

// ─── Role Badge ────────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: UserRole }) {
    return (
        <View style={[s.roleBadge, { backgroundColor: `${ROLE_COLORS[role]}20` }]}>
            <Text style={[s.roleText, { color: ROLE_COLORS[role] }]}>
                {ROLE_LABELS[role]}
            </Text>
        </View>
    );
}

// ─── User Card ─────────────────────────────────────────────────────────────────

function UserCard({
    user,
    colors,
    onView,
    onEdit,
    onToggle,
    onDelete,
    currentUserId,
}: {
    user: AppUser;
    colors: ReturnType<typeof ThemeColors['dark']['iconBg']> extends Function ? typeof ThemeColors.dark : typeof ThemeColors.light;
    onView: () => void;
    onEdit: () => void;
    onToggle: () => void;
    onDelete: () => void;
    currentUserId?: string;
}) {
    const isSelf = user.id === currentUserId;
    const initials = (user.name || user.email).slice(0, 2).toUpperCase();

    return (
        <Animated.View entering={FadeInUp.duration(350).springify().damping(20)}>
            <Pressable onPress={onView}>
                <View style={[s.card, {
                    borderColor: user.isActive ? colors.cardBorder : 'rgba(239,68,68,0.2)',
                    backgroundColor: colors.cardBg,
                }]}>
                    {/* Avatar + Info */}
                    <View style={s.cardRow}>
                        <LinearGradient
                            colors={user.isActive
                                ? [ROLE_COLORS[user.role] + 'CC', ROLE_COLORS[user.role]]
                                : ['#6B7280', '#4B5563']}
                            style={s.avatar}
                        >
                            <Text style={[s.avatarText, { color: colors.textPrimary }]}>{initials}</Text>
                        </LinearGradient>

                        <View style={s.cardInfo}>
                            <View style={s.nameRow}>
                                <Text style={[s.userName, { color: colors.textPrimary }]} numberOfLines={1}>
                                    {user.name || 'Chưa đặt tên'}
                                    {isSelf && <Text style={s.selfBadge}> (Bạn)</Text>}
                                </Text>
                                <View style={s.statusDot}>
                                    {user.isActive
                                        ? <CheckCircle2 size={14} color="#22C55E" />
                                        : <XCircle size={14} color="#EF4444" />
                                    }
                                </View>
                            </View>
                            <Text style={[s.userEmail, { color: colors.textMuted }]} numberOfLines={1}>
                                {user.email}
                            </Text>
                            <View style={s.badgeRow}>
                                <RoleBadge role={user.role} />
                                {!user.isActive && (
                                    <View style={s.lockedBadge}>
                                        <Text style={s.lockedText}>Bị khóa</Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    </View>

                    {/* Action Buttons */}
                    <View style={[s.cardActions, { borderTopColor: colors.divider }]}>
                        <Pressable style={s.actionBtn} onPress={onView}>
                            <Eye size={15} color={colors.textAccent} />
                            <Text style={[s.actionText, { color: colors.textAccent }]}>Xem</Text>
                        </Pressable>
                        <View style={[s.actionDivider, { backgroundColor: colors.divider }]} />
                        <Pressable style={s.actionBtn} onPress={onEdit}>
                            <Edit2 size={15} color="#F59E0B" />
                            <Text style={[s.actionText, { color: '#F59E0B' }]}>Sửa</Text>
                        </Pressable>
                        <View style={[s.actionDivider, { backgroundColor: colors.divider }]} />
                        <Pressable style={s.actionBtn} onPress={onToggle} disabled={isSelf}>
                            {user.isActive
                                ? <UserX size={15} color={isSelf ? colors.textMuted : '#EF4444'} />
                                : <UserCheck size={15} color="#22C55E" />
                            }
                            <Text style={[s.actionText, { color: isSelf ? colors.textMuted : (user.isActive ? '#EF4444' : '#22C55E') }]}>
                                {user.isActive ? 'Khóa' : 'Mở'}
                            </Text>
                        </Pressable>
                        <View style={[s.actionDivider, { backgroundColor: colors.divider }]} />
                        <Pressable style={s.actionBtn} onPress={onDelete} disabled={isSelf}>
                            <Trash2 size={15} color={isSelf ? colors.textMuted : '#EF4444'} />
                            <Text style={[s.actionText, { color: isSelf ? colors.textMuted : '#EF4444' }]}>Xóa</Text>
                        </Pressable>
                    </View>
                </View>
            </Pressable>
        </Animated.View>
    );
}

// ─── Role Picker ──────────────────────────────────────────────────────────────

function RolePicker({ value, onChange, colors }: {
    value: UserRole;
    onChange: (r: UserRole) => void;
    colors: typeof ThemeColors.dark;
}) {
    const roles: UserRole[] = ['ADMIN', 'MANAGER', 'USER'];
    return (
        <View style={s.rolePicker}>
            {roles.map(r => (
                <Pressable
                    key={r}
                    style={[s.roleOption, value === r && { backgroundColor: `${ROLE_COLORS[r]}25`, borderColor: ROLE_COLORS[r] }]}
                    onPress={() => onChange(r)}
                >
                    <Text style={[s.roleOptionText, { color: value === r ? ROLE_COLORS[r] : colors.textMuted }]}>
                        {ROLE_LABELS[r]}
                    </Text>
                </Pressable>
            ))}
        </View>
    );
}

// ─── View Modal ───────────────────────────────────────────────────────────────

function ViewModal({ user, visible, onClose, onEdit, colors, isDark }: {
    user: AppUser | null;
    visible: boolean;
    onClose: () => void;
    onEdit: () => void;
    colors: typeof ThemeColors.dark;
    isDark: boolean;
}) {
    if (!user) return null;

    const rows = [
        { label: 'Email', value: user.email, Icon: Mail },
        { label: 'Tên', value: user.name || '—', Icon: User },
        { label: 'Vai trò', value: ROLE_LABELS[user.role], Icon: Shield },
        { label: 'Trạng thái', value: user.isActive ? 'Hoạt động' : 'Bị khóa', Icon: user.isActive ? CheckCircle2 : XCircle },
        { label: 'Ngày tạo', value: new Date(user.createdAt).toLocaleDateString('vi-VN'), Icon: ChevronRight },
    ];

    const modalBg = isDark
        ? 'rgba(15,15,30,0.98)'
        : 'rgba(245,247,255,0.98)';

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <View style={s.overlay}>
                    <BlurView intensity={40} tint={colors.blurTint} style={StyleSheet.absoluteFill} />
                    <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
                    <Animated.View
                        entering={FadeInDown.duration(350).springify()}
                        style={[s.modalSheet, { backgroundColor: modalBg, borderColor: colors.cardBorder }]}
                    >
                        <View style={s.modalHandle} />
                        <Text style={[s.modalTitle, { color: colors.textPrimary }]}>Chi tiết tài khoản</Text>

                        {/* Avatar */}
                        <View style={s.viewAvatarWrap}>
                            <LinearGradient colors={[ROLE_COLORS[user.role] + 'CC', ROLE_COLORS[user.role]]} style={s.viewAvatar}>
                                <Text style={[s.viewAvatarText, { color: colors.textPrimary }]}>
                                    {(user.name || user.email).slice(0, 2).toUpperCase()}
                                </Text>
                            </LinearGradient>
                            <RoleBadge role={user.role} />
                        </View>

                        {/* Info Rows */}
                        {rows.map(row => (
                            <View key={row.label} style={[s.infoRow, { borderBottomColor: colors.divider }]}>
                                <row.Icon size={16} color={colors.textMuted} />
                                <Text style={[s.infoLabel, { color: colors.textMuted }]}>{row.label}</Text>
                                <Text style={[s.infoValue, { color: colors.textPrimary }]}>{row.value}</Text>
                            </View>
                        ))}

                        <View style={s.modalBtns}>
                            <Pressable style={[s.modalBtn, s.cancelBtn, { borderColor: colors.cardBorder }]} onPress={onClose}>
                                <Text style={[s.btnText, { color: colors.textSecondary }]}>Đóng</Text>
                            </Pressable>
                            <Pressable style={[s.modalBtn, s.primaryBtn]} onPress={onEdit}>
                                <Edit2 size={16} color={colors.textPrimary} />
                                <Text style={[s.btnText, { color: colors.textPrimary }]}>Chỉnh sửa</Text>
                            </Pressable>
                        </View>
                    </Animated.View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

// ─── Add / Edit Modal ─────────────────────────────────────────────────────────

function EditModal({ user, visible, onClose, onSave, colors, isDark }: {
    user: AppUser | null; // null = add mode
    visible: boolean;
    onClose: () => void;
    onSave: (data: CreateUserDto | UpdateUserDto) => Promise<void>;
    colors: typeof ThemeColors.dark;
    isDark: boolean;
}) {
    const isEdit = !!user;
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<UserRole>('USER');
    const [isActive, setIsActive] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (visible) {
            setName(user?.name || '');
            setEmail(user?.email || '');
            setPassword('');
            setRole(user?.role || 'USER');
            setIsActive(user?.isActive !== false);
        }
    }, [visible, user]);

    const handleSave = async () => {
        if (!isEdit && (!email || !password)) {
            Alert.alert('Lỗi', 'Vui lòng nhập email và mật khẩu');
            return;
        }
        setSaving(true);
        try {
            if (isEdit) {
                const dto: UpdateUserDto = { name, role, isActive };
                if (email && email !== user?.email) dto.email = email;
                await onSave(dto);
            } else {
                await onSave({ email, password, name, role, isActive });
            }
            onClose();
        } catch (e: any) {
            Alert.alert('Lỗi', e?.response?.data?.message || 'Không thể lưu');
        } finally {
            setSaving(false);
        }
    };

    const inputStyle = [s.input, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder, color: colors.textPrimary }];

    const modalBg = '#F8FAFC';

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <View style={s.overlay}>
                    <BlurView intensity={40} tint={colors.blurTint} style={StyleSheet.absoluteFill} />
                    <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
                    <Animated.View entering={FadeInDown.duration(350).springify()} style={[s.modalSheet, s.modalSheetTall, { backgroundColor: modalBg, borderColor: colors.cardBorder }]}>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View style={s.modalHandle} />
                            <Text style={[s.modalTitle, { color: colors.textPrimary }]}>
                                {isEdit ? 'Chỉnh sửa tài khoản' : 'Tạo tài khoản mới'}
                            </Text>

                            {/* Name */}
                            <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>Tên hiển thị</Text>
                            <TextInput
                                style={inputStyle}
                                value={name}
                                onChangeText={setName}
                                placeholder="Nguyễn Văn A"
                                placeholderTextColor={colors.textMuted}
                            />

                            {/* Email */}
                            <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>Email *</Text>
                            <TextInput
                                style={inputStyle}
                                value={email}
                                onChangeText={setEmail}
                                placeholder="user@company.com"
                                placeholderTextColor={colors.textMuted}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />

                            {/* Password (add only) */}
                            {!isEdit && (
                                <>
                                    <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>Mật khẩu *</Text>
                                    <TextInput
                                        style={inputStyle}
                                        value={password}
                                        onChangeText={setPassword}
                                        placeholder="Tối thiểu 8 ký tự"
                                        placeholderTextColor={colors.textMuted}
                                        secureTextEntry
                                    />
                                </>
                            )}

                            {/* Role */}
                            <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>Vai trò</Text>
                            <RolePicker value={role} onChange={setRole} colors={colors} />

                            {/* Active toggle (edit only) */}
                            {isEdit && (
                                <View style={s.toggleRow}>
                                    <Text style={[s.fieldLabel, { color: colors.textSecondary, marginBottom: 0, flex: 1 }]}>
                                        Kích hoạt tài khoản
                                    </Text>
                                    <Switch
                                        value={isActive}
                                        onValueChange={setIsActive}
                                        trackColor={{ false: 'rgba(239,68,68,0.3)', true: 'rgba(34,197,94,0.4)' }}
                                        thumbColor={isActive ? '#22C55E' : '#EF4444'}
                                    />
                                </View>
                            )}

                            <View style={[s.modalBtns, { marginTop: Spacing.lg }]}>
                                <Pressable style={[s.modalBtn, s.cancelBtn, { borderColor: colors.cardBorder }]} onPress={onClose}>
                                    <Text style={[s.btnText, { color: colors.textSecondary }]}>Hủy</Text>
                                </Pressable>
                                <Pressable style={[s.modalBtn, s.primaryBtn]} onPress={handleSave} disabled={saving}>
                                    {saving
                                        ? <ActivityIndicator size="small" color={colors.textPrimary} />
                                        : <Text style={[s.btnText, { color: colors.textPrimary }]}>{isEdit ? 'Lưu' : 'Tạo mới'}</Text>
                                    }
                                </Pressable>
                            </View>
                        </ScrollView>
                    </Animated.View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function UsersScreen() {
    const router = useRouter();
    const { user: currentUser } = useAuthStore();
    const { isDark } = useThemeStore();
    const colors = ThemeColors.light;

    const [users, setUsers] = useState<AppUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');

    // Modal state
    const [viewUser, setViewUser] = useState<AppUser | null>(null);
    const [editUser, setEditUser] = useState<AppUser | null | undefined>(undefined); // undefined = closed, null = add, AppUser = edit

    // Redirect non-admins
    useEffect(() => {
        if (currentUser && currentUser.role !== 'ADMIN') {
            router.replace('/(tabs)');
        }
    }, [currentUser]);

    const load = useCallback(async () => {
        try {
            const data = await userApi.getAll();
            setUsers(data);
        } catch { }
    }, []);

    useEffect(() => {
        load().finally(() => setLoading(false));
    }, [load]);

    const onRefresh = async () => {
        setRefreshing(true);
        await load();
        setRefreshing(false);
    };

    const filtered = (Array.isArray(users) ? users : []).filter(u =>
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        (u.name || '').toLowerCase().includes(search.toLowerCase())
    );

    const handleToggle = (user: AppUser) => {
        const action = user.isActive ? 'khóa' : 'mở khóa';
        Alert.alert(
            `${user.isActive ? 'Khóa' : 'Mở khóa'} tài khoản`,
            `Bạn có chắc muốn ${action} tài khoản "${user.name || user.email}"?`,
            [
                { text: 'Hủy', style: 'cancel' },
                {
                    text: user.isActive ? 'Khóa' : 'Mở khóa',
                    style: user.isActive ? 'destructive' : 'default',
                    onPress: async () => {
                        try {
                            const updated = await userApi.toggleStatus(user.id);
                            setUsers(prev => prev.map(u => u.id === user.id ? updated : u));
                        } catch {
                            Alert.alert('Lỗi', 'Không thể thay đổi trạng thái');
                        }
                    },
                },
            ]
        );
    };

    const handleDelete = (user: AppUser) => {
        Alert.alert(
            'Xóa tài khoản',
            `Bạn có chắc muốn xóa "${user.name || user.email}"? Hành động này không thể hoàn tác.`,
            [
                { text: 'Hủy', style: 'cancel' },
                {
                    text: 'Xóa',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await userApi.delete(user.id);
                            setUsers(prev => prev.filter(u => u.id !== user.id));
                        } catch {
                            Alert.alert('Lỗi', 'Không thể xóa tài khoản');
                        }
                    },
                },
            ]
        );
    };

    const handleSave = async (data: CreateUserDto | UpdateUserDto) => {
        if (editUser === null) {
            // Create
            const created = await userApi.create(data as CreateUserDto);
            setUsers(prev => [created, ...prev]);
        } else if (editUser) {
            // Update
            const updated = await userApi.update(editUser.id, data as UpdateUserDto);
            setUsers(prev => prev.map(u => u.id === editUser.id ? updated : u));
        }
    };

    const stats = {
        total: users.length,
        active: users.filter(u => u.isActive).length,
        admins: users.filter(u => u.role === 'ADMIN').length,
    };

    return (
        <View style={[s.root, { backgroundColor: colors.screenBg }]}>
            <StatusBar style={colors.statusBar} />
            <LinearGradient colors={colors.gradientColors} style={StyleSheet.absoluteFill} />
            <View style={[s.orb, { backgroundColor: colors.orbColor }]} />

            <SafeAreaView style={s.safe} edges={['top']}>
                {/* Header */}
                <Animated.View entering={FadeInDown.duration(400)} style={s.header}>
                    <Pressable style={[s.backBtn, { backgroundColor: colors.inputBg }]} onPress={() => router.back()}>
                        <ChevronLeft size={22} color={colors.textSecondary} />
                    </Pressable>
                    <Text style={[s.headerTitle, { color: colors.textPrimary }]}>Quản lý tài khoản</Text>
                </Animated.View>

                {/* Stats Row */}
                <Animated.View entering={FadeInDown.duration(400).delay(80)} style={s.statsRow}>
                    {[
                        { label: 'Tổng', value: stats.total, color: colors.textAccent },
                        { label: 'Hoạt động', value: stats.active, color: '#22C55E' },
                        { label: 'Admin', value: stats.admins, color: '#EF4444' },
                    ].map(stat => (
                        <View key={stat.label} style={[s.statChip, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
                            <Text style={[s.statValue, { color: stat.color }]}>{stat.value}</Text>
                            <Text style={[s.statLabel, { color: colors.textMuted }]}>{stat.label}</Text>
                        </View>
                    ))}
                </Animated.View>

                {/* Search */}
                <Animated.View entering={FadeInDown.duration(400).delay(120)} style={[s.searchBar, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder }]}>
                    <Search size={16} color={colors.textMuted} />
                    <TextInput
                        style={[s.searchInput, { color: colors.textPrimary }]}
                        placeholder="Tìm theo tên hoặc email..."
                        placeholderTextColor={colors.textMuted}
                        value={search}
                        onChangeText={setSearch}
                    />
                    {search.length > 0 && (
                        <Pressable onPress={() => setSearch('')}>
                            <XCircle size={16} color={colors.textMuted} />
                        </Pressable>
                    )}
                </Animated.View>

                {/* List */}
                {loading ? (
                    <View style={s.loaderWrap}>
                        <ActivityIndicator size="large" color="#6366F1" />
                    </View>
                ) : (
                    <ScrollView
                        contentContainerStyle={s.list}
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366F1" />
                        }
                    >
                        {filtered.length === 0 ? (
                            <View style={s.emptyWrap}>
                                <User size={40} color={colors.textMuted} />
                                <Text style={[s.emptyText, { color: colors.textMuted }]}>
                                    {search ? 'Không tìm thấy user' : 'Chưa có tài khoản nào'}
                                </Text>
                            </View>
                        ) : (
                            filtered.map(u => (
                                <UserCard
                                    key={u.id}
                                    user={u}
                                    colors={colors as any}
                                    currentUserId={currentUser?.id}
                                    onView={() => setViewUser(u)}
                                    onEdit={() => setEditUser(u)}
                                    onToggle={() => handleToggle(u)}
                                    onDelete={() => handleDelete(u)}
                                />
                            ))
                        )}
                        <View style={{ height: 100 }} />
                    </ScrollView>
                )}
            </SafeAreaView>

            {/* View Modal */}
            <ViewModal
                user={viewUser}
                visible={!!viewUser}
                onClose={() => setViewUser(null)}
                onEdit={() => { setEditUser(viewUser); setViewUser(null); }}
                colors={colors}
                isDark={isDark}
            />

            {/* Add / Edit Modal */}
            <EditModal
                user={editUser === undefined ? null : editUser}
                visible={editUser !== undefined}
                onClose={() => setEditUser(undefined)}
                onSave={handleSave}
                colors={colors}
                isDark={isDark}
            />

            {/* FAB */}
            <Pressable style={s.fab} onPress={() => setEditUser(null)}>
                <Plus size={26} color={colors.textPrimary} />
            </Pressable>
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
    root: { flex: 1 },
    safe: { flex: 1 },
    orb: { position: 'absolute', width: 220, height: 220, borderRadius: 110, top: 60, right: -80 },

    // Header
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, paddingBottom: Spacing.sm, gap: 12 },
    backBtn: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { flex: 1, fontSize: FontSizes.lg, fontWeight: FontWeights.bold },
    fab: { position: 'absolute', bottom: 28, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: '#6366F1', justifyContent: 'center', alignItems: 'center', shadowColor: '#6366F1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.45, shadowRadius: 12, elevation: 8 },

    // Stats
    statsRow: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.xl, marginBottom: Spacing.lg },
    statChip: { flex: 1, borderRadius: BorderRadius.lg, borderWidth: 1, padding: Spacing.md, alignItems: 'center' },
    statValue: { fontSize: FontSizes.xl, fontWeight: FontWeights.bold },
    statLabel: { fontSize: FontSizes.xs, marginTop: 2 },

    // Search
    searchBar: { flexDirection: 'row', alignItems: 'center', marginHorizontal: Spacing.xl, marginBottom: Spacing.lg, paddingHorizontal: Spacing.md, paddingVertical: 10, borderRadius: BorderRadius.lg, borderWidth: 1, gap: 8 },
    searchInput: { flex: 1, fontSize: FontSizes.sm },

    // List
    list: { paddingHorizontal: Spacing.xl, gap: Spacing.md },
    loaderWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyWrap: { alignItems: 'center', paddingTop: 80, gap: 12 },
    emptyText: { fontSize: FontSizes.base },

    // User Card
    card: { borderRadius: BorderRadius.xl, borderWidth: 1, overflow: 'hidden' },
    cardRow: { flexDirection: 'row', alignItems: 'center', padding: Spacing.lg, gap: Spacing.md },
    avatar: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
    avatarText: { fontSize: 18, fontWeight: '800' },
    cardInfo: { flex: 1 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    userName: { flex: 1, fontSize: FontSizes.base, fontWeight: FontWeights.semibold },
    selfBadge: { fontSize: FontSizes.xs, fontWeight: FontWeights.medium, color: '#6366F1' },
    statusDot: { flexShrink: 0 },
    userEmail: { fontSize: FontSizes.xs, marginTop: 2 },
    badgeRow: { flexDirection: 'row', gap: 6, marginTop: 6 },
    roleBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
    roleText: { fontSize: FontSizes.xs, fontWeight: FontWeights.semibold },
    lockedBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: 'rgba(239,68,68,0.1)' },
    lockedText: { fontSize: FontSizes.xs, fontWeight: FontWeights.semibold, color: '#EF4444' },

    // Card actions
    cardActions: { flexDirection: 'row', borderTopWidth: 1 },
    actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, gap: 4 },
    actionText: { fontSize: FontSizes.xs, fontWeight: FontWeights.medium },
    actionDivider: { width: 1, marginVertical: 8 },

    // Role picker
    rolePicker: { flexDirection: 'row', gap: 8, marginBottom: Spacing.lg },
    roleOption: { flex: 1, paddingVertical: 8, paddingHorizontal: 4, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: 'transparent', alignItems: 'center' },
    roleOptionText: { fontSize: FontSizes.xs, fontWeight: FontWeights.semibold },

    // Modal
    overlay: { flex: 1, justifyContent: 'flex-end' },
    modalOverlay: { flex: 1 },
    modalSheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, paddingHorizontal: Spacing.xl, paddingBottom: 40 },
    modalSheetTall: { maxHeight: '90%' },
    modalHandle: { width: 40, height: 4, backgroundColor: 'rgba(128,128,128,0.3)', borderRadius: 2, alignSelf: 'center', marginVertical: 12 },
    modalTitle: { fontSize: FontSizes.xl, fontWeight: FontWeights.bold, marginBottom: Spacing.xl, textAlign: 'center' },

    viewAvatarWrap: { alignItems: 'center', marginBottom: Spacing.xl, gap: Spacing.sm },
    viewAvatar: { width: 72, height: 72, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
    viewAvatarText: { fontSize: 28, fontWeight: '800' },

    infoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md, borderBottomWidth: 1 },
    infoLabel: { flex: 1, fontSize: FontSizes.sm },
    infoValue: { fontSize: FontSizes.sm, fontWeight: FontWeights.medium, flex: 2, textAlign: 'right' },

    // Form
    fieldLabel: { fontSize: FontSizes.sm, fontWeight: FontWeights.medium, marginBottom: 8, marginTop: Spacing.md },
    input: { borderWidth: 1, borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.md, paddingVertical: Platform.OS === 'ios' ? 14 : 10, fontSize: FontSizes.base, marginBottom: 4 },
    toggleRow: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.lg },

    modalBtns: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.md },
    modalBtn: { flex: 1, paddingVertical: 14, borderRadius: BorderRadius.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
    cancelBtn: { borderWidth: 1 },
    primaryBtn: { backgroundColor: '#6366F1' },
    btnText: { fontSize: FontSizes.base, fontWeight: FontWeights.semibold },
});
