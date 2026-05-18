import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, Pressable, ScrollView,
    Image, ActivityIndicator, Modal, TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import {
    ChevronLeft, User, Phone, MapPin, CreditCard,
    Briefcase, Users, CalendarDays, ShieldCheck, Hash, Pencil, X, Check, Heart,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';

import { employeeApi, Employee, UpdateEmployeeDto, Gender } from '@/lib/employee-api';
import { useAuthStore } from '@/store';
import { ThemeColors } from '@/constants/ThemeColors';
import { useDarkDialog } from '@/components/ui/DarkDialog';
import { Spacing, FontSizes, FontWeights } from '@/constants/Tokens';

const fmtDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-';

const fromISO = (iso: string | null) => {
    if (!iso) return '';
    const d = new Date(iso);
    return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
};

const toISO = (fmt: string) => {
    if (!fmt || fmt.length < 10) return undefined;
    const [d, m, y] = fmt.split('-').map(Number);
    return new Date(y, m - 1, d).toISOString();
};

const formatDateInput = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    let res = cleaned;
    if (cleaned.length > 2) res = cleaned.slice(0, 2) + '-' + cleaned.slice(2);
    if (cleaned.length > 4) res = res.slice(0, 5) + '-' + res.slice(5, 9);
    return res;
};

function InfoRow({ Icon, label, value, color = '#818CF8' }: { Icon: any; label: string; value: string; color?: string }) {
    const colors = ThemeColors.light;
    return (
        <View style={s.infoRow}>
            <View style={[s.infoIcon, { backgroundColor: color + '20' }]}>
                <Icon size={16} color={color} />
            </View>
            <View style={s.infoText}>
                <Text style={[s.infoLabel, { color: colors.textMuted }]}>{label}</Text>
                <Text style={[s.infoValue, { color: colors.textPrimary }]}>{value}</Text>
            </View>
        </View>
    );
}

function Card({ title, delay, children }: { title: string; delay: number; children: React.ReactNode }) {
    const colors = ThemeColors.light;
    return (
        <Animated.View entering={FadeInUp.duration(400).delay(delay).springify().damping(18)} style={[s.card, { borderColor: colors.cardBorder }]}>
            <BlurView intensity={20} tint={colors.blurTint} style={StyleSheet.absoluteFill} />
            <View style={[s.cardInner, { backgroundColor: colors.cardBg }]}>
                <Text style={[s.cardTitle, { color: colors.textMuted }]}>{title}</Text>
                {children}
            </View>
        </Animated.View>
    );
}

/** Row inside a card with icon + label + right content */
function ModalRow({ icon, label, last, children }: { icon: React.ReactNode; label: string; last: boolean; children: React.ReactNode }) {
    const colors = ThemeColors.light;
    return (
        <View style={[
            { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 14, paddingVertical: 13 },
            !last && { borderBottomWidth: 1, borderBottomColor: colors.divider },
        ]}>
            <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: colors.inputBg, justifyContent: 'center', alignItems: 'center', marginRight: 12, marginTop: 2 }}>
                {icon}
            </View>
            <View style={{ flex: 1 }}>
                <Text style={{ fontSize: FontSizes.xs, color: colors.textMuted, marginBottom: 4 }}>{label}</Text>
                {children}
            </View>
        </View>
    );
}

interface EditForm {
    fullName: string;
    phone: string;
    address: string;
    gender: Gender | '';
    birthDate: string;
}

