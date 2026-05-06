// Leave Request Screen — Đơn xin nghỉ phép
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
    CalendarDays, Clock, FileText, User, ChevronDown,
    AlertCircle, Ban, Pencil, Trash2,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';

import {
    leaveRequestApi, LeaveRequest, LEAVE_TYPE_LABELS, LEAVE_STATUS_CONFIG,
    LeaveRequestStatus, LeaveType, CreateLeaveRequestDto,
} from '@/lib/leave-request-api';
import { teamApi, Team } from '@/lib/team-api';
import { employeeApi, Employee } from '@/lib/employee-api';
import { useAuthStore } from '@/store';
import { Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants/Tokens';
import { ThemeColors } from '@/constants/ThemeColors';

// ─── Constants ────────────────────────────────────────────────

const STATUS_FILTERS: { key: LeaveRequestStatus | ''; label: string; color: string }[] = [
    { key: '',           label: 'Tất cả',    color: '#6366F1' },
    { key: 'PENDING',    label: 'Chờ duyệt', color: '#F59E0B' },
    { key: 'APPROVED',   label: 'Đã duyệt',  color: '#10B981' },
    { key: 'REJECTED',   label: 'Từ chối',   color: '#EF4444' },
    { key: 'CANCELLED',  label: 'Đã hủy',    color: '#94A3B8' },
];

const LEAVE_TYPES: LeaveType[] = ['ANNUAL', 'SICK', 'PERSONAL', 'UNPAID', 'MATERNITY', 'OTHER'];

function parseDMY(str: string): Date | null {
    const parts = str.split('/');
    if (parts.length !== 3) return null;
    const [d, m, y] = parts.map(Number);
    if (!d || !m || !y || y < 2000) return null;
    const date = new Date(y, m - 1, d);
    if (isNaN(date.getTime())) return null;
    return date;
}

function fmtDate(iso: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function calcDays(start: string, end: string): number {
    const s = parseDMY(start);
    const e = parseDMY(end);
    if (!s || !e) return 0;
    const diff = Math.round((e.getTime() - s.getTime()) / 86400000) + 1;
    return diff > 0 ? diff : 0;
}

function toIso(dmy: string): string {
    const d = parseDMY(dmy);
    if (!d) return '';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ─── Status Badge ─────────────────────────────────────────────

function StatusBadge({ status }: { status: LeaveRequestStatus }) {
    const cfg = LEAVE_STATUS_CONFIG[status];
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

// ─── Leave Request Row ────────────────────────────────────────

function LeaveRow({ item, index, onPress }: {
    item: LeaveRequest; index: number; onPress: () => void;
}) {
    const colors = ThemeColors.light;
    const cfg = LEAVE_STATUS_CONFIG[item.status];
    const emp = item.Employee;
    return (
        <Animated.View entering={FadeInUp.duration(300).delay(index * 30).springify().damping(18)}>
            <Pressable
                style={({ pressed }) => [lr.card, { borderColor: colors.cardBorder }, pressed && { opacity: 0.88 }]}
                onPress={onPress}
            >
                <BlurView intensity={18} tint="light" style={StyleSheet.absoluteFill} />
                <View style={[lr.inner, { backgroundColor: colors.cardBg }]}>
                    {/* Top row: name + status */}
                    <View style={lr.topRow}>
                        <View style={lr.nameWrap}>
                            <Text style={[lr.name, { color: colors.textPrimary }]} numberOfLines={1}>
                                {emp?.fullName ?? '—'}
                            </Text>
                            <Text style={[lr.meta, { color: colors.textMuted }]}>
                                {[emp?.employeeCode, emp?.Team?.name].filter(Boolean).join(' · ')}
                            </Text>
                        </View>
                        <StatusBadge status={item.status} />
                    </View>

                    {/* Leave type + days */}
                    <View style={lr.midRow}>
                        <View style={[lr.typePill, { backgroundColor: cfg.bg }]}>
                            <FileText size={11} color={cfg.color} />
                            <Text style={[lr.typeText, { color: cfg.color }]}>
                                {LEAVE_TYPE_LABELS[item.leaveType]}
                            </Text>
                        </View>
                        <View style={lr.dateWrap}>
                            <CalendarDays size={12} color={colors.textMuted} />
                            <Text style={[lr.dateText, { color: colors.textSecondary }]}>
                                {fmtDate(item.startDate)} → {fmtDate(item.endDate)}
                            </Text>
                            <View style={[lr.daysBadge, { backgroundColor: colors.inputBg }]}>
                                <Text style={[lr.daysText, { color: colors.textAccent }]}>{item.totalDays}d</Text>
                            </View>
                        </View>
                    </View>

                    {/* Reason */}
                    {!!item.reason && (
                        <Text style={[lr.reason, { color: colors.textMuted }]} numberOfLines={1}>
                            {item.reason}
                        </Text>
                    )}
                </View>
            </Pressable>
        </Animated.View>
    );
}

const lr = StyleSheet.create({
    card: { borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1 },
    inner: { padding: Spacing.md, gap: 8 },
    topRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
    nameWrap: { flex: 1 },
    name: { fontSize: FontSizes.sm, fontWeight: FontWeights.semibold },
    meta: { fontSize: FontSizes.xs, marginTop: 2 },
    midRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexWrap: 'wrap' },
    typePill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: BorderRadius.full },
    typeText: { fontSize: 11, fontWeight: FontWeights.medium },
    dateWrap: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
    dateText: { fontSize: FontSizes.xs, flex: 1 },
    daysBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
    daysText: { fontSize: 11, fontWeight: FontWeights.bold },
    reason: { fontSize: FontSizes.xs, fontStyle: 'italic' },
});

// ─── Detail Modal ─────────────────────────────────────────────

interface DetailModalProps {
    item: LeaveRequest | null;
    visible: boolean;
    onClose: () => void;
    isAdminOrManager: boolean;
    currentUserId: string;
    currentEmployeeId?: string;
    onApprove: (id: string) => Promise<void>;
    onReject: (id: string) => void;
    onCancel: (id: string) => Promise<void>;
    onEdit: (item: LeaveRequest) => void;
    onDelete: (id: string) => void;
}

function DetailModal({
    item, visible, onClose,
    isAdminOrManager, currentUserId, currentEmployeeId,
    onApprove, onReject, onCancel, onEdit, onDelete,
}: DetailModalProps) {
    const colors = ThemeColors.light;
    const [actionLoading, setActionLoading] = useState(false);

    if (!item) return null;

    const cfg = LEAVE_STATUS_CONFIG[item.status];
    const emp = item.Employee;
    const isPending = item.status === 'PENDING';
    const isOwner = item.employeeId === currentEmployeeId;

    const handleApprove = async () => {
        setActionLoading(true);
        try { await onApprove(item.id); onClose(); }
        finally { setActionLoading(false); }
    };

    const handleCancel = async () => {
        setActionLoading(true);
        try { await onCancel(item.id); onClose(); }
        finally { setActionLoading(false); }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <View style={dm.overlay}>
                <BlurView intensity={40} tint="light" style={StyleSheet.absoluteFill} />
                <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

                <Animated.View entering={FadeInUp.duration(350).springify().damping(18)} style={[dm.sheet, { backgroundColor: colors.cardBg }]}>
                    <View style={dm.handle} />

                    {/* Header */}
                    <View style={[dm.header, { borderBottomColor: colors.divider }]}>
                        <View style={{ flex: 1 }}>
                            <Text style={[dm.title, { color: colors.textPrimary }]}>Chi tiết đơn nghỉ phép</Text>
                            <Text style={[dm.sub, { color: colors.textMuted }]}>
                                {emp?.fullName ?? '—'} · {emp?.employeeCode ?? ''}
                            </Text>
                        </View>
                        <Pressable onPress={onClose} style={[dm.closeBtn, { backgroundColor: colors.inputBg }]}>
                            <X size={18} color={colors.textSecondary} />
                        </Pressable>
                    </View>

                    <ScrollView contentContainerStyle={dm.body} showsVerticalScrollIndicator={false}>
                        {/* Status */}
                        <View style={[dm.row, { backgroundColor: cfg.bg, borderRadius: BorderRadius.md }]}>
                            <Text style={[dm.rowLabel, { color: cfg.color }]}>Trạng thái</Text>
                            <Text style={[dm.rowValue, { color: cfg.color, fontWeight: FontWeights.bold }]}>{cfg.label}</Text>
                        </View>

                        {/* Employee info */}
                        {emp?.Team?.name && (
                            <View style={[dm.row, { backgroundColor: colors.inputBg, borderRadius: BorderRadius.md }]}>
                                <Text style={[dm.rowLabel, { color: colors.textMuted }]}>Tổ</Text>
                                <Text style={[dm.rowValue, { color: colors.textPrimary }]}>{emp.Team.name}</Text>
                            </View>
                        )}

                        {/* Leave type */}
                        <View style={[dm.row, { backgroundColor: colors.inputBg, borderRadius: BorderRadius.md }]}>
                            <Text style={[dm.rowLabel, { color: colors.textMuted }]}>Loại nghỉ</Text>
                            <Text style={[dm.rowValue, { color: colors.textPrimary }]}>{LEAVE_TYPE_LABELS[item.leaveType]}</Text>
                        </View>

                        {/* Dates */}
                        <View style={[dm.row, { backgroundColor: colors.inputBg, borderRadius: BorderRadius.md }]}>
                            <Text style={[dm.rowLabel, { color: colors.textMuted }]}>Từ ngày</Text>
                            <Text style={[dm.rowValue, { color: colors.textPrimary }]}>{fmtDate(item.startDate)}</Text>
                        </View>
                        <View style={[dm.row, { backgroundColor: colors.inputBg, borderRadius: BorderRadius.md }]}>
                            <Text style={[dm.rowLabel, { color: colors.textMuted }]}>Đến ngày</Text>
                            <Text style={[dm.rowValue, { color: colors.textPrimary }]}>{fmtDate(item.endDate)}</Text>
                        </View>
                        <View style={[dm.row, { backgroundColor: colors.inputBg, borderRadius: BorderRadius.md }]}>
                            <Text style={[dm.rowLabel, { color: colors.textMuted }]}>Tổng ngày</Text>
                            <Text style={[dm.rowValue, { color: colors.textAccent, fontWeight: FontWeights.bold }]}>{item.totalDays} ngày</Text>
                        </View>

                        {/* Reason */}
                        <View style={[dm.block, { backgroundColor: colors.inputBg, borderRadius: BorderRadius.md }]}>
                            <Text style={[dm.rowLabel, { color: colors.textMuted }]}>Lý do</Text>
                            <Text style={[dm.blockText, { color: colors.textPrimary }]}>{item.reason || '—'}</Text>
                        </View>

                        {/* Note */}
                        {!!item.note && (
                            <View style={[dm.block, { backgroundColor: colors.inputBg, borderRadius: BorderRadius.md }]}>
                                <Text style={[dm.rowLabel, { color: colors.textMuted }]}>Ghi chú</Text>
                                <Text style={[dm.blockText, { color: colors.textPrimary }]}>{item.note}</Text>
                            </View>
                        )}

                        {/* Reject reason */}
                        {!!item.rejectReason && (
                            <View style={[dm.block, { backgroundColor: 'rgba(239,68,68,0.06)', borderRadius: BorderRadius.md }]}>
                                <Text style={[dm.rowLabel, { color: '#EF4444' }]}>Lý do từ chối</Text>
                                <Text style={[dm.blockText, { color: '#EF4444' }]}>{item.rejectReason}</Text>
                            </View>
                        )}

                        {/* Approved by */}
                        {item.ApprovedBy && (
                            <View style={[dm.row, { backgroundColor: colors.inputBg, borderRadius: BorderRadius.md }]}>
                                <Text style={[dm.rowLabel, { color: colors.textMuted }]}>Người duyệt</Text>
                                <Text style={[dm.rowValue, { color: colors.textPrimary }]}>
                                    {item.ApprovedBy.name || item.ApprovedBy.email}
                                </Text>
                            </View>
                        )}

                        {/* Created at */}
                        <View style={[dm.row, { backgroundColor: colors.inputBg, borderRadius: BorderRadius.md }]}>
                            <Text style={[dm.rowLabel, { color: colors.textMuted }]}>Ngày tạo</Text>
                            <Text style={[dm.rowValue, { color: colors.textSecondary }]}>{fmtDate(item.createdAt)}</Text>
                        </View>

                        {/* Action buttons */}
                        {isPending && (
                            <View style={dm.actions}>
                                {isAdminOrManager && (
                                    <>
                                        <Pressable
                                            style={[dm.actionBtn, { backgroundColor: '#10B981' }]}
                                            onPress={handleApprove}
                                            disabled={actionLoading}
                                        >
                                            {actionLoading
                                                ? <ActivityIndicator size="small" color="#FFF" />
                                                : <><Check size={16} color="#FFF" /><Text style={dm.actionBtnText}>Duyệt</Text></>
                                            }
                                        </Pressable>
                                        <Pressable
                                            style={[dm.actionBtn, { backgroundColor: '#EF4444' }]}
                                            onPress={() => { onClose(); onReject(item.id); }}
                                            disabled={actionLoading}
                                        >
                                            <XCircle size={16} color="#FFF" />
                                            <Text style={dm.actionBtnText}>Từ chối</Text>
                                        </Pressable>
                                    </>
                                )}
                                {!isAdminOrManager && isOwner && (
                                    <Pressable
                                        style={[dm.actionBtn, { backgroundColor: '#94A3B8' }]}
                                        onPress={handleCancel}
                                        disabled={actionLoading}
                                    >
                                        {actionLoading
                                            ? <ActivityIndicator size="small" color="#FFF" />
                                            : <><Ban size={16} color="#FFF" /><Text style={dm.actionBtnText}>Hủy đơn</Text></>
                                        }
                                    </Pressable>
                                )}
                            </View>
                        )}

                        {/* Edit + Delete buttons */}
                        {(isPending && (isOwner || isAdminOrManager)) || isAdminOrManager ? (
                            <View style={dm.actions}>
                                {isPending && (isOwner || isAdminOrManager) && (
                                    <Pressable
                                        style={[dm.actionBtn, { backgroundColor: 'rgba(99,102,241,0.12)', borderWidth: 1, borderColor: '#6366F1' }]}
                                        onPress={() => { onClose(); onEdit(item); }}
                                        disabled={actionLoading}
                                    >
                                        <Pencil size={16} color="#6366F1" />
                                        <Text style={[dm.actionBtnText, { color: '#6366F1' }]}>Sửa</Text>
                                    </Pressable>
                                )}
                                {isAdminOrManager && (
                                    <Pressable
                                        style={[dm.actionBtn, { backgroundColor: 'rgba(239,68,68,0.10)', borderWidth: 1, borderColor: '#EF4444' }]}
                                        onPress={() => { onClose(); onDelete(item.id); }}
                                        disabled={actionLoading}
                                    >
                                        <Trash2 size={16} color="#EF4444" />
                                        <Text style={[dm.actionBtnText, { color: '#EF4444' }]}>Xóa</Text>
                                    </Pressable>
                                )}
                            </View>
                        ) : null}
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

// ─── Reject Modal ─────────────────────────────────────────────

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
                                {loading
                                    ? <ActivityIndicator size="small" color="#FFF" />
                                    : <Text style={[rm.btnText, { color: '#FFF' }]}>Xác nhận</Text>
                                }
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

// ─── Create Form Modal ────────────────────────────────────────

interface CreateFormProps {
    visible: boolean;
    onClose: () => void;
    onSave: (dto: CreateLeaveRequestDto) => Promise<void>;
    employees: Employee[];
    currentEmployeeId?: string;
    isAdminOrManager: boolean;
}

function CreateFormModal({ visible, onClose, onSave, employees, currentEmployeeId, isAdminOrManager }: CreateFormProps) {
    const colors = ThemeColors.light;
    const [empId, setEmpId] = useState(currentEmployeeId ?? '');
    // Sync empId when currentEmployeeId changes
    useEffect(() => { if (currentEmployeeId) setEmpId(currentEmployeeId); }, [currentEmployeeId]);
    const [leaveType, setLeaveType] = useState<LeaveType>('ANNUAL');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [totalDays, setTotalDays] = useState('');
    const [reason, setReason] = useState('');
    const [note, setNote] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showEmpPicker, setShowEmpPicker] = useState(false);
    const [showTypePicker, setShowTypePicker] = useState(false);

    // Auto-calc days when dates change
    useEffect(() => {
        if (startDate.length === 10 && endDate.length === 10) {
            const d = calcDays(startDate, endDate);
            if (d > 0) setTotalDays(String(d));
        }
    }, [startDate, endDate]);

    const reset = () => {
        setEmpId(currentEmployeeId ?? '');
        setLeaveType('ANNUAL');
        setStartDate(''); setEndDate('');
        setTotalDays(''); setReason(''); setNote('');
        setError('');
    };

    const handleClose = () => { reset(); onClose(); };

    const handleSave = async () => {
        if (!empId) { setError('Vui lòng chọn nhân viên'); return; }
        if (!startDate || !endDate) { setError('Vui lòng nhập ngày bắt đầu và kết thúc'); return; }
        const startIso = toIso(startDate);
        const endIso = toIso(endDate);
        if (!startIso || !endIso) { setError('Ngày không hợp lệ (DD/MM/YYYY)'); return; }
        if (!reason.trim()) { setError('Vui lòng nhập lý do'); return; }
        const days = totalDays ? Number(totalDays) : calcDays(startDate, endDate);
        if (!days || days <= 0) { setError('Số ngày không hợp lệ'); return; }

        setError('');
        setLoading(true);
        try {
            await onSave({
                employeeId: empId,
                leaveType,
                startDate: startIso,
                endDate: endIso,
                totalDays: days,
                reason: reason.trim(),
                note: note.trim() || undefined,
            });
            reset();
            onClose();
        } catch (e: any) {
            setError(e?.response?.data?.message || 'Không thể tạo đơn');
        } finally {
            setLoading(false);
        }
    };

    const selectedEmp = employees.find(e => e.id === empId);

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <View style={cf.overlay}>
                    <BlurView intensity={40} tint="light" style={StyleSheet.absoluteFill} />
                    <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />

                    <Animated.View entering={FadeInUp.duration(350).springify().damping(18)} style={[cf.sheet, { backgroundColor: colors.cardBg }]}>
                        <View style={cf.handle} />

                        {/* Header */}
                        <View style={[cf.header, { borderBottomColor: colors.divider }]}>
                            <Text style={[cf.title, { color: colors.textPrimary }]}>Tạo đơn nghỉ phép</Text>
                            <Pressable onPress={handleClose} style={[cf.closeBtn, { backgroundColor: colors.inputBg }]}>
                                <X size={18} color={colors.textSecondary} />
                            </Pressable>
                        </View>

                        <ScrollView contentContainerStyle={cf.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                            {/* Employee picker */}
                            {isAdminOrManager && (
                                <View style={cf.field}>
                                    <Text style={[cf.label, { color: colors.textSecondary }]}>Nhân viên *</Text>
                                    <Pressable
                                        style={[cf.picker, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder }]}
                                        onPress={() => setShowEmpPicker(true)}
                                    >
                                        <User size={15} color={colors.textMuted} />
                                        <Text style={[cf.pickerText, { color: selectedEmp ? colors.textPrimary : colors.textMuted }]} numberOfLines={1}>
                                            {selectedEmp ? `${selectedEmp.fullName} (${selectedEmp.employeeCode})` : 'Chọn nhân viên...'}
                                        </Text>
                                        <ChevronDown size={15} color={colors.textMuted} />
                                    </Pressable>
                                </View>
                            )}

                            {/* Leave type picker */}
                            <View style={cf.field}>
                                <Text style={[cf.label, { color: colors.textSecondary }]}>Loại nghỉ *</Text>
                                <Pressable
                                    style={[cf.picker, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder }]}
                                    onPress={() => setShowTypePicker(true)}
                                >
                                    <FileText size={15} color={colors.textMuted} />
                                    <Text style={[cf.pickerText, { color: colors.textPrimary }]}>
                                        {LEAVE_TYPE_LABELS[leaveType]}
                                    </Text>
                                    <ChevronDown size={15} color={colors.textMuted} />
                                </Pressable>
                            </View>

                            {/* Dates */}
                            <View style={cf.row2}>
                                <View style={[cf.field, { flex: 1 }]}>
                                    <Text style={[cf.label, { color: colors.textSecondary }]}>Từ ngày *</Text>
                                    <TextInput
                                        style={[cf.input, { backgroundColor: colors.inputBg, color: colors.textPrimary, borderColor: colors.cardBorder }]}
                                        placeholder="DD/MM/YYYY"
                                        placeholderTextColor={colors.textMuted}
                                        value={startDate}
                                        onChangeText={setStartDate}
                                        keyboardType="numeric"
                                        maxLength={10}
                                    />
                                </View>
                                <View style={[cf.field, { flex: 1 }]}>
                                    <Text style={[cf.label, { color: colors.textSecondary }]}>Đến ngày *</Text>
                                    <TextInput
                                        style={[cf.input, { backgroundColor: colors.inputBg, color: colors.textPrimary, borderColor: colors.cardBorder }]}
                                        placeholder="DD/MM/YYYY"
                                        placeholderTextColor={colors.textMuted}
                                        value={endDate}
                                        onChangeText={setEndDate}
                                        keyboardType="numeric"
                                        maxLength={10}
                                    />
                                </View>
                            </View>

                            {/* Total days */}
                            <View style={cf.field}>
                                <Text style={[cf.label, { color: colors.textSecondary }]}>Số ngày</Text>
                                <TextInput
                                    style={[cf.input, { backgroundColor: colors.inputBg, color: colors.textPrimary, borderColor: colors.cardBorder }]}
                                    placeholder="Tự tính từ ngày bắt đầu/kết thúc"
                                    placeholderTextColor={colors.textMuted}
                                    value={totalDays}
                                    onChangeText={setTotalDays}
                                    keyboardType="numeric"
                                />
                            </View>

                            {/* Reason */}
                            <View style={cf.field}>
                                <Text style={[cf.label, { color: colors.textSecondary }]}>Lý do *</Text>
                                <TextInput
                                    style={[cf.input, cf.textarea, { backgroundColor: colors.inputBg, color: colors.textPrimary, borderColor: colors.cardBorder }]}
                                    placeholder="Nhập lý do xin nghỉ..."
                                    placeholderTextColor={colors.textMuted}
                                    value={reason}
                                    onChangeText={setReason}
                                    multiline
                                    numberOfLines={3}
                                    textAlignVertical="top"
                                />
                            </View>

                            {/* Note */}
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

                            {/* Error */}
                            {!!error && (
                                <View style={cf.errorWrap}>
                                    <AlertCircle size={14} color="#EF4444" />
                                    <Text style={cf.errorText}>{error}</Text>
                                </View>
                            )}

                            {/* Submit */}
                            <Pressable
                                style={[cf.submitBtn, { opacity: loading ? 0.7 : 1 }]}
                                onPress={handleSave}
                                disabled={loading}
                            >
                                <LinearGradient colors={['#6366F1', '#818CF8']} style={cf.submitGradient}>
                                    {loading
                                        ? <ActivityIndicator size="small" color="#FFF" />
                                        : <Text style={cf.submitText}>Tạo đơn</Text>
                                    }
                                </LinearGradient>
                            </Pressable>
                            <View style={{ height: 32 }} />
                        </ScrollView>
                    </Animated.View>
                </View>
            </KeyboardAvoidingView>

            {/* Employee picker modal */}
            <Modal visible={showEmpPicker} animationType="slide" transparent onRequestClose={() => setShowEmpPicker(false)}>
                <View style={pk.overlay}>
                    <BlurView intensity={30} tint="light" style={StyleSheet.absoluteFill} />
                    <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowEmpPicker(false)} />
                    <View style={[pk.sheet, { backgroundColor: colors.cardBg }]}>
                        <View style={pk.handle} />
                        <Text style={[pk.title, { color: colors.textPrimary }]}>Chọn nhân viên</Text>
                        <ScrollView contentContainerStyle={pk.list} showsVerticalScrollIndicator={false}>
                            {employees.map(e => (
                                <Pressable
                                    key={e.id}
                                    style={[pk.item, empId === e.id && { backgroundColor: 'rgba(99,102,241,0.08)' }]}
                                    onPress={() => { setEmpId(e.id); setShowEmpPicker(false); }}
                                >
                                    <Text style={[pk.itemName, { color: colors.textPrimary }]}>{e.fullName}</Text>
                                    <Text style={[pk.itemMeta, { color: colors.textMuted }]}>
                                        {[e.employeeCode, e.Team?.name].filter(Boolean).join(' · ')}
                                    </Text>
                                    {empId === e.id && <Check size={16} color="#6366F1" />}
                                </Pressable>
                            ))}
                            <View style={{ height: 40 }} />
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Leave type picker modal */}
            <Modal visible={showTypePicker} animationType="slide" transparent onRequestClose={() => setShowTypePicker(false)}>
                <View style={pk.overlay}>
                    <BlurView intensity={30} tint="light" style={StyleSheet.absoluteFill} />
                    <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowTypePicker(false)} />
                    <View style={[pk.sheet, { backgroundColor: colors.cardBg }]}>
                        <View style={pk.handle} />
                        <Text style={[pk.title, { color: colors.textPrimary }]}>Loại nghỉ phép</Text>
                        <ScrollView contentContainerStyle={pk.list} showsVerticalScrollIndicator={false}>
                            {LEAVE_TYPES.map(t => (
                                <Pressable
                                    key={t}
                                    style={[pk.item, leaveType === t && { backgroundColor: 'rgba(99,102,241,0.08)' }]}
                                    onPress={() => { setLeaveType(t); setShowTypePicker(false); }}
                                >
                                    <Text style={[pk.itemName, { color: colors.textPrimary }]}>{LEAVE_TYPE_LABELS[t]}</Text>
                                    {leaveType === t && <Check size={16} color="#6366F1" />}
                                </Pressable>
                            ))}
                            <View style={{ height: 40 }} />
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </Modal>
    );
}

