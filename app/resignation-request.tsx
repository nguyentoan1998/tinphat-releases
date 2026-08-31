// Resignation Request Screen — Đơn xin nghỉ việc
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    View, Text, StyleSheet, Pressable, ScrollView,
    TextInput, RefreshControl, ActivityIndicator, Modal,
    KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import {
    ChevronLeft, Search, X, Plus, Check, XCircle,
    CalendarDays, Clock, FileText, AlertCircle,
    Ban, Trash2,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';

import {
    resignationRequestApi, ResignationRequest,
    RESIGNATION_STATUS_CONFIG, ResignationRequestStatus,
    CreateResignationRequestDto,
} from '@/lib/resignation-request-api';
import { teamApi, Team } from '@/lib/team-api';
import { useAuthStore } from '@/store';
import { Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants/Tokens';
import { ThemeColors } from '@/constants/ThemeColors';

// --- Constants ---

const STATUS_FILTERS: { key: ResignationRequestStatus | ''; label: string; color: string }[] = [
    { key: '',          label: 'Tất cả',    color: '#6366F1' },
    { key: 'PENDING',   label: 'Chờ duyệt', color: '#F59E0B' },
    { key: 'APPROVED',  label: 'Đã duyệt',  color: '#10B981' },
    { key: 'REJECTED',  label: 'Từ chối',   color: '#EF4444' },
    { key: 'CANCELLED', label: 'Đã hủy',    color: '#94A3B8' },
];

// --- Helpers ---

function parseDMY(str: string): Date | null {
    const parts = str.split('/');
    if (parts.length !== 3) return null;
    const [d, m, y] = parts.map(Number);
    if (!d || !m || !y || y < 2000) return null;
    const date = new Date(y, m - 1, d);
    return isNaN(date.getTime()) ? null : date;
}

function fmtDate(iso: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
}

function toIso(dmy: string): string {
    const d = parseDMY(dmy);
    if (!d) return '';
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// --- StatusBadge ---

function StatusBadge({ status }: { status: ResignationRequestStatus }) {
    const cfg = RESIGNATION_STATUS_CONFIG[status];
    return (
        <View style={[sb.badge, { backgroundColor: cfg.bg }]}>
            <Text style={[sb.text, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
    );
}
const sb = StyleSheet.create({
    badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: BorderRadius.full },
    text: { fontSize: 11, fontWeight: FontWeights.semibold },
});

// --- ResignRow ---

function ResignRow({ item, index, onPress }: { item: ResignationRequest; index: number; onPress: () => void }) {
    const colors = ThemeColors.light;
    const cfg = RESIGNATION_STATUS_CONFIG[item.status];
    const emp = item.Employee;
    return (
        <Animated.View entering={FadeInUp.duration(300).delay(index * 30).springify().damping(18)}>
            <Pressable style={({ pressed }) => [rr.card, { borderColor: colors.cardBorder }, pressed && { opacity: 0.88 }]} onPress={onPress}>
                <BlurView intensity={18} tint="light" style={StyleSheet.absoluteFill} />
                <View style={[rr.inner, { backgroundColor: colors.cardBg }]}>
                    <View style={rr.topRow}>
                        <View style={rr.nameWrap}>
                            <Text style={[rr.name, { color: colors.textPrimary }]} numberOfLines={1}>{emp?.fullName ?? '—'}</Text>
                            <Text style={[rr.meta, { color: colors.textMuted }]}>{[emp?.employeeCode, emp?.Team?.name].filter(Boolean).join(' · ')}</Text>
                        </View>
                        <StatusBadge status={item.status} />
                    </View>
                    <View style={rr.midRow}>
                        <View style={[rr.datePill, { backgroundColor: cfg.bg }]}>
                            <CalendarDays size={11} color={cfg.color} />
                            <Text style={[rr.dateText, { color: cfg.color }]}>Nghỉ: {fmtDate(item.lastWorkingDate)}</Text>
                        </View>
                    </View>
                    {!!item.reason && <Text style={[rr.reason, { color: colors.textMuted }]} numberOfLines={1}>{item.reason}</Text>}
                </View>
            </Pressable>
        </Animated.View>
    );
}
const rr = StyleSheet.create({
    card: { borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1 },
    inner: { padding: Spacing.md, gap: 8 },
    topRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
    nameWrap: { flex: 1 },
    name: { fontSize: FontSizes.sm, fontWeight: FontWeights.semibold },
    meta: { fontSize: FontSizes.xs, marginTop: 2 },
    midRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    datePill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: BorderRadius.full },
    dateText: { fontSize: 11, fontWeight: FontWeights.medium },
    reason: { fontSize: FontSizes.xs, fontStyle: 'italic' },
});

// --- DetailModal ---

interface DetailModalProps {
    item: ResignationRequest | null;
    visible: boolean;
    onClose: () => void;
    isAdmin: boolean;
    isUserOrManager: boolean;
    currentEmployeeId?: string;
    onApprove: (id: string) => Promise<void>;
    onReject: (id: string) => void;
    onCancel: (id: string) => Promise<void>;
    onDelete: (id: string) => void;
}

function DetailModal({
    item, visible, onClose,
    isAdmin, isUserOrManager, currentEmployeeId,
    onApprove, onReject, onCancel, onDelete,
}: DetailModalProps) {
    const colors = ThemeColors.light;
    const [actionLoading, setActionLoading] = useState(false);
    if (!item) return null;
    const cfg = RESIGNATION_STATUS_CONFIG[item.status];
    const emp = item.Employee;
    const isPending = item.status === 'PENDING';
    const isOwner = item.employeeId === currentEmployeeId;

    const handleApprove = async () => {
        setActionLoading(true);
        try { await onApprove(item.id); onClose(); }
        finally { setActionLoading(false); }
    };

    const handleCancel = () => {
        Alert.alert(
            'Xác nhận hủy',
            'Bạn có chắc muốn hủy đơn xin nghỉ việc này không?',
            [
                { text: 'Không', style: 'cancel' },
                {
                    text: 'Hủy đơn', style: 'destructive',
                    onPress: async () => {
                        setActionLoading(true);
                        try { await onCancel(item.id); onClose(); }
                        finally { setActionLoading(false); }
                    },
                },
            ]
        );
    };

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <View style={dm.overlay}>
                <BlurView intensity={40} tint="light" style={StyleSheet.absoluteFill} />
                <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
                <Animated.View entering={FadeInUp.duration(350).springify().damping(18)} style={[dm.sheet, { backgroundColor: colors.cardBg }]}>
                    <View style={dm.handle} />
                    <View style={[dm.header, { borderBottomColor: colors.divider }]}>
                        <View style={{ flex: 1 }}>
                            <Text style={[dm.title, { color: colors.textPrimary }]}>Chi tiết đơn nghỉ việc</Text>
                            <Text style={[dm.sub, { color: colors.textMuted }]}>{emp?.fullName ?? '—'} · {emp?.employeeCode ?? ''}</Text>
                        </View>
                        <Pressable onPress={onClose} style={[dm.closeBtn, { backgroundColor: colors.inputBg }]}>
                            <X size={18} color={colors.textSecondary} />
                        </Pressable>
                    </View>
                    <ScrollView contentContainerStyle={dm.body} showsVerticalScrollIndicator={false}>
                        <View style={[dm.row, { backgroundColor: cfg.bg, borderRadius: BorderRadius.md }]}>
                            <Text style={[dm.rowLabel, { color: cfg.color }]}>Trạng thái</Text>
                            <Text style={[dm.rowValue, { color: cfg.color, fontWeight: FontWeights.bold }]}>{cfg.label}</Text>
                        </View>
                        {emp?.Team?.name ? (
                            <View style={[dm.row, { backgroundColor: colors.inputBg, borderRadius: BorderRadius.md }]}>
                                <Text style={[dm.rowLabel, { color: colors.textMuted }]}>Tổ</Text>
                                <Text style={[dm.rowValue, { color: colors.textPrimary }]}>{emp.Team.name}</Text>
                            </View>
                        ) : null}
                        {emp?.Position?.name ? (
                            <View style={[dm.row, { backgroundColor: colors.inputBg, borderRadius: BorderRadius.md }]}>
                                <Text style={[dm.rowLabel, { color: colors.textMuted }]}>Chức vụ</Text>
                                <Text style={[dm.rowValue, { color: colors.textPrimary }]}>{emp.Position.name}</Text>
                            </View>
                        ) : null}
                        <View style={[dm.row, { backgroundColor: colors.inputBg, borderRadius: BorderRadius.md }]}>
                            <Text style={[dm.rowLabel, { color: colors.textMuted }]}>Ngày làm việc cuối</Text>
                            <Text style={[dm.rowValue, { color: colors.textPrimary, fontWeight: FontWeights.semibold }]}>{fmtDate(item.lastWorkingDate)}</Text>
                        </View>
                        <View style={[dm.block, { backgroundColor: colors.inputBg, borderRadius: BorderRadius.md }]}>
                            <Text style={[dm.rowLabel, { color: colors.textMuted }]}>Lý do</Text>
                            <Text style={[dm.blockText, { color: colors.textPrimary }]}>{item.reason || '—'}</Text>
                        </View>
                        {!!item.note && (
                            <View style={[dm.block, { backgroundColor: colors.inputBg, borderRadius: BorderRadius.md }]}>
                                <Text style={[dm.rowLabel, { color: colors.textMuted }]}>Ghi chú</Text>
                                <Text style={[dm.blockText, { color: colors.textPrimary }]}>{item.note}</Text>
                            </View>
                        )}
                        {!!item.rejectReason && (
                            <View style={[dm.block, { backgroundColor: 'rgba(239,68,68,0.06)', borderRadius: BorderRadius.md }]}>
                                <Text style={[dm.rowLabel, { color: '#EF4444' }]}>Lý do từ chối</Text>
                                <Text style={[dm.blockText, { color: '#EF4444' }]}>{item.rejectReason}</Text>
                            </View>
                        )}
                        {item.ApprovedBy && (
                            <View style={[dm.row, { backgroundColor: colors.inputBg, borderRadius: BorderRadius.md }]}>
                                <Text style={[dm.rowLabel, { color: colors.textMuted }]}>Người duyệt</Text>
                                <Text style={[dm.rowValue, { color: colors.textPrimary }]}>{item.ApprovedBy.name || item.ApprovedBy.email}</Text>
                            </View>
                        )}
                        {!!item.approvedAt && (
                            <View style={[dm.row, { backgroundColor: colors.inputBg, borderRadius: BorderRadius.md }]}>
                                <Text style={[dm.rowLabel, { color: colors.textMuted }]}>Ngày duyệt</Text>
                                <Text style={[dm.rowValue, { color: colors.textSecondary }]}>{fmtDate(item.approvedAt)}</Text>
                            </View>
                        )}
                        <View style={[dm.row, { backgroundColor: colors.inputBg, borderRadius: BorderRadius.md }]}>
                            <Text style={[dm.rowLabel, { color: colors.textMuted }]}>Ngày tạo</Text>
                            <Text style={[dm.rowValue, { color: colors.textSecondary }]}>{fmtDate(item.createdAt)}</Text>
                        </View>
                        {isPending && isAdmin && (
                            <View style={dm.actions}>
                                <Pressable style={[dm.actionBtn, { backgroundColor: '#10B981' }]} onPress={handleApprove} disabled={actionLoading}>
                                    {actionLoading ? <ActivityIndicator size="small" color="#FFF" /> : <><Check size={16} color="#FFF" /><Text style={dm.actionBtnText}>Duyệt</Text></>}
                                </Pressable>
                                <Pressable style={[dm.actionBtn, { backgroundColor: '#EF4444' }]} onPress={() => { onClose(); onReject(item.id); }} disabled={actionLoading}>
                                    <XCircle size={16} color="#FFF" />
                                    <Text style={dm.actionBtnText}>Từ chối</Text>
                                </Pressable>
                            </View>
                        )}
                        {isPending && isUserOrManager && isOwner && (
                            <View style={dm.actions}>
                                <Pressable style={[dm.actionBtn, { backgroundColor: '#94A3B8' }]} onPress={handleCancel} disabled={actionLoading}>
                                    {actionLoading ? <ActivityIndicator size="small" color="#FFF" /> : <><Ban size={16} color="#FFF" /><Text style={dm.actionBtnText}>Hủy đơn</Text></>}
                                </Pressable>
                                <Pressable style={[dm.actionBtn, { backgroundColor: 'rgba(239,68,68,0.10)', borderWidth: 1, borderColor: '#EF4444' }]} onPress={() => { onClose(); onDelete(item.id); }} disabled={actionLoading}>
                                    <Trash2 size={16} color="#EF4444" />
                                    <Text style={[dm.actionBtnText, { color: '#EF4444' }]}>Xóa đơn</Text>
                                </Pressable>
                            </View>
                        )}
                        <View style={{ height: 32 }} />
                    </ScrollView>
                </Animated.View>
            </View>
        </Modal>
    );
}

const dm = StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'flex-end' },
    sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '88%', paddingTop: 12 },
    handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(0,0,0,0.15)', alignSelf: 'center', marginBottom: 12 },
    header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.xl, paddingBottom: Spacing.md, borderBottomWidth: 1 },
    title: { fontSize: FontSizes.base, fontWeight: FontWeights.bold },
    sub: { fontSize: FontSizes.xs, marginTop: 2 },
    closeBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    body: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, gap: Spacing.sm },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: 10 },
    rowLabel: { fontSize: FontSizes.sm },
    rowValue: { fontSize: FontSizes.sm, fontWeight: FontWeights.medium, textAlign: 'right', flex: 1, marginLeft: Spacing.md },
    block: { paddingHorizontal: Spacing.md, paddingVertical: 10, gap: 4 },
    blockText: { fontSize: FontSizes.sm, lineHeight: 20 },
    actions: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm },
    actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: BorderRadius.lg },
    actionBtnText: { color: '#FFF', fontSize: FontSizes.sm, fontWeight: FontWeights.semibold },
});

