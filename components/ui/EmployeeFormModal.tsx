// Employee Form Modal — Add/Edit (Admin only)
import React, { useState, useEffect } from 'react';
import {
    View, Text, Modal, StyleSheet, Pressable, ScrollView,
    TextInput, ActivityIndicator, Image,
} from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { X, UserPlus, Save, Camera, CreditCard } from 'lucide-react-native';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';

import { Employee, CreateEmployeeDto, UpdateEmployeeDto, EmployeeStatus, Gender } from '@/lib/employee-api';
import { teamApi, Team } from '@/lib/team-api';
import { positionApi, Position } from '@/lib/position-api';
import { userApi, AppUser } from '@/lib/user-api';
import { employeeApi } from '@/lib/employee-api';
import { useThemeStore } from '@/store';
import { ThemeColors } from '@/constants/ThemeColors';
import { Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants/Tokens';
import { useDarkDialog } from '@/components/ui/DarkDialog';

const STATUS_OPTIONS: { label: string; value: EmployeeStatus }[] = [
    { label: 'Đang làm', value: 'ACTIVE' },
    { label: 'Ngừng việc', value: 'INACTIVE' },
    { label: 'Nghỉ phép', value: 'ON_LEAVE' },
    { label: 'Nghỉ việc', value: 'TERMINATED' },
];

const GENDER_OPTIONS: { label: string; value: Gender | '' }[] = [
    { label: '-- Chọn giới tính --', value: '' },
    { label: 'Nam', value: 'MALE' },
    { label: 'Nữ', value: 'FEMALE' },
    { label: 'Khác', value: 'OTHER' },
];

interface Props {
    visible: boolean;
    employee?: Employee | null;
    onClose: () => void;
    onSave: (data: CreateEmployeeDto | UpdateEmployeeDto, id?: string) => Promise<void>;
}

export default function EmployeeFormModal({ visible, employee, onClose, onSave }: Props) {
    const { isDark } = useThemeStore();
    const colors = isDark ? ThemeColors.dark : ThemeColors.light;
    const { showDialog, DialogComponent } = useDarkDialog();

    const modalBg = isDark ? 'rgba(15,15,30,0.98)' : 'rgba(245,247,255,0.98)';
    const inputBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(99,102,241,0.06)';
    const inputBorder = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(99,102,241,0.15)';

    const isEdit = !!employee;

    // Form fields
    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [nationalId, setNationalId] = useState('');
    const [teamId, setTeamId] = useState('');
    const [positionId, setPositionId] = useState('');
    const [status, setStatus] = useState<EmployeeStatus>('ACTIVE');
    const [hireDate, setHireDate] = useState('');
    const [birthDate, setBirthDate] = useState('');
    const [gender, setGender] = useState<Gender | ''>('');
    const [employeeCode, setEmployeeCode] = useState('');
    const [userId, setUserId] = useState('');
    const [imageUri, setImageUri] = useState('');
    const [cccdFront, setCccdFront] = useState('');
    const [cccdBack, setCccdBack] = useState('');

    // Metadata
    const [teams, setTeams] = useState<Team[]>([]);
    const [positions, setPositions] = useState<Position[]>([]);
    const [unlinkedUsers, setUnlinkedUsers] = useState<AppUser[]>([]);
    const [loadingMeta, setLoadingMeta] = useState(false);
    const [metaError, setMetaError] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (visible) {
            loadMeta();
            if (employee) {
                setFullName(employee.fullName);
                setPhone(employee.phone || '');
                setAddress(employee.address || '');
                setNationalId(employee.nationalId || '');
                setTeamId(employee.teamId || '');
                setPositionId(employee.positionId || '');
                setStatus(employee.status);
                setHireDate(employee.hireDate ? employee.hireDate.slice(0, 10) : '');
                setBirthDate(employee.birthDate ? employee.birthDate.slice(0, 10) : '');
                setGender((employee.gender as Gender) || '');
                setEmployeeCode(employee.employeeCode);
                setUserId(employee.userId);
                setImageUri(employee.image || '');
                setCccdFront(employee.idCardImages?.front || '');
                setCccdBack(employee.idCardImages?.back || '');
            } else {
                resetForm();
            }
        }
    }, [visible, employee]);

    const loadMeta = async () => {
        setLoadingMeta(true);
        setMetaError('');
        try {
            const [t, p, allUsers, allEmps] = await Promise.all([
                teamApi.getTeams(),
                positionApi.getPositions(),
                userApi.getAll(),
                employeeApi.getEmployees(),
            ]);
            setTeams(Array.isArray(t) ? t : []);
            setPositions(Array.isArray(p) ? p : []);

            // Filter users that don't have an employee linked
            // Use filter(Boolean) to exclude null/undefined userIds
            const linkedUserIds = new Set(
                (Array.isArray(allEmps) ? allEmps : []).map(e => e.userId).filter(Boolean)
            );
            const usersArr = Array.isArray(allUsers) ? allUsers : [];
            const available = usersArr.filter(u => u && u.id && !linkedUserIds.has(u.id));
            setUnlinkedUsers(available);
        } catch (err: any) {
            console.error('[EmployeeForm] loadMeta error:', err?.message || err);
            setMetaError('Không thể tải dữ liệu: ' + (err?.response?.data?.message || err?.message || 'Lỗi kết nối'));
        } finally { setLoadingMeta(false); }
    };

    const resetForm = () => {
        setFullName(''); setPhone(''); setAddress(''); setNationalId('');
        setTeamId(''); setPositionId(''); setStatus('ACTIVE'); setHireDate('');
        setBirthDate(''); setGender(''); setEmployeeCode(''); setUserId('');
        setImageUri(''); setCccdFront(''); setCccdBack('');
    };

    const handleClose = () => { if (!saving) { resetForm(); onClose(); } };

    const fromLibrary = async (setter: (uri: string) => void) => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            showDialog('Quyền bị từ chối', 'Cần quyền truy cập thư viện ảnh');
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 0.8,
        });
        if (!result.canceled && result.assets[0]) setter(result.assets[0].uri);
    };

    const takePhoto = async (setter: (uri: string) => void) => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            showDialog('Quyền bị từ chối', 'Cần quyền truy cập camera');
            return;
        }
        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 0.8,
        });
        if (!result.canceled && result.assets[0]) setter(result.assets[0].uri);
    };

    const showImageOptions = (setter: (uri: string) => void) => {
        showDialog(
            'Chọn ảnh',
            'Chọn nguồn ảnh',
            [
                { text: '📷 Chụp ảnh', onPress: () => takePhoto(setter) },
                { text: '🖼️ Thư viện ảnh', onPress: () => fromLibrary(setter) },
                { text: 'Hủy', style: 'cancel' },
            ]
        );
    };

    const handleSave = async () => {
        if (!fullName.trim()) { showDialog('Lỗi', 'Tên nhân viên không được để trống'); return; }

        setSaving(true);
        try {
            if (isEdit) {
                const data: UpdateEmployeeDto = {
                    fullName: fullName.trim(),
                    phone: phone.trim() || undefined,
                    address: address.trim() || undefined,
                    nationalId: nationalId.trim() || undefined,
                    teamId: teamId || undefined,
                    positionId: positionId || undefined,
                    status: status,
                    hireDate: hireDate || undefined,
                    birthDate: birthDate || undefined,
                    gender: (gender as Gender) || undefined,
                    image: imageUri || undefined,
                    idCardImages: (cccdFront || cccdBack) ? { front: cccdFront || undefined, back: cccdBack || undefined } : undefined,
                };
                await onSave(data, employee!.id);
            } else {
                if (!employeeCode.trim()) { showDialog('Lỗi', 'Mã nhân viên không được để trống'); setSaving(false); return; }
                if (!userId) { showDialog('Lỗi', 'Vui lòng chọn tài khoản người dùng'); setSaving(false); return; }
                const data: CreateEmployeeDto = {
                    userId: userId,
                    employeeCode: employeeCode.trim(),
                    fullName: fullName.trim(),
                    phone: phone.trim() || undefined,
                    address: address.trim() || undefined,
                    nationalId: nationalId.trim() || undefined,
                    teamId: teamId || undefined,
                    positionId: positionId || undefined,
                    status: status,
                    hireDate: hireDate || undefined,
                    image: imageUri || undefined,
                    idCardImages: (cccdFront || cccdBack) ? { front: cccdFront || undefined, back: cccdBack || undefined } : undefined,
                };
                await onSave(data);
            }
            showDialog('Thành công', isEdit ? 'Đã cập nhật nhân viên' : 'Đã thêm nhân viên mới');
            handleClose();
        } catch (e: any) {
            showDialog('Lỗi', e.response?.data?.message || 'Không thể lưu thông tin nhân viên');
        } finally { setSaving(false); }
    };

    const formatDateInput = (text: string) => {
        const cleaned = text.replace(/\D/g, '');
        let res = cleaned;
        if (cleaned.length > 4) res = cleaned.slice(0, 4) + '-' + cleaned.slice(4);
        if (cleaned.length > 6) res = res.slice(0, 7) + '-' + res.slice(7, 9);
        return res;
    };

    const pickerItemStyle = isDark
        ? { backgroundColor: '#1a1a2e', color: '#FFFFFF' }
        : { backgroundColor: '#FFFFFF', color: '#1E1B4B' };

    return (
        <>
            <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose} statusBarTranslucent>
                <View style={s.overlay}>
                    <BlurView intensity={40} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
                    <Animated.View
                        entering={FadeIn.duration(250)}
                        exiting={FadeOut.duration(200)}
                        style={[s.container, { backgroundColor: modalBg, borderColor: colors.cardBorder }]}
                    >
                        {/* Header */}
                        <View style={[s.header, { borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)' }]}>
                            <UserPlus size={24} color="#6366F1" />
                            <Text style={[s.headerTitle, { color: colors.textPrimary }]}>
                                {isEdit ? 'Chỉnh sửa nhân viên' : 'Thêm nhân viên'}
                            </Text>
                            <Pressable style={[s.closeBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]} onPress={handleClose} disabled={saving}>
                                <X size={22} color={colors.textSecondary} />
                            </Pressable>
                        </View>

                        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

                            {/* Avatar Image */}
                            <View style={s.avatarSection}>
                                <Pressable onPress={() => showImageOptions(setImageUri)} disabled={saving}>
                                    {imageUri ? (
                                        <View>
                                            <Image source={{ uri: imageUri }} style={s.avatarImg} />
                                            <View style={s.avatarEditBadge}>
                                                <Camera size={12} color="#fff" />
                                            </View>
                                        </View>
                                    ) : (
                                        <View style={[s.avatarPlaceholder, { backgroundColor: inputBg, borderColor: inputBorder }]}>
                                            <Camera size={28} color={colors.textMuted} />
                                            <Text style={[s.avatarHint, { color: colors.textMuted }]}>Ảnh đại diện</Text>
                                        </View>
                                    )}
                                </Pressable>
                            </View>

                            {/* User select (Create only) */}
                            {!isEdit && (
                                <View style={s.field}>
                                    <Text style={[s.label, { color: colors.textSecondary }]}>Tài khoản người dùng *</Text>
                                    <View style={[s.pickerWrap, { backgroundColor: inputBg, borderColor: inputBorder }]}>
                                        {loadingMeta ? <ActivityIndicator size="small" color="#818CF8" /> : (
                                            <Picker selectedValue={userId} onValueChange={setUserId} style={[s.picker, { color: colors.textPrimary }]} dropdownIconColor={colors.textMuted} enabled={!saving} mode="dropdown">
                                                <Picker.Item label="-- Chọn tài khoản --" value="" style={pickerItemStyle} />
                                                {unlinkedUsers.map(u => <Picker.Item key={u.id} label={`${u.email}${u.name ? ` (${u.name})` : ''}`} value={u.id} style={pickerItemStyle} />)}
                                            </Picker>
                                        )}
                                    </View>
                                    {metaError ? (
                                        <Text style={[s.hint, { color: '#EF4444' }]}>{metaError}</Text>
                                    ) : unlinkedUsers.length === 0 && !loadingMeta ? (
                                        <Text style={[s.hint, { color: '#F59E0B' }]}>Không có tài khoản nào chưa liên kết</Text>
                                    ) : null}
                                </View>
                            )}

                            {/* Employee Code (Create only) */}
                            {!isEdit && (
                                <Field label="Mã nhân viên *" value={employeeCode} onChange={setEmployeeCode} placeholder="VD: NV001" colors={colors} inputBg={inputBg} inputBorder={inputBorder} disabled={saving} />
                            )}

                            <Field label="Họ tên *" value={fullName} onChange={setFullName} placeholder="Nguyễn Văn A" colors={colors} inputBg={inputBg} inputBorder={inputBorder} disabled={saving} />
                            <Field label="Số điện thoại" value={phone} onChange={setPhone} placeholder="0901234567" keyboardType="phone-pad" colors={colors} inputBg={inputBg} inputBorder={inputBorder} disabled={saving} />
                            <Field label="Địa chỉ" value={address} onChange={setAddress} placeholder="123 Đường ABC..." colors={colors} inputBg={inputBg} inputBorder={inputBorder} disabled={saving} />
                            <Field label="Số CCCD" value={nationalId} onChange={setNationalId} placeholder="001234567890" keyboardType="number-pad" colors={colors} inputBg={inputBg} inputBorder={inputBorder} disabled={saving} />

                            {/* Gender Picker */}
                            <View style={s.field}>
                                <Text style={[s.label, { color: colors.textSecondary }]}>Giới tính</Text>
                                <View style={[s.pickerWrap, { backgroundColor: inputBg, borderColor: inputBorder }]}>
                                    <Picker selectedValue={gender} onValueChange={(v) => setGender(v as Gender | '')} style={[s.picker, { color: colors.textPrimary }]} dropdownIconColor={colors.textMuted} enabled={!saving} mode="dropdown">
                                        {GENDER_OPTIONS.map(o => <Picker.Item key={o.value} label={o.label} value={o.value} style={pickerItemStyle} />)}
                                    </Picker>
                                </View>
                            </View>

                            <Field label="Ngày sinh (YYYY-MM-DD)" value={birthDate} onChange={(t) => setBirthDate(formatDateInput(t))} placeholder="1990-05-20" keyboardType="number-pad" colors={colors} inputBg={inputBg} inputBorder={inputBorder} disabled={saving} />
                            <Field label="Ngày vào làm (YYYY-MM-DD)" value={hireDate} onChange={(t) => setHireDate(formatDateInput(t))} placeholder="2024-01-15" keyboardType="number-pad" colors={colors} inputBg={inputBg} inputBorder={inputBorder} disabled={saving} />

                            {/* Team Picker */}
                            <View style={s.field}>
                                <Text style={[s.label, { color: colors.textSecondary }]}>Tổ / Nhóm</Text>
                                <View style={[s.pickerWrap, { backgroundColor: inputBg, borderColor: inputBorder }]}>
                                    {loadingMeta ? <ActivityIndicator size="small" color="#818CF8" /> : (
                                        <Picker selectedValue={teamId} onValueChange={setTeamId} style={[s.picker, { color: colors.textPrimary }]} dropdownIconColor={colors.textMuted} enabled={!saving} mode="dropdown">
                                            <Picker.Item label="-- Chọn tổ --" value="" style={pickerItemStyle} />
                                            {teams.map(t => <Picker.Item key={t.id} label={`${t.code} - ${t.name}`} value={t.id} style={pickerItemStyle} />)}
                                        </Picker>
                                    )}
                                </View>
                            </View>

                            {/* Position Picker */}
                            <View style={s.field}>
                                <Text style={[s.label, { color: colors.textSecondary }]}>Chức vụ</Text>
                                <View style={[s.pickerWrap, { backgroundColor: inputBg, borderColor: inputBorder }]}>
                                    {loadingMeta ? <ActivityIndicator size="small" color="#818CF8" /> : (
                                        <Picker selectedValue={positionId} onValueChange={setPositionId} style={[s.picker, { color: colors.textPrimary }]} dropdownIconColor={colors.textMuted} enabled={!saving} mode="dropdown">
                                            <Picker.Item label="-- Chọn chức vụ --" value="" style={pickerItemStyle} />
                                            {positions.map(p => <Picker.Item key={p.id} label={`${p.code} - ${p.name}`} value={p.id} style={pickerItemStyle} />)}
                                        </Picker>
                                    )}
                                </View>
                            </View>

                            {/* Status Picker */}
                            <View style={s.field}>
                                <Text style={[s.label, { color: colors.textSecondary }]}>Trạng thái</Text>
                                <View style={[s.pickerWrap, { backgroundColor: inputBg, borderColor: inputBorder }]}>
                                    <Picker selectedValue={status} onValueChange={(v) => setStatus(v as EmployeeStatus)} style={[s.picker, { color: colors.textPrimary }]} dropdownIconColor={colors.textMuted} enabled={!saving} mode="dropdown">
                                        {STATUS_OPTIONS.map(o => <Picker.Item key={o.value} label={o.label} value={o.value} style={pickerItemStyle} />)}
                                    </Picker>
                                </View>
                            </View>

                            {/* CCCD Images */}
                            <View style={s.field}>
                                <Text style={[s.label, { color: colors.textSecondary }]}>Ảnh CCCD</Text>
                                <View style={s.cccdRow}>
                                    <Pressable style={s.cccdItem} onPress={() => showImageOptions(setCccdFront)} disabled={saving}>
                                        {cccdFront ? (
                                            <View style={{ position: 'relative' }}>
                                                <Image source={{ uri: cccdFront }} style={[s.cccdImg, { borderColor: inputBorder }]} />
                                                <View style={s.cccdEditBadge}><Camera size={10} color="#fff" /></View>
                                            </View>
                                        ) : (
                                            <View style={[s.cccdPlaceholder, { backgroundColor: inputBg, borderColor: inputBorder }]}>
                                                <CreditCard size={20} color={colors.textMuted} />
                                                <Camera size={14} color={colors.textMuted} />
                                                <Text style={[s.cccdHint, { color: colors.textMuted }]}>Mặt trước</Text>
                                            </View>
                                        )}
                                    </Pressable>
                                    <Pressable style={s.cccdItem} onPress={() => showImageOptions(setCccdBack)} disabled={saving}>
                                        {cccdBack ? (
                                            <View style={{ position: 'relative' }}>
                                                <Image source={{ uri: cccdBack }} style={[s.cccdImg, { borderColor: inputBorder }]} />
                                                <View style={s.cccdEditBadge}><Camera size={10} color="#fff" /></View>
                                            </View>
                                        ) : (
                                            <View style={[s.cccdPlaceholder, { backgroundColor: inputBg, borderColor: inputBorder }]}>
                                                <CreditCard size={20} color={colors.textMuted} />
                                                <Camera size={14} color={colors.textMuted} />
                                                <Text style={[s.cccdHint, { color: colors.textMuted }]}>Mặt sau</Text>
                                            </View>
                                        )}
                                    </Pressable>
                                </View>
                            </View>

                            <View style={{ height: 40 }} />
                        </ScrollView>

                        {/* Footer */}
                        <View style={[s.footer, { borderTopColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)' }]}>
                            <Pressable style={[s.saveBtn, saving && s.saveBtnDisabled]} onPress={handleSave} disabled={saving}>
                                {saving ? <ActivityIndicator size="small" color="#FFFFFF" /> : (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <Save size={18} color="#FFFFFF" />
                                        <Text style={s.saveBtnText}>{isEdit ? 'Cập nhật' : 'Thêm nhân viên'}</Text>
                                    </View>
                                )}
                            </Pressable>
                            <Pressable style={s.cancelBtn} onPress={handleClose} disabled={saving}>
                                <Text style={[s.cancelText, { color: colors.textMuted }]}>Hủy</Text>
                            </Pressable>
                        </View>
                    </Animated.View>
                </View>
            </Modal>
            {DialogComponent}
        </>
    );
}

function Field({ label, value, onChange, placeholder, keyboardType, colors, inputBg, inputBorder, disabled }: {
    label: string; value: string; onChange: (v: string) => void; placeholder: string;
    keyboardType?: any; colors: any; inputBg: string; inputBorder: string; disabled: boolean;
}) {
    return (
        <View style={s.field}>
            <Text style={[s.label, { color: colors.textSecondary }]}>{label}</Text>
            <View style={[s.inputWrap, { backgroundColor: inputBg, borderColor: inputBorder }]}>
                <TextInput
                    style={[s.input, { color: colors.textPrimary }]}
                    value={value}
                    onChangeText={onChange}
                    placeholder={placeholder}
                    placeholderTextColor={colors.textMuted}
                    keyboardType={keyboardType}
                    editable={!disabled}
                />
            </View>
        </View>
    );
}

const s = StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'flex-end' },
    container: { height: '92%', borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, overflow: 'hidden' },
    header: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
        paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg, borderBottomWidth: 1,
    },
    headerTitle: { flex: 1, fontSize: FontSizes.xl, fontWeight: FontWeights.bold },
    closeBtn: { padding: 8, borderRadius: 12 },
    scroll: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg },

    // Avatar
    avatarSection: { alignItems: 'center', marginBottom: Spacing.xl },
    avatarImg: { width: 90, height: 90, borderRadius: 45, borderWidth: 2, borderColor: '#6366F1' },
    avatarPlaceholder: {
        width: 90, height: 90, borderRadius: 45, borderWidth: 1.5, borderStyle: 'dashed',
        justifyContent: 'center', alignItems: 'center', gap: 4,
    },
    avatarHint: { fontSize: 10, fontWeight: '500' as any },
    avatarEditBadge: {
        position: 'absolute', bottom: 2, right: 2,
        width: 22, height: 22, borderRadius: 11,
        backgroundColor: '#6366F1', justifyContent: 'center', alignItems: 'center',
    },

    // Fields
    field: { marginBottom: Spacing.lg },
    label: { fontSize: FontSizes.sm, fontWeight: FontWeights.medium, marginBottom: Spacing.sm },
    hint: { fontSize: FontSizes.xs, marginTop: 4 },
    inputWrap: { paddingHorizontal: Spacing.md, paddingVertical: 12, borderRadius: BorderRadius.lg, borderWidth: 1 },
    input: { fontSize: FontSizes.base },
    pickerWrap: { borderRadius: BorderRadius.lg, borderWidth: 1, minHeight: 48, justifyContent: 'center', paddingHorizontal: 4 },
    picker: { flex: 1 },

    // CCCD
    cccdRow: { flexDirection: 'row', gap: Spacing.md },
    cccdItem: { flex: 1 },
    cccdImg: { width: '100%', height: 100, borderRadius: 12, borderWidth: 1 },
    cccdPlaceholder: {
        width: '100%', height: 100, borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed',
        justifyContent: 'center', alignItems: 'center', gap: 4,
    },
    cccdHint: { fontSize: 10, fontWeight: '500' as any },
    cccdEditBadge: {
        position: 'absolute', bottom: 4, right: 4,
        width: 20, height: 20, borderRadius: 10,
        backgroundColor: '#6366F1', justifyContent: 'center', alignItems: 'center',
    },

    // Footer
    footer: { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg, gap: Spacing.md, borderTopWidth: 1 },
    saveBtn: { paddingVertical: 14, borderRadius: 16, backgroundColor: '#6366F1', alignItems: 'center', justifyContent: 'center' },
    saveBtnDisabled: { opacity: 0.5 },
    saveBtnText: { fontSize: FontSizes.base, fontWeight: FontWeights.semibold, color: '#FFFFFF' },
    cancelBtn: { padding: Spacing.md, alignItems: 'center' },
    cancelText: { fontSize: FontSizes.base, fontWeight: FontWeights.medium },
});