const cf = StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'flex-end' },
    sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '92%', paddingTop: 12 },
    handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(0,0,0,0.15)', alignSelf: 'center', marginBottom: 12 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.xl, paddingBottom: Spacing.md, borderBottomWidth: 1 },
    title: { fontSize: FontSizes.base, fontWeight: FontWeights.bold },
    closeBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    body: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, gap: Spacing.sm },
    field: { gap: 6 },
    label: { fontSize: FontSizes.xs, fontWeight: FontWeights.medium },
    input: { borderWidth: 1, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: 10, fontSize: FontSizes.sm },
    textarea: { minHeight: 72, textAlignVertical: 'top' },
    picker: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, borderWidth: 1, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: 10 },
    pickerText: { flex: 1, fontSize: FontSizes.sm },
    row2: { flexDirection: 'row', gap: Spacing.md },
    errorWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(239,68,68,0.08)', padding: Spacing.md, borderRadius: BorderRadius.md },
    errorText: { color: '#EF4444', fontSize: FontSizes.xs, flex: 1 },
    submitBtn: { marginTop: Spacing.sm },
    submitGradient: { paddingVertical: 14, borderRadius: BorderRadius.lg, alignItems: 'center', justifyContent: 'center' },
    submitText: { color: '#FFF', fontSize: FontSizes.base, fontWeight: FontWeights.semibold },
});