// --- RejectModal ---

function RejectModal({ visible, onClose, onConfirm }: {
    visible: boolean;
    onClose: () => void;
    onConfirm: (reason: string) => Promise<void>;
}) {
    const colors = ThemeColors.light;
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);

    const handleConfirm = async () => {
        if (!reason.trim()) return;
        setLoading(true);
        try { await onConfirm(reason.trim()); setReason(''); onClose(); }
        finally { setLoading(false); }
    };

    return (
        <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <View style={rm.overlay}>
                    <BlurView intensity={30} tint="light" style={StyleSheet.absoluteFill} />
                    <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
                    <Animated.View entering={FadeInDown.duration(300)} style={[rm.card, { backgroundColor: colors.cardBg }]}>
                        <Text style={[rm.title, { color: colors.textPrimary }]}>Lý do từ chối</Text>
                        <TextInput
                            style={[rm.input, { backgroundColor: colors.inputBg, color: colors.textPrimary, borderColor: colors.cardBorder }]}
                            placeholder="Nhập lý do từ chối..."
                            placeholderTextColor={colors.textMuted}
                            value={reason}
                            onChangeText={setReason}
                            multiline
                            numberOfLines={3}
                            textAlignVertical="top"
                        />
                        <View style={rm.btns}>
                            <Pressable style={[rm.btn, { backgroundColor: colors.inputBg }]} onPress={onClose}>
                                <Text style={[rm.btnText, { color: colors.textSecondary }]}>Hủy</Text>
                            </Pressable>
                            <Pressable
                                style={[rm.btn, { backgroundColor: reason.trim() ? '#EF4444' : '#EF444466' }]}
                                onPress={handleConfirm}
                                disabled={!reason.trim() || loading}
                            >
                                {loading ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={[rm.btnText, { color: '#FFF' }]}>Xác nhận</Text>}
                            </Pressable>
                        </View>
                    </Animated.View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const rm = StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
    card: { width: '100%', borderRadius: BorderRadius.xl, padding: Spacing.xl, gap: Spacing.md },
    title: { fontSize: FontSizes.base, fontWeight: FontWeights.bold },
    input: { borderWidth: 1, borderRadius: BorderRadius.md, padding: Spacing.md, fontSize: FontSizes.sm, minHeight: 80 },
    btns: { flexDirection: 'row', gap: Spacing.md },
    btn: { flex: 1, paddingVertical: 12, borderRadius: BorderRadius.lg, alignItems: 'center', justifyContent: 'center' },
    btnText: { fontSize: FontSizes.sm, fontWeight: FontWeights.semibold },
});