function EditModal({ visible, employee, onClose, onSaved }: { visible: boolean; employee: Employee; onClose: () => void; onSaved: (e: Employee) => void }) {
    const [form, setForm] = useState<EditForm>({ fullName: '', phone: '', address: '', gender: '', birthDate: '' });
    const [saving, setSaving] = useState(false);
    const colors = ThemeColors.light;
    const { showDialog, DialogComponent } = useDarkDialog();

    const GENDERS: { l: string, v: Gender }[] = [
        { l: 'Nam', v: 'MALE' },
        { l: 'Nữ', v: 'FEMALE' },
        { l: 'Khác', v: 'OTHER' },
    ];

    useEffect(() => {
        if (visible) {
            setForm({
                fullName: employee.fullName,
                phone: employee.phone || '',
                address: employee.address || '',
                gender: (employee.gender || '') as Gender | '',
                birthDate: fromISO(employee.birthDate ?? null),
            });
        }
    }, [visible, employee]);

    const set = (k: keyof EditForm) => (v: string) => setForm(prev => ({ ...prev, [k]: v }));

    const handleSave = async () => {
        if (!form.fullName.trim()) { showDialog('Lỗi', 'Tên không được để trống'); return; }
        setSaving(true);
        try {
            const payload: UpdateEmployeeDto = {
                fullName: form.fullName.trim(),
                phone: form.phone.trim() || undefined,
                address: form.address.trim() || undefined,
                gender: (form.gender || undefined) as Gender | undefined,
                birthDate: toISO(form.birthDate),
            };
            const updated = await employeeApi.updateEmployee(employee.id, payload);
            onSaved(updated);
        } catch (e: any) {
            showDialog('Lỗi', e.response?.data?.message || 'Không thể cập nhật');
        } finally { setSaving(false); }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent={false} statusBarTranslucent>
            <View style={m.root}>
                <LinearGradient colors={colors.gradientColors} style={StyleSheet.absoluteFill} />
                <View style={[m.orb1, { backgroundColor: 'rgba(59,130,246,0.04)' }]} />
                <View style={[m.orb2, { backgroundColor: 'rgba(236,72,153,0.03)' }]} />

                <SafeAreaView style={m.safe} edges={['top', 'bottom']}>
                    {/* Header */}
                    <View style={[m.header, { borderBottomColor: colors.divider }]}>
                        <Pressable style={[m.headerBtn, { backgroundColor: colors.inputBg }]} onPress={onClose}>
                            <X size={20} color={colors.textMuted} />
                        </Pressable>
                        <Text style={[m.headerTitle, { color: colors.textPrimary }]}>Chỉnh sửa hồ sơ</Text>
                        <Pressable style={[m.headerBtn, { backgroundColor: colors.inputBg }]} onPress={handleSave} disabled={saving}>
                            {saving
                                ? <ActivityIndicator color="#3B82F6" size="small" />
                                : <Check size={20} color="#3B82F6" />}
                        </Pressable>
                    </View>

                    <ScrollView
                        style={{ flex: 1 }}
                        contentContainerStyle={m.scroll}
                        keyboardShouldPersistTaps="handled"
                    >
                        {/* Section: Cá nhân */}
                        <Text style={[m.section, { color: colors.textMuted }]}>Thông tin cá nhân</Text>
                        <View style={[m.card, { borderColor: colors.cardBorder, backgroundColor: colors.cardBg }]}>
                            <BlurView intensity={20} tint={colors.blurTint} style={StyleSheet.absoluteFill} />

                            <ModalRow icon={<User size={16} color="#818CF8" />} label="Họ và tên" last={false}>
                                <TextInput
                                    style={[m.fInput, { color: colors.textPrimary }]}
                                    value={form.fullName}
                                    onChangeText={set('fullName')}
                                    placeholder="Nguyễn Văn A"
                                    placeholderTextColor={colors.textMuted}
                                    selectionColor="#818CF8"
                                />
                            </ModalRow>

                            <ModalRow icon={<Heart size={16} color="#F472B6" />} label="Giới tính" last={false}>
                                <View style={m.segRow}>
                                    {GENDERS.map(g => (
                                        <Pressable
                                            key={g.v}
                                            style={[m.segBtn, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder }, form.gender === g.v && m.segBtnA]}
                                            onPress={() => setForm(prev => ({ ...prev, gender: g.v }))}
                                        >
                                            <Text style={[m.segT, { color: colors.textMuted }, form.gender === g.v && m.segTA]}>{g.l}</Text>
                                        </Pressable>
                                    ))}
                                </View>
                            </ModalRow>

                            <ModalRow icon={<CalendarDays size={16} color="#FB923C" />} label="Ngày sinh" last>
                                <TextInput
                                    style={[m.fInput, { color: colors.textPrimary }]}
                                    value={form.birthDate}
                                    onChangeText={t => setForm(prev => ({ ...prev, birthDate: formatDateInput(t) }))}
                                    placeholder="DD-MM-YYYY"
                                    placeholderTextColor={colors.textMuted}
                                    keyboardType="numeric"
                                    maxLength={10}
                                    selectionColor="#818CF8"
                                />
                            </ModalRow>
                        </View>

                        {/* Section: Liên hệ */}
                        <Text style={[m.section, { color: colors.textMuted }]}>Thông tin liên hệ</Text>
                        <View style={[m.card, { borderColor: colors.cardBorder, backgroundColor: colors.cardBg }]}>
                            <BlurView intensity={20} tint={colors.blurTint} style={StyleSheet.absoluteFill} />

                            <ModalRow icon={<Phone size={16} color="#34D399" />} label="Điện thoại" last={false}>
                                <TextInput
                                    style={[m.fInput, { color: colors.textPrimary }]}
                                    value={form.phone}
                                    onChangeText={set('phone')}
                                    placeholder="0901 234 567"
                                    placeholderTextColor={colors.textMuted}
                                    keyboardType="phone-pad"
                                    selectionColor="#818CF8"
                                />
                            </ModalRow>

                            <ModalRow icon={<MapPin size={16} color="#FB923C" />} label="Địa chỉ" last>
                                <TextInput
                                    style={[m.fInput, { color: colors.textPrimary, minHeight: 60, textAlignVertical: 'top', paddingTop: 4 }]}
                                    value={form.address}
                                    onChangeText={set('address')}
                                    placeholder="123 Đường ABC, TP.HCM"
                                    placeholderTextColor={colors.textMuted}
                                    multiline
                                    selectionColor="#818CF8"
                                />
                            </ModalRow>
                        </View>

                        <Pressable style={{ marginTop: Spacing.xl }} onPress={handleSave} disabled={saving}>
                            <LinearGradient colors={['#6366F1', '#4F46E5']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={m.saveBtn}>
                                {saving
                                    ? <ActivityIndicator color="#FFF" />
                                    : <Text style={m.saveBtnT}>Lưu thay đổi</Text>}
                            </LinearGradient>
                        </Pressable>
                    </ScrollView>
                </SafeAreaView>
                {DialogComponent}
            </View>
        </Modal>
    );
}