const pk = StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'flex-end' },
    sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '70%', paddingTop: 12 },
    handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(0,0,0,0.15)', alignSelf: 'center', marginBottom: 8 },
    title: { fontSize: FontSizes.base, fontWeight: FontWeights.bold, paddingHorizontal: Spacing.xl, paddingBottom: Spacing.md },
    list: { paddingHorizontal: Spacing.xl },
    item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.sm, gap: Spacing.sm },
    itemName: { flex: 1, fontSize: FontSizes.sm, fontWeight: FontWeights.medium },
    itemMeta: { fontSize: FontSizes.xs },
});

// ─── Edit Form Modal ──────────────────────────────────────────

interface EditFormProps {
    item: LeaveRequest | null;
    visible: boolean;
    onClose: () => void;
    onSave: (id: string, dto: Partial<CreateLeaveRequestDto>) => Promise<void>;
}

function EditFormModal({ item, visible, onClose, onSave }: EditFormProps) {
    const colors = ThemeColors.light;
    const [leaveType, setLeaveType] = useState<LeaveType>('ANNUAL');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [totalDays, setTotalDays] = useState('');
    const [reason, setReason] = useState('');
    const [note, setNote] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showTypePicker, setShowTypePicker] = useState(false);

    // Pre-fill when item changes
    useEffect(() => {
        if (item) {
            setLeaveType(item.leaveType);
            setStartDate(fmtDate(item.startDate));
            setEndDate(fmtDate(item.endDate));
            setTotalDays(String(item.totalDays));
            setReason(item.reason);
            setNote(item.note || '');
            setError('');
        }
    }, [item]);

    // Auto-calc days when dates change
    useEffect(() => {
        if (startDate.length === 10 && endDate.length === 10) {
            const d = calcDays(startDate, endDate);
            if (d > 0) setTotalDays(String(d));
        }
    }, [startDate, endDate]);

    const reset = () => {
        setLeaveType('ANNUAL');
        setStartDate(''); setEndDate('');
        setTotalDays(''); setReason(''); setNote('');
        setError('');
    };

    const handleClose = () => { reset(); onClose(); };

    const handleSave = async () => {
        if (!item) return;
        if (!startDate || !endDate) { setError('Vui lòng nhập ngày bắt đầu và kết thúc'); return; }
        const startIso = toIso(startDate);
        const endIso = toIso(endDate);
        if (!startIso || !endIso) { setError('Ngày không hợp lệ (DD/MM/YYYY)'); return; }
        if (!reason.trim()) { setError('Vui lòng nhập lý do'); return; }
        const days = totalDays ? Number(totalDays) : calcDays(startDate, endDate);
        if (!days || days <= 0) { setError('Số ngày không hợp lệ'); return; }

        setError('');
        setLoading(true);
        try {
            await onSave(item.id, {
                leaveType,
                startDate: startIso,
                endDate: endIso,
                totalDays: days,
                reason: reason.trim(),
                note: note.trim() || undefined,
            });
            reset();
            onClose();
        } catch (e: any) {
            setError(e?.response?.data?.message || 'Không thể cập nhật đơn');
        } finally {
            setLoading(false);
        }
    };

    if (!item) return null;

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <View style={cf.overlay}>
                    <BlurView intensity={40} tint="light" style={StyleSheet.absoluteFill} />
                    <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />

                    <Animated.View entering={FadeInUp.duration(350).springify().damping(18)} style={[cf.sheet, { backgroundColor: colors.cardBg }]}>
                        <View style={cf.handle} />

                        {/* Header */}
                        <View style={[cf.header, { borderBottomColor: colors.divider }]}>
                            <Text style={[cf.title, { color: colors.textPrimary }]}>Sửa đơn nghỉ phép</Text>
                            <Pressable onPress={handleClose} style={[cf.closeBtn, { backgroundColor: colors.inputBg }]}>
                                <X size={18} color={colors.textSecondary} />
                            </Pressable>
                        </View>

                        <ScrollView contentContainerStyle={cf.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                            {/* Employee info (read-only) */}
                            <View style={cf.field}>
                                <Text style={[cf.label, { color: colors.textSecondary }]}>Nhân viên</Text>
                                <View style={[cf.picker, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder, opacity: 0.6 }]}>
                                    <User size={15} color={colors.textMuted} />
                                    <Text style={[cf.pickerText, { color: colors.textPrimary }]} numberOfLines={1}>
                                        {item.Employee?.fullName ?? '—'} ({item.Employee?.employeeCode ?? ''})
                                    </Text>
                                </View>
                            </View>

                            {/* Leave type picker */}
                            <View style={cf.field}>
                                <Text style={[cf.label, { color: colors.textSecondary }]}>Loại nghỉ *</Text>
                                <Pressable
                                    style={[cf.picker, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder }]}
                                    onPress={() => setShowTypePicker(true)}
                                >
                                    <FileText size={15} color={colors.textMuted} />
                                    <Text style={[cf.pickerText, { color: colors.textPrimary }]}>
                                        {LEAVE_TYPE_LABELS[leaveType]}
                                    </Text>
                                    <ChevronDown size={15} color={colors.textMuted} />
                                </Pressable>
                            </View>

                            {/* Dates */}
                            <View style={cf.row2}>
                                <View style={[cf.field, { flex: 1 }]}>
                                    <Text style={[cf.label, { color: colors.textSecondary }]}>Từ ngày *</Text>
                                    <TextInput
                                        style={[cf.input, { backgroundColor: colors.inputBg, color: colors.textPrimary, borderColor: colors.cardBorder }]}
                                        placeholder="DD/MM/YYYY"
                                        placeholderTextColor={colors.textMuted}
                                        value={startDate}
                                        onChangeText={setStartDate}
                                        keyboardType="numeric"
                                        maxLength={10}
                                    />
                                </View>
                                <View style={[cf.field, { flex: 1 }]}>
                                    <Text style={[cf.label, { color: colors.textSecondary }]}>Đến ngày *</Text>
                                    <TextInput
                                        style={[cf.input, { backgroundColor: colors.inputBg, color: colors.textPrimary, borderColor: colors.cardBorder }]}
                                        placeholder="DD/MM/YYYY"
                                        placeholderTextColor={colors.textMuted}
                                        value={endDate}
                                        onChangeText={setEndDate}
                                        keyboardType="numeric"
                                        maxLength={10}
                                    />
                                </View>
                            </View>

                            {/* Total days */}
                            <View style={cf.field}>
                                <Text style={[cf.label, { color: colors.textSecondary }]}>Số ngày</Text>
                                <TextInput
                                    style={[cf.input, { backgroundColor: colors.inputBg, color: colors.textPrimary, borderColor: colors.cardBorder }]}
                                    placeholder="Tự tính từ ngày bắt đầu/kết thúc"
                                    placeholderTextColor={colors.textMuted}
                                    value={totalDays}
                                    onChangeText={setTotalDays}
                                    keyboardType="numeric"
                                />
                            </View>

                            {/* Reason */}
                            <View style={cf.field}>
                                <Text style={[cf.label, { color: colors.textSecondary }]}>Lý do *</Text>
                                <TextInput
                                    style={[cf.input, cf.textarea, { backgroundColor: colors.inputBg, color: colors.textPrimary, borderColor: colors.cardBorder }]}
                                    placeholder="Nhập lý do xin nghỉ..."
                                    placeholderTextColor={colors.textMuted}
                                    value={reason}
                                    onChangeText={setReason}
                                    multiline
                                    numberOfLines={3}
                                    textAlignVertical="top"
                                />
                            </View>

                            {/* Note */}
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

                            {/* Error */}
                            {!!error && (
                                <View style={cf.errorWrap}>
                                    <AlertCircle size={14} color="#EF4444" />
                                    <Text style={cf.errorText}>{error}</Text>
                                </View>
                            )}

                            {/* Submit */}
                            <Pressable
                                style={[cf.submitBtn, { opacity: loading ? 0.7 : 1 }]}
                                onPress={handleSave}
                                disabled={loading}
                            >
                                <LinearGradient colors={['#6366F1', '#818CF8']} style={cf.submitGradient}>
                                    {loading
                                        ? <ActivityIndicator size="small" color="#FFF" />
                                        : <Text style={cf.submitText}>Lưu thay đổi</Text>
                                    }
                                </LinearGradient>
                            </Pressable>
                            <View style={{ height: 32 }} />
                        </ScrollView>
                    </Animated.View>
                </View>
            </KeyboardAvoidingView>

            {/* Leave type picker modal */}
            <Modal visible={showTypePicker} animationType="slide" transparent onRequestClose={() => setShowTypePicker(false)}>
                <View style={pk.overlay}>
                    <BlurView intensity={30} tint="light" style={StyleSheet.absoluteFill} />
                    <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowTypePicker(false)} />
                    <View style={[pk.sheet, { backgroundColor: colors.cardBg }]}>
                        <View style={pk.handle} />
                        <Text style={[pk.title, { color: colors.textPrimary }]}>Loại nghỉ phép</Text>
                        <ScrollView contentContainerStyle={pk.list} showsVerticalScrollIndicator={false}>
                            {LEAVE_TYPES.map(t => (
                                <Pressable
                                    key={t}
                                    style={[pk.item, leaveType === t && { backgroundColor: 'rgba(99,102,241,0.08)' }]}
                                    onPress={() => { setLeaveType(t); setShowTypePicker(false); }}
                                >
                                    <Text style={[pk.itemName, { color: colors.textPrimary }]}>{LEAVE_TYPE_LABELS[t]}</Text>
                                    {leaveType === t && <Check size={16} color="#6366F1" />}
                                </Pressable>
                            ))}
                            <View style={{ height: 40 }} />
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </Modal>
    );
}