// --- CreateFormModal ---

interface CreateFormProps {
    visible: boolean;
    onClose: () => void;
    onSave: (dto: CreateResignationRequestDto) => Promise<void>;
    currentEmployeeId?: string;
}

function CreateFormModal({ visible, onClose, onSave, currentEmployeeId }: CreateFormProps) {
    const colors = ThemeColors.light;
    const [lastWorkingDate, setLastWorkingDate] = useState('');
    const [reason, setReason] = useState('');
    const [note, setNote] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const reset = () => { setLastWorkingDate(''); setReason(''); setNote(''); setError(''); };
    const handleClose = () => { reset(); onClose(); };

    const handleSave = async () => {
        if (!lastWorkingDate) { setError('Vui lòng chọn ngày làm việc cuối'); return; }
        const isoDate = toIso(lastWorkingDate);
        if (!isoDate) { setError('Ngày không hợp lệ (DD/MM/YYYY)'); return; }
        const today = new Date(); today.setHours(0,0,0,0);
        const lwd = new Date(isoDate);
        if (lwd <= today) { setError('Ngày làm việc cuối phải sau ngày hiện tại'); return; }
        if (!reason.trim()) { setError('Vui lòng nhập lý do nghỉ việc'); return; }
        if (!currentEmployeeId) { setError('Không tìm thấy thông tin nhân viên'); return; }
        setError('');
        setLoading(true);
        try {
            await onSave({ employeeId: currentEmployeeId, lastWorkingDate: isoDate, reason: reason.trim(), note: note.trim() || undefined });
            reset(); onClose();
        } catch (e: any) {
            setError(e?.response?.data?.message || 'Không thể tạo đơn');
        } finally { setLoading(false); }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <View style={cf.overlay}>
                    <BlurView intensity={40} tint="light" style={StyleSheet.absoluteFill} />
                    <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
                    <Animated.View entering={FadeInUp.duration(350).springify().damping(18)} style={[cf.sheet, { backgroundColor: colors.cardBg }]}>
                        <View style={cf.handle} />
                        <View style={[cf.header, { borderBottomColor: colors.divider }]}>
                            <Text style={[cf.title, { color: colors.textPrimary }]}>Tạo đơn nghỉ việc</Text>
                            <Pressable onPress={handleClose} style={[cf.closeBtn, { backgroundColor: colors.inputBg }]}>
                                <X size={18} color={colors.textSecondary} />
                            </Pressable>
                        </View>
                        <ScrollView contentContainerStyle={cf.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                            <View style={cf.field}>
                                <Text style={[cf.label, { color: colors.textSecondary }]}>Ngày làm việc cuối *</Text>
                                <TextInput
                                    style={[cf.input, { backgroundColor: colors.inputBg, color: colors.textPrimary, borderColor: colors.cardBorder }]}
                                    placeholder="DD/MM/YYYY"
                                    placeholderTextColor={colors.textMuted}
                                    value={lastWorkingDate}
                                    onChangeText={setLastWorkingDate}
                                    keyboardType="numeric"
                                    maxLength={10}
                                />
                            </View>
                            <View style={cf.field}>
                                <Text style={[cf.label, { color: colors.textSecondary }]}>Lý do nghỉ việc *</Text>
                                <TextInput
                                    style={[cf.input, cf.textarea, { backgroundColor: colors.inputBg, color: colors.textPrimary, borderColor: colors.cardBorder }]}
                                    placeholder="Nhập lý do xin nghỉ việc..."
                                    placeholderTextColor={colors.textMuted}
                                    value={reason}
                                    onChangeText={setReason}
                                    multiline
                                    numberOfLines={4}
                                    textAlignVertical="top"
                                />
                            </View>
                            <View style={cf.field}>
                                <Text style={[cf.label, { color: colors.textSecondary }]}>Ghi chú (tùy chọn)</Text>
                                <TextInput
                                    style={[cf.input, { backgroundColor: colors.inputBg, color: colors.textPrimary, borderColor: colors.cardBorder }]}
                                    placeholder="Ghi chú thêm..."
                                    placeholderTextColor={colors.textMuted}
                                    value={note}
                                    onChangeText={setNote}
                                />
                            </View>
                            {!!error && (
                                <View style={cf.errorWrap}>
                                    <AlertCircle size={14} color="#EF4444" />
                                    <Text style={cf.errorText}>{error}</Text>
                                </View>
                            )}
                            <Pressable style={[cf.submitBtn, { opacity: loading ? 0.7 : 1 }]} onPress={handleSave} disabled={loading}>
                                <LinearGradient colors={['#6366F1', '#818CF8']} style={cf.submitGradient}>
                                    {loading ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={cf.submitText}>Tạo đơn</Text>}
                                </LinearGradient>
                            </Pressable>
                            <View style={{ height: 32 }} />
                        </ScrollView>
                    </Animated.View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const cf = StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'flex-end' },
    sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '88%', paddingTop: 12 },
    handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(0,0,0,0.15)', alignSelf: 'center', marginBottom: 12 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.xl, paddingBottom: Spacing.md, borderBottomWidth: 1 },
    title: { fontSize: FontSizes.base, fontWeight: FontWeights.bold },
    closeBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    body: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, gap: Spacing.sm },
    field: { gap: 6 },
    label: { fontSize: FontSizes.xs, fontWeight: FontWeights.medium },
    input: { borderWidth: 1, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: 10, fontSize: FontSizes.sm },
    textarea: { minHeight: 88, textAlignVertical: 'top' },
    errorWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(239,68,68,0.08)', padding: Spacing.md, borderRadius: BorderRadius.md },
    errorText: { color: '#EF4444', fontSize: FontSizes.xs, flex: 1 },
    submitBtn: { marginTop: Spacing.sm },
    submitGradient: { paddingVertical: 14, borderRadius: BorderRadius.lg, alignItems: 'center', justifyContent: 'center' },
    submitText: { color: '#FFF', fontSize: FontSizes.base, fontWeight: FontWeights.semibold },
});