export default function ProfileScreen() {
    const { user } = useAuthStore();
    const router = useRouter();
    const [employee, setEmployee] = useState<Employee | null>(null);
    const [loading, setLoading] = useState(true);
    const [editOpen, setEditOpen] = useState(false);
    const colors = ThemeColors.light;

    useEffect(() => {
        (async () => {
            if (!user) return;
            try {
                const data = await employeeApi.getEmployeeById(user.id);
                setEmployee(data);
            } catch (e) {
                console.error('Profile Load Error:', e);
            } finally {
                setLoading(false);
            }
        })();
    }, [user]);

    const initials = (employee?.fullName || user?.name || 'U').split(' ').map(n => n[0]).slice(-2).join('').toUpperCase();

    const statusMap: Record<string, { label: string; bg: string, color: string }> = {
        ACTIVE: { label: 'Đang làm việc', bg: 'rgba(16,185,129,0.15)', color: '#10B981' },
        INACTIVE: { label: 'Đã nghỉ', bg: 'rgba(239,68,68,0.15)', color: '#EF4444' },
    };
    const statusInfo = statusMap[employee?.status || ''] || { label: 'Chưa xác định', bg: 'rgba(156,163,175,0.15)', color: '#9CA3AF' };

    return (
        <View style={s.root}>
            <StatusBar style="dark" />
            <LinearGradient colors={colors.gradientColors} style={StyleSheet.absoluteFill} />

            <SafeAreaView style={s.safe} edges={['top']}>
                {/* Header */}
                <Animated.View entering={FadeInDown.duration(400)} style={s.header}>
                    <Pressable style={[s.backBtn, { backgroundColor: colors.inputBg }]} onPress={() => router.push('/(tabs)/settings')}>
                        <ChevronLeft size={22} color={colors.textSecondary} />
                    </Pressable>
                    <Text style={[s.headerTitle, { color: colors.textPrimary }]}>Hồ sơ của tôi</Text>
                    {employee ? (
                        <Pressable style={[s.editBtn, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder }]} onPress={() => setEditOpen(true)}>
                            <Pencil size={16} color="#3B82F6" />
                        </Pressable>
                    ) : <View style={{ width: 36 }} />}
                </Animated.View>

                {loading ? (
                    <View style={s.loader}><ActivityIndicator color="#818CF8" size="large" /></View>
                ) : (
                    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
                        <>
                            {/* Avatar hero */}
                            <Animated.View entering={FadeInUp.duration(500).delay(60).springify().damping(16)} style={[s.heroWrap, { borderColor: colors.cardBorder }]}>
                                <LinearGradient colors={['rgba(59,130,246,0.1)', 'rgba(96,165,250,0.05)']} style={StyleSheet.absoluteFill} />
                                <BlurView intensity={15} tint={colors.blurTint} style={StyleSheet.absoluteFill} />
                                <View style={[s.heroContent, { backgroundColor: colors.cardBg }]}>
                                    {employee?.image ? (
                                        <Image source={{ uri: employee.image }} style={s.avatar} />
                                    ) : (
                                        <LinearGradient colors={['#6366F1', '#A855F7']} style={s.avatarGrad}>
                                            <Text style={s.avatarText}>{initials}</Text>
                                        </LinearGradient>
                                    )}
                                    <Text style={[s.heroName, { color: colors.textPrimary }]}>{employee?.fullName || user?.name || '-'}</Text>
                                    <Text style={[s.heroEmail, { color: colors.textMuted }]}>{user?.email || '-'}</Text>
                                    <View style={s.badgeRow}>
                                        <View style={[s.badge, { backgroundColor: statusInfo.bg, borderColor: 'transparent' }]}>
                                            <ShieldCheck size={11} color={statusInfo.color} />
                                            <Text style={[s.badgeText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
                                        </View>
                                        <View style={[s.badge, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder }]}>
                                            <Text style={[s.badgeText, { color: colors.textSecondary }]}>
                                                {user?.role === 'ADMIN' ? 'Quản trị' : 'Nhân viên'}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            </Animated.View>

                            <View style={s.scroll}>
                                <Card title="Thông tin cá nhân" delay={120}>
                                    <InfoRow Icon={Hash} label="Mã nhân viên" value={employee?.employeeCode || '-'} color="#818CF8" />
                                    <InfoRow Icon={CreditCard} label="Số CCCD" value={employee?.idCard || '-'} color="#34D399" />
                                    <InfoRow Icon={User} label="Giới tính" value={employee?.gender === 'MALE' ? 'Nam' : employee?.gender === 'FEMALE' ? 'Nữ' : 'Khác'} color="#F472B6" />
                                    <InfoRow Icon={CalendarDays} label="Ngày sinh" value={fmtDate(employee?.birthDate || null)} color="#FB923C" />
                                </Card>

                                <Card title="Công việc" delay={180}>
                                    <InfoRow Icon={Briefcase} label="Chức vụ" value={employee?.position || 'Nhân viên'} color="#60A5FA" />
                                    <InfoRow Icon={Users} label="Phòng ban" value={employee?.department || 'Sản xuất'} color="#A78BFA" />
                                </Card>

                                <Card title="Liên hệ & Địa chỉ" delay={240}>
                                    <InfoRow Icon={Phone} label="Số điện thoại" value={employee?.phone || '-'} color="#34D399" />
                                    <InfoRow Icon={MapPin} label="Địa chỉ" value={employee?.address || '-'} color="#F87171" />
                                </Card>

                                {employee && (
                                    <Card title="Hình ảnh CCCD" delay={300}>
                                        <View style={s.idImages}>
                                            {employee.idCardImages?.front && (
                                                <View style={s.idImgWrap}>
                                                    <Image source={{ uri: employee.idCardImages.front }} style={[s.idImg, { borderColor: colors.cardBorder }]} resizeMode="cover" />
                                                    <Text style={[s.idImgLabel, { color: colors.textMuted }]}>Mặt trước</Text>
                                                </View>
                                            )}
                                            {employee.idCardImages?.back && (
                                                <View style={s.idImgWrap}>
                                                    <Image source={{ uri: employee.idCardImages.back }} style={[s.idImg, { borderColor: colors.cardBorder }]} resizeMode="cover" />
                                                    <Text style={[s.idImgLabel, { color: colors.textMuted }]}>Mặt sau</Text>
                                                </View>
                                            )}
                                        </View>
                                    </Card>
                                )}
                            </View>
                        </>
                    </ScrollView>
                )}
            </SafeAreaView>

            {employee && (
                <EditModal
                    visible={editOpen}
                    employee={employee}
                    onClose={() => setEditOpen(false)}
                    onSaved={(updated) => {
                        setEmployee(updated);
                        setEditOpen(false);
                    }}
                />
            )}
        </View>
    );
}

