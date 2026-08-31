// Employee View Modal — Detail view (all roles)
import React from 'react';
import {
    View, Text, Modal, StyleSheet, Pressable, ScrollView,
    Image, Linking, Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, { FadeIn, FadeOut, FadeInUp } from 'react-native-reanimated';
import {
    X, Phone, MapPin, CreditCard, Briefcase, Users,
    CalendarDays, Hash, ShieldCheck, PhoneCall, Mail, Heart,
} from 'lucide-react-native';

import { Employee } from '@/lib/employee-api';
import { useThemeStore } from '@/store';
import { ThemeColors } from '@/constants/ThemeColors';
import { Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants/Tokens';
import { StatusBadge } from '@/components/ui/GlassDataScreen';

const { width } = Dimensions.get('window');

const STATUS_MAP: Record<string, { label: string; color: string }> = {
    ACTIVE: { label: 'Đang làm', color: '#10B981' },
    INACTIVE: { label: 'Ngừng việc', color: '#EF4444' },
    ON_LEAVE: { label: 'Nghỉ phép', color: '#F59E0B' },
    TERMINATED: { label: 'Nghỉ việc', color: '#94A3B8' },
};

const AVATAR_COLORS = ['#6366F1', '#0EA5E9', '#10B981', '#EC4899', '#F59E0B', '#8B5CF6'];
const avatarColor = (id: string) => AVATAR_COLORS[id.charCodeAt(0) % AVATAR_COLORS.length];
const avatarInitials = (name: string) => name.split(' ').slice(-2).map(w => w[0]).join('').toUpperCase();
const fmtDate = (d: string | null | undefined) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';
const GENDER_MAP: Record<string, string> = { MALE: 'Nam', FEMALE: 'Nữ', OTHER: 'Khác' };

interface Props {
    visible: boolean;
    employee: Employee | null;
    onClose: () => void;
    onEdit?: () => void;
    isAdmin?: boolean;
}

function InfoRow({ Icon, label, value, accent }: { Icon: any; label: string; value: string; accent?: string }) {
    const { isDark } = useThemeStore();
    const colors = isDark ? ThemeColors.dark : ThemeColors.light;
    const iconColor = accent || '#818CF8';
    return (
        <View style={s.infoRow}>
            <View style={[s.iconWrap, { backgroundColor: iconColor + '15' }]}>
                <Icon size={16} color={iconColor} />
            </View>
            <View style={s.infoContent}>
                <Text style={[s.infoLabel, { color: colors.textMuted }]}>{label}</Text>
                <Text style={[s.infoValue, { color: colors.textPrimary }]}>{value || '—'}</Text>
            </View>
        </View>
    );
}

export default function EmployeeViewModal({ visible, employee, onClose, onEdit, isAdmin }: Props) {
    const { isDark } = useThemeStore();
    const colors = isDark ? ThemeColors.dark : ThemeColors.light;

    if (!visible || !employee) return null;

    const st = STATUS_MAP[employee.status] || { label: employee.status, color: '#94A3B8' };
    const bgColor = avatarColor(employee.id);
    const initials = avatarInitials(employee.fullName);
    const modalBg = isDark ? 'rgba(15,15,30,0.98)' : 'rgba(245,247,255,0.98)';

    const handleCall = () => {
        if (employee.phone) Linking.openURL(`tel:${employee.phone}`);
    };

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose} statusBarTranslucent>
            <View style={s.overlay}>
                <BlurView intensity={40} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
                <Animated.View
                    entering={FadeIn.duration(250)}
                    exiting={FadeOut.duration(200)}
                    style={[s.container, { backgroundColor: modalBg, borderColor: colors.cardBorder }]}
                >
                    {/* Header */}
                    <View style={[s.header, { borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)' }]}>
                        <Text style={[s.headerTitle, { color: colors.textPrimary }]}>Thông tin nhân viên</Text>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                            {isAdmin && onEdit && (
                                <Pressable
                                    style={[s.editBtn]}
                                    onPress={() => { onClose(); setTimeout(onEdit, 300); }}
                                >
                                    <Text style={s.editBtnText}>Sửa</Text>
                                </Pressable>
                            )}
                            <Pressable style={[s.closeBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]} onPress={onClose}>
                                <X size={22} color={colors.textSecondary} />
                            </Pressable>
                        </View>
                    </View>

                    <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
                        {/* Avatar + Name */}
                        <Animated.View entering={FadeInUp.duration(300)} style={s.profileSection}>
                            {employee.image ? (
                                <Image source={{ uri: employee.image }} style={[s.avatar, { borderColor: bgColor + '55' }]} />
                            ) : (
                                <View style={[s.avatar, { backgroundColor: bgColor + '25', borderColor: bgColor + '55' }]}>
                                    <Text style={[s.avatarText, { color: bgColor }]}>{initials}</Text>
                                </View>
                            )}
                            <Text style={[s.profileName, { color: colors.textPrimary }]}>{employee.fullName}</Text>
                            <View style={s.badgeRow}>
                                <View style={[s.codeBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(99,102,241,0.08)' }]}>
                                    <Text style={[s.codeText, { color: colors.textMuted }]}>{employee.employeeCode}</Text>
                                </View>
                                <StatusBadge label={st.label} color={st.color} />
                            </View>
                        </Animated.View>

                        {/* Contact Section */}
                        <Animated.View entering={FadeInUp.duration(300).delay(60)} style={[s.section, { borderColor: colors.cardBorder }]}>
                            <BlurView intensity={15} tint={colors.blurTint} style={StyleSheet.absoluteFill} />
                            <View style={[s.sectionInner, { backgroundColor: colors.cardBg }]}>
                                <Text style={[s.sectionTitle, { color: colors.textSecondary }]}>Liên hệ</Text>
                                <InfoRow Icon={Phone} label="Số điện thoại" value={employee.phone || '—'} accent="#10B981" />
                                {employee.User?.email ? <InfoRow Icon={Mail} label="Email" value={employee.User.email} accent="#3B82F6" /> : null}
                                <InfoRow Icon={MapPin} label="Địa chỉ" value={employee.address || '—'} accent="#F59E0B" />
                            </View>
                        </Animated.View>

                        {/* Work Section */}
                        <Animated.View entering={FadeInUp.duration(300).delay(120)} style={[s.section, { borderColor: colors.cardBorder }]}>
                            <BlurView intensity={15} tint={colors.blurTint} style={StyleSheet.absoluteFill} />
                            <View style={[s.sectionInner, { backgroundColor: colors.cardBg }]}>
                                <Text style={[s.sectionTitle, { color: colors.textSecondary }]}>Công việc</Text>
                                <InfoRow Icon={Briefcase} label="Chức vụ" value={employee.Position?.name || '—'} accent="#EC4899" />
                                <InfoRow Icon={Users} label="Tổ / Nhóm" value={employee.Team?.name || '—'} accent="#8B5CF6" />
                                <InfoRow Icon={CalendarDays} label="Ngày vào" value={fmtDate(employee.hireDate)} accent="#0EA5E9" />
                                <InfoRow Icon={Heart} label="Giới tính" value={employee.gender ? GENDER_MAP[employee.gender] || '—' : '—'} accent="#F43F5E" />
                                <InfoRow Icon={CalendarDays} label="Ngày sinh" value={fmtDate(employee.birthDate)} accent="#F59E0B" />
                            </View>
                        </Animated.View>

                        {/* ID Section */}
                        <Animated.View entering={FadeInUp.duration(300).delay(180)} style={[s.section, { borderColor: colors.cardBorder }]}>
                            <BlurView intensity={15} tint={colors.blurTint} style={StyleSheet.absoluteFill} />
                            <View style={[s.sectionInner, { backgroundColor: colors.cardBg }]}>
                                <Text style={[s.sectionTitle, { color: colors.textSecondary }]}>Giấy tờ</Text>
                                <InfoRow Icon={CreditCard} label="Số CCCD" value={employee.nationalId || '—'} accent="#F97316" />
                                {employee.idCardImages && (
                                    <View style={s.idImagesRow}>
                                        {employee.idCardImages.front ? (
                                            <View style={s.idImgWrap}>
                                                <Image source={{ uri: employee.idCardImages.front }} style={[s.idImg, { borderColor: colors.cardBorder }]} />
                                                <Text style={[s.idImgLabel, { color: colors.textMuted }]}>Mặt trước</Text>
                                            </View>
                                        ) : null}
                                        {employee.idCardImages.back ? (
                                            <View style={s.idImgWrap}>
                                                <Image source={{ uri: employee.idCardImages.back }} style={[s.idImg, { borderColor: colors.cardBorder }]} />
                                                <Text style={[s.idImgLabel, { color: colors.textMuted }]}>Mặt sau</Text>
                                            </View>
                                        ) : null}
                                    </View>
                                )}
                            </View>
                        </Animated.View>

                        <View style={{ height: 100 }} />
                    </ScrollView>

                    {/* Call Button at Bottom */}
                    {employee.phone ? (
                        <View style={[s.callBar, { borderTopColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)' }]}>
                            <Pressable style={s.callBtn} onPress={handleCall}>
                                <PhoneCall size={20} color="#FFFFFF" />
                                <Text style={s.callBtnText}>Gọi {employee.phone}</Text>
                            </Pressable>
                        </View>
                    ) : null}
                </Animated.View>
            </View>
        </Modal>
    );
}

const s = StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'flex-end' },
    container: { height: '92%', borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, overflow: 'hidden' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg, borderBottomWidth: 1,
    },
    headerTitle: { fontSize: FontSizes.lg, fontWeight: FontWeights.bold },
    closeBtn: { padding: 8, borderRadius: 12 },
    editBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, backgroundColor: '#6366F1' },
    editBtnText: { fontSize: FontSizes.sm, fontWeight: FontWeights.semibold, color: '#FFFFFF' },
    scroll: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg },

    // Profile
    profileSection: { alignItems: 'center', marginBottom: Spacing.xl },
    avatar: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', borderWidth: 2, marginBottom: Spacing.md },
    avatarText: { fontSize: 28, fontWeight: '700' as any },
    profileName: { fontSize: FontSizes.xxl, fontWeight: FontWeights.bold, textAlign: 'center', marginBottom: Spacing.sm },
    badgeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    codeBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
    codeText: { fontSize: FontSizes.xs, fontWeight: FontWeights.medium },

    // Section
    section: { borderRadius: 18, overflow: 'hidden', borderWidth: 1, marginBottom: Spacing.md },
    sectionInner: { padding: Spacing.lg },
    sectionTitle: { fontSize: FontSizes.xs, fontWeight: FontWeights.bold, textTransform: 'uppercase', letterSpacing: 1, marginBottom: Spacing.md },

    // Info Row
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.md },
    iconWrap: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    infoContent: { flex: 1 },
    infoLabel: { fontSize: FontSizes.xs, marginBottom: 2 },
    infoValue: { fontSize: FontSizes.sm, fontWeight: FontWeights.medium },

    // ID Images
    idImagesRow: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm },
    idImgWrap: { flex: 1, alignItems: 'center', gap: 4 },
    idImg: { width: '100%', height: 100, borderRadius: 12, borderWidth: 1 },
    idImgLabel: { fontSize: FontSizes.xs },

    // Call bar
    callBar: { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg, borderTopWidth: 1 },
    callBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
        paddingVertical: 14, borderRadius: 16, backgroundColor: '#10B981',
    },
    callBtnText: { fontSize: FontSizes.base, fontWeight: FontWeights.semibold, color: '#FFFFFF' },
});