// --- Main Screen ---

export default function ResignationRequestScreen() {
    const router = useRouter();
    const { user } = useAuthStore();
    const colors = ThemeColors.light;

    const isAdmin = user?.role === 'ADMIN';
    const isUserOrManager = user?.role === 'USER' || user?.role === 'MANAGER';
    const isManager = user?.role === 'MANAGER';
    const currentEmployeeId = user?.employeeId;

    const [requests, setRequests] = useState<ResignationRequest[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Manager tab: 'mine' | 'team'
    const [managerTab, setManagerTab] = useState<'mine' | 'team'>('mine');

    // Filters
    const [statusFilter, setStatusFilter] = useState<ResignationRequestStatus | ''>('');
    const [teamFilter, setTeamFilter] = useState('');
    const [search, setSearch] = useState('');

    // Modals
    const [selectedItem, setSelectedItem] = useState<ResignationRequest | null>(null);
    const [detailVisible, setDetailVisible] = useState(false);
    const [rejectId, setRejectId] = useState<string | null>(null);
    const [createVisible, setCreateVisible] = useState(false);

    // Toast
    const [toastMsg, setToastMsg] = useState('');
    const showToast = (msg: string) => { setToastMsg(msg); setTimeout(() => setToastMsg(''), 3000); };

    const load = useCallback(async (showLoader = true) => {
        if (showLoader) setLoading(true);
        try {
            const filters: any = { limit: 0 };
            if (isAdmin) {
                // Admin sees all
                if (statusFilter) filters.status = statusFilter;
                if (teamFilter) filters.teamId = teamFilter;
            } else if (isManager) {
                if (managerTab === 'mine') {
                    if (currentEmployeeId) filters.employeeId = currentEmployeeId;
                } else {
                    // team tab — filter by teamId if selected, else no filter (backend returns team's requests)
                    if (teamFilter) filters.teamId = teamFilter;
                }
                if (statusFilter) filters.status = statusFilter;
            } else {
                // USER: own requests only
                if (currentEmployeeId) filters.employeeId = currentEmployeeId;
                if (statusFilter) filters.status = statusFilter;
            }
            const res = await resignationRequestApi.getAll(filters);
            setRequests(res.data);
        } catch (e: any) {
            showToast(e?.response?.data?.message || 'Không thể tải danh sách đơn');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [isAdmin, isManager, currentEmployeeId, statusFilter, teamFilter, managerTab]);

    // Load teams for admin/manager
    useEffect(() => {
        if (isAdmin || isManager) {
            teamApi.getTeams().then(t => setTeams(Array.isArray(t) ? t : [])).catch(() => {});
        }
    }, [isAdmin, isManager]);

    useEffect(() => { load(); }, [load]);

    const onRefresh = useCallback(() => { setRefreshing(true); load(false); }, [load]);

    // Client-side search filter
    const filtered = useMemo(() => {
        if (!search.trim()) return requests;
        const q = search.trim().toLowerCase();
        return requests.filter(r =>
            r.Employee?.fullName?.toLowerCase().includes(q) ||
            r.Employee?.employeeCode?.toLowerCase().includes(q)
        );
    }, [requests, search]);

    const pendingCount = requests.filter(r => r.status === 'PENDING').length;
    const approvedCount = requests.filter(r => r.status === 'APPROVED').length;
    const rejectedCount = requests.filter(r => r.status === 'REJECTED').length;

    // Actions
    const handleApprove = async (id: string) => {
        try {
            await resignationRequestApi.approve(id, user!.id);
            load(false);
        } catch (e: any) {
            showToast(e?.response?.data?.message || 'Không thể duyệt đơn');
        }
    };

    const handleReject = (id: string) => { setRejectId(id); };

    const handleRejectConfirm = async (reason: string) => {
        if (!rejectId) return;
        try {
            await resignationRequestApi.reject(rejectId, user!.id, reason);
            setRejectId(null);
            load(false);
        } catch (e: any) {
            showToast(e?.response?.data?.message || 'Không thể từ chối đơn');
            throw e;
        }
    };

    const handleCancel = async (id: string) => {
        try {
            await resignationRequestApi.cancel(id, currentEmployeeId ?? user!.id);
            load(false);
        } catch (e: any) {
            showToast(e?.response?.data?.message || 'Không thể hủy đơn');
            throw e;
        }
    };

    const handleCreate = async (dto: CreateResignationRequestDto) => {
        await resignationRequestApi.create(dto);
        load(false);
    };

    const handleDelete = (id: string) => {
        Alert.alert(
            'Xác nhận xóa',
            'Hành động này không thể hoàn tác. Bạn có chắc muốn xóa đơn này không?',
            [
                { text: 'Hủy', style: 'cancel' },
                {
                    text: 'Xóa', style: 'destructive',
                    onPress: async () => {
                        try {
                            await resignationRequestApi.delete(id);
                            load(false);
                        } catch (e: any) {
                            showToast(e?.response?.data?.message || 'Không thể xóa đơn');
                        }
                    },
                },
            ]
        );
    };

    return (
        <View style={s.root}>
            <StatusBar style="dark" />
            <LinearGradient colors={colors.gradientColors} style={StyleSheet.absoluteFill} />
            <SafeAreaView style={s.safe} edges={['top']}>
                {/* Header */}
                <Animated.View entering={FadeInDown.duration(350)} style={s.header}>
                    <Pressable style={[s.headerBtn, { backgroundColor: colors.inputBg }]} onPress={() => router.canGoBack() ? router.back() : router.replace('/home')}>
                        <ChevronLeft size={22} color={colors.textSecondary} />
                    </Pressable>
                    <View style={{ flex: 1 }}>
                        <Text style={[s.headerTitle, { color: colors.textPrimary }]}>Đơn xin nghỉ việc</Text>
                        <Text style={[s.headerSub, { color: colors.textMuted }]}>{requests.length} đơn · {pendingCount} chờ duyệt</Text>
                    </View>
                </Animated.View>

                {/* Summary Cards */}
                <Animated.View entering={FadeInDown.duration(400).delay(40)} style={s.summaryRow}>
                    <View style={[s.summaryCard, { borderColor: 'rgba(245,158,11,0.3)' }]}>
                        <BlurView intensity={20} tint="light" style={StyleSheet.absoluteFill} />
                        <View style={[s.summaryInner, { backgroundColor: 'rgba(245,158,11,0.06)' }]}>
                            <LinearGradient colors={['#F59E0B', '#FCD34D']} style={s.summaryIcon}>
                                <Clock size={13} color="#FFF" />
                            </LinearGradient>
                            <Text style={[s.summaryCount, { color: '#F59E0B' }]}>{pendingCount}</Text>
                            <Text style={[s.summaryLabel, { color: colors.textMuted }]}>Chờ duyệt</Text>
                        </View>
                    </View>
                    <View style={[s.summaryCard, { borderColor: 'rgba(16,185,129,0.3)' }]}>
                        <BlurView intensity={20} tint="light" style={StyleSheet.absoluteFill} />
                        <View style={[s.summaryInner, { backgroundColor: 'rgba(16,185,129,0.06)' }]}>
                            <LinearGradient colors={['#10B981', '#34D399']} style={s.summaryIcon}>
                                <Check size={13} color="#FFF" />
                            </LinearGradient>
                            <Text style={[s.summaryCount, { color: '#10B981' }]}>{approvedCount}</Text>
                            <Text style={[s.summaryLabel, { color: colors.textMuted }]}>Đã duyệt</Text>
                        </View>
                    </View>
                    <View style={[s.summaryCard, { borderColor: 'rgba(239,68,68,0.3)' }]}>
                        <BlurView intensity={20} tint="light" style={StyleSheet.absoluteFill} />
                        <View style={[s.summaryInner, { backgroundColor: 'rgba(239,68,68,0.06)' }]}>
                            <LinearGradient colors={['#EF4444', '#F87171']} style={s.summaryIcon}>
                                <XCircle size={13} color="#FFF" />
                            </LinearGradient>
                            <Text style={[s.summaryCount, { color: '#EF4444' }]}>{rejectedCount}</Text>
                            <Text style={[s.summaryLabel, { color: colors.textMuted }]}>Từ chối</Text>
                        </View>
                    </View>
                </Animated.View>

                {/* Manager Tabs */}
                {isManager && (
                    <Animated.View entering={FadeInDown.duration(400).delay(50)} style={s.tabRow}>
                        <Pressable
                            style={[s.tab, managerTab === 'mine' && s.tabActive]}
                            onPress={() => setManagerTab('mine')}
                        >
                            <Text style={[s.tabText, { color: managerTab === 'mine' ? '#6366F1' : colors.textSecondary }]}>Của tôi</Text>
                        </Pressable>
                        <Pressable
                            style={[s.tab, managerTab === 'team' && s.tabActive]}
                            onPress={() => setManagerTab('team')}
                        >
                            <Text style={[s.tabText, { color: managerTab === 'team' ? '#6366F1' : colors.textSecondary }]}>Nhân viên</Text>
                        </Pressable>
                    </Animated.View>
                )}

                {/* Status Filter Chips */}
                <Animated.View entering={FadeInDown.duration(400).delay(60)}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterScroll} contentContainerStyle={s.filterContent}>
                        {STATUS_FILTERS.map(f => {
                            const isActive = statusFilter === f.key;
                            return (
                                <Pressable
                                    key={f.key}
                                    onPress={() => setStatusFilter(f.key)}
                                    style={[s.filterChip, isActive ? { backgroundColor: f.color + '18', borderColor: f.color } : { backgroundColor: colors.inputBg, borderColor: colors.cardBorder }]}
                                >
                                    <Text style={[s.filterChipText, { color: isActive ? f.color : colors.textSecondary }]}>{f.label}</Text>
                                </Pressable>
                            );
                        })}
                    </ScrollView>
                </Animated.View>

                {/* Team Filter (admin + manager team tab) */}
                {(isAdmin || (isManager && managerTab === 'team')) && teams.length > 0 && (
                    <Animated.View entering={FadeInDown.duration(400).delay(70)}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterScroll} contentContainerStyle={s.filterContent}>
                            <Pressable
                                onPress={() => setTeamFilter('')}
                                style={[s.filterChip, teamFilter === '' ? { backgroundColor: '#6366F118', borderColor: '#6366F1' } : { backgroundColor: colors.inputBg, borderColor: colors.cardBorder }]}
                            >
                                <Text style={[s.filterChipText, { color: teamFilter === '' ? '#6366F1' : colors.textSecondary }]}>Tất cả tổ</Text>
                            </Pressable>
                            {teams.map(team => {
                                const isActive = teamFilter === team.id;
                                return (
                                    <Pressable
                                        key={team.id}
                                        onPress={() => setTeamFilter(isActive ? '' : team.id)}
                                        style={[s.filterChip, isActive ? { backgroundColor: '#6366F118', borderColor: '#6366F1' } : { backgroundColor: colors.inputBg, borderColor: colors.cardBorder }]}
                                    >
                                        <Text style={[s.filterChipText, { color: isActive ? '#6366F1' : colors.textSecondary }]}>{team.name}</Text>
                                    </Pressable>
                                );
                            })}
                        </ScrollView>
                    </Animated.View>
                )}

                {/* Search (admin + manager) */}
                {(isAdmin || isManager) && (
                    <Animated.View entering={FadeInDown.duration(400).delay(80)} style={[s.searchWrap, { borderColor: colors.cardBorder }]}>
                        <BlurView intensity={20} tint="light" style={StyleSheet.absoluteFill} />
                        <View style={[s.searchInner, { backgroundColor: colors.cardBg }]}>
                            <Search size={15} color={colors.textMuted} />
                            <TextInput
                                style={[s.searchInput, { color: colors.textPrimary }]}
                                placeholder="Tìm tên nhân viên, mã..."
                                placeholderTextColor={colors.textMuted}
                                value={search}
                                onChangeText={setSearch}
                            />
                            {search.length > 0 && (
                                <Pressable onPress={() => setSearch('')} hitSlop={8}>
                                    <X size={14} color={colors.textMuted} />
                                </Pressable>
                            )}
                        </View>
                    </Animated.View>
                )}

                {/* List */}
                {loading ? (
                    <View style={s.loader}>
                        <ActivityIndicator size="large" color={colors.textAccent} />
                        <Text style={[s.loaderText, { color: colors.textMuted }]}>Đang tải...</Text>
                    </View>
                ) : (
                    <ScrollView
                        contentContainerStyle={s.list}
                        showsVerticalScrollIndicator={false}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textAccent} colors={[colors.textAccent]} />}
                    >
                        {filtered.length === 0 ? (
                            <Animated.View entering={FadeInUp.duration(400)} style={s.empty}>
                                <FileText size={44} color={colors.textMuted} strokeWidth={1.4} />
                                <Text style={[s.emptyTitle, { color: colors.textSecondary }]}>Không có đơn nào</Text>
                                <Text style={[s.emptySub, { color: colors.textMuted }]}>
                                    {search || statusFilter ? 'Thử thay đổi bộ lọc' : 'Chưa có đơn xin nghỉ việc'}
                                </Text>
                            </Animated.View>
                        ) : (
                            <View style={s.gap}>
                                {filtered.map((item, i) => (
                                    <ResignRow
                                        key={item.id}
                                        item={item}
                                        index={i}
                                        onPress={() => { setSelectedItem(item); setDetailVisible(true); }}
                                    />
                                ))}
                            </View>
                        )}
                        <View style={{ height: 120 }} />
                    </ScrollView>
                )}

                {/* FAB — USER and MANAGER only */}
                {isUserOrManager && (
                    <Pressable style={s.fab} onPress={() => setCreateVisible(true)} disabled={refreshing}>
                        <LinearGradient colors={['#6366F1', '#818CF8']} style={s.fabGradient}>
                            <Plus size={26} color="#FFF" />
                        </LinearGradient>
                    </Pressable>
                )}

                {/* Toast */}
                {!!toastMsg && (
                    <Animated.View entering={FadeInDown.duration(300)} style={s.toast}>
                        <AlertCircle size={14} color="#FFF" />
                        <Text style={s.toastText}>{toastMsg}</Text>
                    </Animated.View>
                )}
            </SafeAreaView>

            {/* Detail Modal */}
            <DetailModal
                item={selectedItem}
                visible={detailVisible}
                onClose={() => { setDetailVisible(false); setSelectedItem(null); }}
                isAdmin={isAdmin}
                isUserOrManager={isUserOrManager}
                currentEmployeeId={currentEmployeeId}
                onApprove={handleApprove}
                onReject={handleReject}
                onCancel={handleCancel}
                onDelete={handleDelete}
            />

            {/* Reject Modal */}
            <RejectModal
                visible={!!rejectId}
                onClose={() => setRejectId(null)}
                onConfirm={handleRejectConfirm}
            />

            {/* Create Form Modal */}
            <CreateFormModal
                visible={createVisible}
                onClose={() => setCreateVisible(false)}
                onSave={handleCreate}
                currentEmployeeId={currentEmployeeId}
            />
        </View>
    );
}