const s = StyleSheet.create({
    root: { flex: 1 }, safe: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
    backBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    editBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: FontSizes.lg, fontWeight: FontWeights.bold },
    loader: { paddingTop: 120, alignItems: 'center' },
    scroll: { paddingHorizontal: Spacing.xl },
    heroWrap: { borderRadius: 24, overflow: 'hidden', borderWidth: 1, marginBottom: Spacing.lg },
    heroContent: { alignItems: 'center', paddingVertical: Spacing.xxl, paddingHorizontal: Spacing.xl },
    avatar: { width: 88, height: 88, borderRadius: 28, marginBottom: Spacing.md, borderWidth: 2, borderColor: 'rgba(99,102,241,0.5)' },
    avatarGrad: { width: 88, height: 88, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.md },
    avatarText: { fontSize: 34, fontWeight: '800', color: '#FFF' },
    heroName: { fontSize: FontSizes.xxl, fontWeight: FontWeights.bold, marginBottom: 4 },
    heroEmail: { fontSize: FontSizes.sm, marginBottom: Spacing.md },
    badgeRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap', justifyContent: 'center' },
    badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
    badgeText: { fontSize: FontSizes.xs, fontWeight: FontWeights.semibold },
    card: { borderRadius: 20, overflow: 'hidden', borderWidth: 1, marginBottom: Spacing.md },
    cardInner: { padding: Spacing.lg },
    cardTitle: { fontSize: FontSizes.xs, fontWeight: FontWeights.semibold, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: Spacing.md },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: 14 },
    infoIcon: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    infoText: { flex: 1 },
    infoLabel: { fontSize: FontSizes.xs },
    infoValue: { fontSize: FontSizes.sm, fontWeight: FontWeights.medium, marginTop: 1 },
    idImages: { flexDirection: 'row', gap: Spacing.md, marginTop: 8 },
    idImgWrap: { flex: 1, alignItems: 'center', gap: 4 },
    idImg: { width: '100%', height: 90, borderRadius: 10, borderWidth: 1 },
    idImgLabel: { fontSize: FontSizes.xs },
});