// ─── Main Screen ──────────────────────────────────────────────

export default function LeaveRequestScreen() {
    const router = useRouter();
    const { user } = useAuthStore();
    const colors = ThemeColors.light;

    const isAdminOrManager = user?.role === 'ADMIN' || user?.role === 'MANAGER';
    const currentEmployeeId = user?.employeeId;

    const [requests, setRequests] = useState<LeaveRequest[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Filters
    const [statusFilter, setStatusFilter] = useState<LeaveRequestStatus | ''>('');
    const [teamFilter, setTeamFilter] = useState('');
    const [search, setSearch] = useState('');

    // Modals
    const [selectedItem, setSelectedItem] = useState<LeaveRequest | null>(null);
    const [detailVisible, setDetailVisible] = useState(false);
    const [rejectId, setRejectId] = useState<string | null>(null);
    const [createVisible, setCreateVisible] = useState(false);
    const [editItem, setEditItem] = useState<LeaveRequest | null>(null);
    const [editVisible, setEditVisible] = useState(false);

    // Error toast
    const [toastMsg, setToastMsg] = useState('');
    const showToast = (msg: string) => {
        setToastMsg(msg);
        setTimeout(() => setToastMsg(''), 3000);
    };

    const load = useCallback(async (showLoader = true) => {
        if (showLoader) setLoading(true);
        try {
            const filters: any = { limit: 0 };
            if (!isAdminOrManager && currentEmployeeId) {
                filters.employeeId = currentEmployeeId;
            }
            if (statusFilter) filters.status = statusFilter;
            if (teamFilter && isAdminOrManager) filters.teamId = teamFilter;

            const [res] = await Promise.all([
                leaveRequestApi.getAll(filters),
            ]);
            setRequests(res.data);
        } catch (e: any) {
            showToast(e?.response?.data?.message || 'Không thể tải danh sách đơn');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [isAdminOrManager, currentEmployeeId, statusFilter, teamFilter]);

    // Load teams + employees once
    useEffect(() => {
        if (isAdminOrManager) {
            Promise.all([
                teamApi.getTeams().catch(() => [] as Team[]),
                employeeApi.getEmployees().catch(() => [] as Employee[]),
            ]).then(([t, e]) => {
                setTeams(Array.isArray(t) ? t : []);
                setEmployees(Array.isArray(e) ? e : []);
            });
        }
    }, [isAdminOrManager]);

    useEffect(() => { load(); }, [load]);

    const onRefresh = useCallback(() => { setRefreshing(true); load(false); }, [load]);

    // Filtered list (client-side search)
    const filtered = useMemo(() => {
        if (!search.trim()) return requests;
        const q = search.trim().toLowerCase();
        return requests.filter(r =>
            r.Employee?.fullName?.toLowerCase().includes(q) ||
            r.Employee?.employeeCode?.toLowerCase().includes(q)
        );
    }, [requests, search]);

    // Summary counts (from full list, not filtered)
    const pendingCount = requests.filter(r => r.status === 'PENDING').length;
    const approvedCount = requests.filter(r => r.status === 'APPROVED').length;
    const rejectedCount = requests.filter(r => r.status === 'REJECTED').length;

    // Actions
    const handleApprove = async (id: string) => {
        try {
            await leaveRequestApi.approve(id, user!.id);
            load(false);
        } catch (e: any) {
            showToast(e?.response?.data?.message || 'Không thể duyệt đơn');
        }
    };

    const handleReject = (id: string) => {
        setRejectId(id);
    };

    const handleRejectConfirm = async (reason: string) => {
        if (!rejectId) return;
        try {
            await leaveRequestApi.reject(rejectId, user!.id, reason);
            setRejectId(null);
            load(false);
        } catch (e: any) {
            showToast(e?.response?.data?.message || 'Không thể từ chối đơn');
            throw e;
        }
    };

    const handleCancel = async (id: string) => {
        try {
            await leaveRequestApi.cancel(id, currentEmployeeId ?? user!.id);
            load(false);
        } catch (e: any) {
            showToast(e?.response?.data?.message || 'Không thể hủy đơn');
            throw e;
        }
    };

    const handleCreate = async (dto: CreateLeaveRequestDto) => {
        await leaveRequestApi.create(dto);
        load(false);
    };

    const handleEdit = (item: LeaveRequest) => {
        setEditItem(item);
        setEditVisible(true);
    };

    const handleUpdate = async (id: string, dto: Partial<CreateLeaveRequestDto>) => {
        await leaveRequestApi.update(id, dto);
        load(false);
    };

    const handleDelete = (id: string) => {
        Alert.alert(
            'Xác nhận xóa',
            'Bạn có chắc muốn xóa đơn nghỉ phép này? Hành động này không thể hoàn tác.',
            [
                { text: 'Hủy', style: 'cancel' },
                {
                    text: 'Xóa',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await leaveRequestApi.delete(id);
                            load(false);
                        } catch (e: any) {
                            showToast(e?.response?.data?.message || 'Không thể xóa đơn');
                        }
                    },
                },
            ],
        );
    };

    return (
        <View style={s.root}>
            <StatusBar style="dark" />
            <LinearGradient colors={colors.gradientColors} style={StyleSheet.absoluteFill} />

            <SafeAreaView style={s.safe} edges={['top']}>
                {/* Header */}
                <Animated.View entering={FadeInDown.duration(350)} style={s.header}>
                    <Pressable
                        style={[s.headerBtn, { backgroundColor: colors.inputBg }]}
                        onPress={() => router.canGoBack() ? router.back() : router.replace('/home')}
                    >
                        <ChevronLeft size={22} color={colors.textSecondary} />
                    </Pressable>
                    <View style={{ flex: 1 }}>
                        <Text style={[s.headerTitle, { color: colors.textPrimary }]}>Đơn xin nghỉ phép</Text>
                        <Text style={[s.headerSub, { color: colors.textMuted }]}>
                            {requests.length} đơn · {pendingCount} chờ duyệt
                        </Text>
                    </View>
                </Animated.View>

                {/* Summary Cards */}
                <Animated.View entering={FadeInDown.duration(400).delay(40)} style={s.summaryRow}>
                    {/* Chờ duyệt */}
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

                    {/* Đã duyệt */}
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

                    {/* Từ chối */}
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

                {/* Status Filter Chips */}
                <Animated.View entering={FadeInDown.duration(400).delay(60)}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterScroll} contentContainerStyle={s.filterContent}>
                        {STATUS_FILTERS.map(f => {
                            const isActive = statusFilter === f.key;
                            return (
                                <Pressable
                                    key={f.key}
                                    onPress={() => setStatusFilter(f.key)}
                                    style={[
                                        s.filterChip,
                                        isActive
                                            ? { backgroundColor: f.color + '18', borderColor: f.color }
                                            : { backgroundColor: colors.inputBg, borderColor: colors.cardBorder },
                                    ]}
                                >
                                    <Text style={[s.filterChipText, { color: isActive ? f.color : colors.textSecondary }]}>
                                        {f.label}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </ScrollView>
                </Animated.View>

                {/* Team Filter (admin/manager only) */}
                {isAdminOrManager && teams.length > 0 && (
                    <Animated.View entering={FadeInDown.duration(400).delay(80)}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterScroll} contentContainerStyle={s.filterContent}>
                            <Pressable
                                onPress={() => setTeamFilter('')}
                                style={[
                                    s.filterChip,
                                    teamFilter === ''
                                        ? { backgroundColor: '#6366F118', borderColor: '#6366F1' }
                                        : { backgroundColor: colors.inputBg, borderColor: colors.cardBorder },
                                ]}
                            >
                                <Text style={[s.filterChipText, { color: teamFilter === '' ? '#6366F1' : colors.textSecondary }]}>
                                    Tất cả tổ
                                </Text>
                            </Pressable>
                            {teams.map(team => {
                                const isActive = teamFilter === team.id;
                                return (
                                    <Pressable
                                        key={team.id}
                                        onPress={() => setTeamFilter(isActive ? '' : team.id)}
                                        style={[
                                            s.filterChip,
                                            isActive
                                                ? { backgroundColor: '#6366F118', borderColor: '#6366F1' }
                                                : { backgroundColor: colors.inputBg, borderColor: colors.cardBorder },
                                        ]}
                                    >
                                        <Text style={[s.filterChipText, { color: isActive ? '#6366F1' : colors.textSecondary }]}>
                                            {team.name}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </ScrollView>
                    </Animated.View>
                )}

                {/* Search (admin/manager only) */}
                {isAdminOrManager && (
                    <Animated.View entering={FadeInDown.duration(400).delay(100)} style={[s.searchWrap, { borderColor: colors.cardBorder }]}>
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
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textAccent} colors={[colors.textAccent]} />
                        }
                    >
                        {filtered.length === 0 ? (
                            <Animated.View entering={FadeInUp.duration(400)} style={s.empty}>
                                <FileText size={44} color={colors.textMuted} strokeWidth={1.4} />
                                <Text style={[s.emptyTitle, { color: colors.textSecondary }]}>Không có đơn nào</Text>
                                <Text style={[s.emptySub, { color: colors.textMuted }]}>
                                    {search || statusFilter || teamFilter ? 'Thử thay đổi bộ lọc' : 'Chưa có đơn xin nghỉ phép'}
                                </Text>
                            </Animated.View>
                        ) : (
                            <View style={s.gap}>
                                {filtered.map((item, i) => (
                                    <LeaveRow
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

                {/* FAB — admin/manager */}
                {!!user && (
                    <Pressable style={s.fab} onPress={() => setCreateVisible(true)}>
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
                isAdminOrManager={isAdminOrManager}
                currentUserId={user?.id ?? ''}
                currentEmployeeId={currentEmployeeId}
                onApprove={handleApprove}
                onReject={handleReject}
                onCancel={handleCancel}
                onEdit={handleEdit}
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
                employees={employees}
                currentEmployeeId={currentEmployeeId}
                isAdminOrManager={isAdminOrManager}
            />

            {/* Edit Form Modal */}
            <EditFormModal
                item={editItem}
                visible={editVisible}
                onClose={() => { setEditVisible(false); setEditItem(null); }}
                onSave={handleUpdate}
            />
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────

const s = StyleSheet.create({
    root: { flex: 1 },
    safe: { flex: 1 },

    // Header
    header: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
        paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, paddingBottom: Spacing.sm,
    },
    headerBtn: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: FontSizes.xl, fontWeight: FontWeights.bold },
    headerSub: { fontSize: FontSizes.xs, marginTop: 2 },

    // Summary cards
    summaryRow: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.xl, marginBottom: Spacing.sm },
    summaryCard: { flex: 1, borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1 },
    summaryInner: { padding: Spacing.sm, alignItems: 'center', gap: 4 },
    summaryIcon: { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginBottom: 2 },
    summaryCount: { fontSize: FontSizes.xl, fontWeight: FontWeights.bold, lineHeight: 26 },
    summaryLabel: { fontSize: 10, fontWeight: FontWeights.medium, textAlign: 'center' },

    // Filter chips
    filterScroll: { marginBottom: Spacing.xs },
    filterContent: { paddingHorizontal: Spacing.xl, gap: Spacing.sm, flexDirection: 'row' },
    filterChip: { paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: BorderRadius.full, borderWidth: 1 },
    filterChipText: { fontSize: FontSizes.xs, fontWeight: FontWeights.medium },

    // Search
    searchWrap: { marginHorizontal: Spacing.xl, marginBottom: Spacing.sm, borderRadius: 14, overflow: 'hidden', borderWidth: 1 },
    searchInner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: 10 },
    searchInput: { flex: 1, fontSize: FontSizes.sm, padding: 0 },

    // Loader
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.md },
    loaderText: { fontSize: FontSizes.sm },

    // List
    list: { paddingHorizontal: Spacing.xl },
    gap: { gap: Spacing.md },

    // Empty
    empty: { alignItems: 'center', paddingTop: 60, gap: Spacing.md },
    emptyTitle: { fontSize: FontSizes.base, fontWeight: FontWeights.semibold },
    emptySub: { fontSize: FontSizes.sm, textAlign: 'center' },

    // FAB
    fab: { position: 'absolute', bottom: 28, right: 24 },
    fabGradient: {
        width: 56, height: 56, borderRadius: 28,
        justifyContent: 'center', alignItems: 'center',
        shadowColor: '#6366F1', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35, shadowRadius: 12, elevation: 8,
    },

    // Toast
    toast: {
        position: 'absolute', bottom: 100, left: Spacing.xl, right: Spacing.xl,
        backgroundColor: 'rgba(30,30,30,0.88)', borderRadius: BorderRadius.lg,
        flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
        paddingHorizontal: Spacing.lg, paddingVertical: 12,
    },
    toastText: { color: '#FFF', fontSize: FontSizes.sm, flex: 1 },
});