// --- Styles ---

const s = StyleSheet.create({
    root: { flex: 1 },
    safe: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
    headerBtn: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: FontSizes.xl, fontWeight: FontWeights.bold },
    headerSub: { fontSize: FontSizes.xs, marginTop: 2 },
    summaryRow: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.xl, marginBottom: Spacing.sm },
    summaryCard: { flex: 1, borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1 },
    summaryInner: { padding: Spacing.sm, alignItems: 'center', gap: 4 },
    summaryIcon: { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginBottom: 2 },
    summaryCount: { fontSize: FontSizes.xl, fontWeight: FontWeights.bold, lineHeight: 26 },
    summaryLabel: { fontSize: 10, fontWeight: FontWeights.medium, textAlign: 'center' },
    tabRow: { flexDirection: 'row', marginHorizontal: Spacing.xl, marginBottom: Spacing.sm, backgroundColor: 'rgba(99,102,241,0.06)', borderRadius: BorderRadius.lg, padding: 3 },
    tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: BorderRadius.md },
    tabActive: { backgroundColor: '#FFF', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
    tabText: { fontSize: FontSizes.sm, fontWeight: FontWeights.semibold },
    filterScroll: { marginBottom: Spacing.xs },
    filterContent: { paddingHorizontal: Spacing.xl, gap: Spacing.sm, flexDirection: 'row' },
    filterChip: { paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: BorderRadius.full, borderWidth: 1 },
    filterChipText: { fontSize: FontSizes.xs, fontWeight: FontWeights.medium },
    searchWrap: { marginHorizontal: Spacing.xl, marginBottom: Spacing.sm, borderRadius: 14, overflow: 'hidden', borderWidth: 1 },
    searchInner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: 10 },
    searchInput: { flex: 1, fontSize: FontSizes.sm, padding: 0 },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.md },
    loaderText: { fontSize: FontSizes.sm },
    list: { paddingHorizontal: Spacing.xl },
    gap: { gap: Spacing.md },
    empty: { alignItems: 'center', paddingTop: 60, gap: Spacing.md },
    emptyTitle: { fontSize: FontSizes.base, fontWeight: FontWeights.semibold },
    emptySub: { fontSize: FontSizes.sm, textAlign: 'center' },
    fab: { position: 'absolute', bottom: 28, right: 24 },
    fabGradient: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', shadowColor: '#6366F1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 8 },
    toast: { position: 'absolute', bottom: 100, left: Spacing.xl, right: Spacing.xl, backgroundColor: 'rgba(30,30,30,0.88)', borderRadius: BorderRadius.lg, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingVertical: 12 },
    toastText: { color: '#FFF', fontSize: FontSizes.sm, flex: 1 },
});