const m = StyleSheet.create({
    root: { flex: 1 },
    safe: { flex: 1 },
    orb1: { position: 'absolute', width: 220, height: 220, borderRadius: 110, top: 60, right: -60 },
    orb2: { position: 'absolute', width: 160, height: 160, borderRadius: 80, bottom: 120, left: -40 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderBottomWidth: 1 },
    headerBtn: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: FontSizes.base, fontWeight: FontWeights.bold },
    scroll: { padding: Spacing.xl, paddingBottom: 48, gap: 0 },
    section: { fontSize: FontSizes.xs, fontWeight: FontWeights.semibold, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, marginTop: 20, marginLeft: 4 },
    card: { borderRadius: 18, overflow: 'hidden', borderWidth: 1 },
    // Row inside card
    row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: 14, minHeight: 52 },
    rowBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
    rowLabel: { fontSize: FontSizes.xs, marginBottom: 2 },
    rowRight: { flex: 1 },
    fInput: { fontSize: FontSizes.sm, padding: 0 },
    // Gender seg
    segRow: { flexDirection: 'row', gap: 6, marginTop: 4 },
    segBtn: { flex: 1, paddingVertical: 7, borderRadius: 10, alignItems: 'center', borderWidth: 1 },
    segBtnA: { backgroundColor: 'rgba(99,102,241,0.2)', borderColor: '#6366F1' },
    segT: { fontSize: FontSizes.xs, fontWeight: FontWeights.medium },
    segTA: { color: '#A5B4FC', fontWeight: FontWeights.semibold },
    // Save button
    saveBtn: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center', borderRadius: 18 },
    saveBtnT: { color: '#FFF', fontSize: FontSizes.base, fontWeight: FontWeights.bold },
});
