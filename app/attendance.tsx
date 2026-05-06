// Attendance Screen — Group by employee, tap to see daily detail
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    View, Text, StyleSheet, Pressable, ScrollView,
    TextInput, RefreshControl, ActivityIndicator, Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import {
    ChevronLeft, ChevronRight, Search, X,
    CalendarDays, Clock, TrendingUp, Users,
    CheckCircle2, XCircle, AlertCircle, Umbrella,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';

import { Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants/Tokens';
import { ThemeColors } from '@/constants/ThemeColors';
import { useAuthStore } from '@/store';
import { attendanceApi, AttendanceRecord, AttendanceStatus } from '@/lib/attendance-api';
import { teamApi, Team } from '@/lib/team-api';

// ─── Constants ────────────────────────────────────────────────

const STATUS_CONFIG: Record<AttendanceStatus, { label: string; color: string; bg: string; Icon: any }> = {
    PRESENT: { label: 'Có mặt',    color: '#10B981', bg: 'rgba(16,185,129,0.12)',  Icon: CheckCircle2 },
    ABSENT:  { label: 'Vắng mặt',  color: '#EF4444', bg: 'rgba(239,68,68,0.12)',   Icon: XCircle      },
    LATE:    { label: 'Đi muộn',   color: '#F59E0B', bg: 'rgba(245,158,11,0.12)',  Icon: AlertCircle  },
    LEAVE:   { label: 'Nghỉ phép', color: '#6366F1', bg: 'rgba(99,102,241,0.12)',  Icon: Umbrella     },
};

const DAY_NAMES = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const HOURS_PER_SHIFT = 9; // 1 cong = 9 gio

function toShift(hours: number): string {
    if (!hours || hours <= 0) return '';
    const shifts = hours / HOURS_PER_SHIFT;
    const rounded = Math.round(shifts * 2) / 2;
    if (rounded % 1 === 0) return rounded + ' cong';
    return rounded + ' cong';
}


function getMonthRange(year: number, month: number) {
    const from = new Date(year, month - 1, 1);
    const to   = new Date(year, month, 0);
    const fmt  = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return { fromDate: fmt(from), toDate: fmt(to) };
}

function fmtDate(dateStr: string) {
    const d = new Date(dateStr);
    return {
        day:     String(d.getDate()).padStart(2, '0'),
        month:   String(d.getMonth() + 1).padStart(2, '0'),
        weekday: DAY_NAMES[d.getDay()],
    };
}

// Group records by employeeId
interface EmployeeGroup {
    employeeId: string;
    fullName: string;
    employeeCode: string;
    teamName: string;
    records: AttendanceRecord[];
    present: number;
    absent: number;
    late: number;
    leave: number;
    totalHours: number;
    otHours: number;
}

function groupByEmployee(records: AttendanceRecord[]): EmployeeGroup[] {
    const map = new Map<string, EmployeeGroup>();
    for (const r of records) {
        const empId = r.employeeId;
        if (!map.has(empId)) {
            map.set(empId, {
                employeeId: empId,
                fullName:     r.Employee?.fullName     ?? 'Không rõ',
                employeeCode: r.Employee?.employeeCode ?? '',
                teamName:     r.Employee?.Team?.name   ?? '',
                records: [],
                present: 0, absent: 0, late: 0, leave: 0,
                totalHours: 0, otHours: 0,
            });
        }
        const g = map.get(empId)!;
        g.records.push(r);
        if (r.status === 'PRESENT') g.present++;
        else if (r.status === 'ABSENT') g.absent++;
        else if (r.status === 'LATE') g.late++;
        else if (r.status === 'LEAVE') g.leave++;
        g.totalHours += Number(r.workHours || 0);
        g.otHours    += Number(r.overtimeHours || 0);
    }
    return Array.from(map.values()).sort((a, b) => a.fullName.localeCompare(b.fullName, 'vi'));
}

// ─── Month Picker ──────────────────────────────────────────────

function MonthPicker({ month, year, onChange }: {
    month: number; year: number;
    onChange: (m: number, y: number) => void;
}) {
    const colors = ThemeColors.light;
    const now = new Date();
    const isMax = year === now.getFullYear() && month === now.getMonth() + 1;
    const prev = () => month === 1 ? onChange(12, year - 1) : onChange(month - 1, year);
    const next = () => { if (!isMax) month === 12 ? onChange(1, year + 1) : onChange(month + 1, year); };
    return (
        <View style={[s.monthPicker, { backgroundColor: colors.inputBg }]}>
            <Pressable onPress={prev} hitSlop={8} style={s.monthBtn}>
                <ChevronLeft size={18} color={colors.textSecondary} />
            </Pressable>
            <Text style={[s.monthLabel, { color: colors.textPrimary }]}>T{month}/{year}</Text>
            <Pressable onPress={next} hitSlop={8} style={s.monthBtn} disabled={isMax}>
                <ChevronRight size={18} color={isMax ? colors.textMuted : colors.textSecondary} />
            </Pressable>
        </View>
    );
}

// ─── Summary Card ─────────────────────────────────────────────

function SummaryCard({ groups, month, year }: { groups: EmployeeGroup[]; month: number; year: number }) {
    const totalRecords = groups.reduce((s, g) => s + g.records.length, 0);
    const present  = groups.reduce((s, g) => s + g.present, 0);
    const absent   = groups.reduce((s, g) => s + g.absent, 0);
    const late     = groups.reduce((s, g) => s + g.late, 0);
    const leave    = groups.reduce((s, g) => s + g.leave, 0);
    const totalHrs = groups.reduce((s, g) => s + g.totalHours, 0);
    const otHrs    = groups.reduce((s, g) => s + g.otHours, 0);
    const stats = [
        { label: 'Có mặt',    value: present,                    color: '#10B981' },
        { label: 'Vắng',      value: absent,                     color: '#EF4444' },
        { label: 'Đi muộn',   value: late,                       color: '#F59E0B' },
        { label: 'Nghỉ phép', value: leave,                      color: '#A78BFA' },
        { label: 'Công chính',  value: toShift(totalHrs),  color: '#FFFFFF' },
        { label: 'Tăng ca',   value: otHrs > 0 ? otHrs.toFixed(1) + 'h' : '0h',     color: '#FCD34D' },
    ];
    return (
        <Animated.View entering={FadeInDown.duration(450).delay(80).springify().damping(16)} style={s.summaryWrap}>
            <LinearGradient colors={['#0156A7', '#0284C7', '#38BDF8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.summaryCard}>
                <View style={s.sOrb1} /><View style={s.sOrb2} />
                <View style={s.summaryHeader}>
                    <CalendarDays size={15} color="rgba(255,255,255,0.8)" />
                    <Text style={s.summaryTitle}>Tháng {month}/{year}</Text>
                    <Text style={s.summaryMeta}>{groups.length} NV · {totalRecords} ngày</Text>
                </View>
                <View style={s.statsGrid}>
                    {stats.map(st => (
                        <View key={st.label} style={s.statItem}>
                            <Text style={[s.statValue, { color: st.color }]}>{st.value}</Text>
                            <Text style={s.statLabel}>{st.label}</Text>
                        </View>
                    ))}
                </View>
            </LinearGradient>
        </Animated.View>
    );
}

// ─── Employee Row ─────────────────────────────────────────────

function EmployeeRow({ group, index, onPress }: {
    group: EmployeeGroup; index: number; onPress: () => void;
}) {
    const colors = ThemeColors.light;
    const initials = group.fullName.split(' ').map((w: string) => w[0]).slice(-2).join('').toUpperCase();
    return (
        <Animated.View entering={FadeInUp.duration(350).delay(index * 40).springify().damping(20)}>
            <Pressable
                style={({ pressed }) => [s.empRow, { borderColor: colors.cardBorder }, pressed && { opacity: 0.75 }]}
                onPress={onPress}
            >
                <BlurView intensity={16} tint="light" style={StyleSheet.absoluteFill} />
                <View style={[s.empRowInner, { backgroundColor: colors.cardBg }]}>
                    {/* Avatar */}
                    <LinearGradient colors={['#0156A7', '#38BDF8']} style={s.avatar}>
                        <Text style={s.avatarText}>{initials}</Text>
                    </LinearGradient>

                    {/* Info */}
                    <View style={s.empInfo}>
                        <Text style={[s.empName, { color: colors.textPrimary }]} numberOfLines={1}>
                            {group.fullName}
                        </Text>
                        <Text style={[s.empMeta, { color: colors.textMuted }]}>
                            {group.employeeCode}{group.teamName ? ` · ${group.teamName}` : ''}
                        </Text>
                        {/* Mini status pills */}
                        <View style={s.miniPills}>
                            {group.present > 0  && <View style={[s.pill, { backgroundColor: 'rgba(16,185,129,0.12)' }]}><Text style={[s.pillT, { color: '#10B981' }]}>{group.present}✓</Text></View>}
                            {group.absent > 0   && <View style={[s.pill, { backgroundColor: 'rgba(239,68,68,0.12)' }]}><Text style={[s.pillT, { color: '#EF4444' }]}>{group.absent}✗</Text></View>}
                            {group.late > 0     && <View style={[s.pill, { backgroundColor: 'rgba(245,158,11,0.12)' }]}><Text style={[s.pillT, { color: '#F59E0B' }]}>{group.late}⚠</Text></View>}
                            {group.leave > 0    && <View style={[s.pill, { backgroundColor: 'rgba(99,102,241,0.12)' }]}><Text style={[s.pillT, { color: '#6366F1' }]}>{group.leave}休</Text></View>}
                        </View>
                    </View>

                    {/* Hours + chevron */}
                    <View style={s.empRight}>
                        <Text style={[s.empHours, { color: colors.textAccent }]}>{toShift(group.totalHours)}</Text>
                        {group.otHours > 0 && (
                            <Text style={s.empOT}>+{group.otHours > 0 ? group.otHours.toFixed(1) + 'h' : ''} OT</Text>
                        )}
                        <ChevronRight size={16} color={colors.textMuted} style={{ marginTop: 4 }} />
                    </View>
                </View>
            </Pressable>
        </Animated.View>
    );
}

// ─── Detail Modal (daily records of one employee) ─────────────

function DetailModal({ group, month, year, visible, onClose }: {
    group: EmployeeGroup | null; month: number; year: number;
    visible: boolean; onClose: () => void;
}) {
    const colors = ThemeColors.light;
    if (!group) return null;

    const sorted = [...group.records].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <View style={s.modalOverlay}>
                <BlurView intensity={40} tint="light" style={StyleSheet.absoluteFill} />
                <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

                <Animated.View entering={FadeInUp.duration(350).springify().damping(18)} style={[s.modalSheet, { backgroundColor: colors.cardBg }]}>
                    {/* Handle */}
                    <View style={s.modalHandle} />

                    {/* Header */}
                    <View style={[s.modalHeader, { borderBottomColor: colors.divider }]}>
                        <LinearGradient colors={['#0156A7', '#38BDF8']} style={s.modalAvatar}>
                            <Text style={s.modalAvatarText}>
                                {group.fullName.split(' ').map((w: string) => w[0]).slice(-2).join('').toUpperCase()}
                            </Text>
                        </LinearGradient>
                        <View style={{ flex: 1 }}>
                            <Text style={[s.modalName, { color: colors.textPrimary }]} numberOfLines={1}>{group.fullName}</Text>
                            <Text style={[s.modalMeta, { color: colors.textMuted }]}>
                                {group.employeeCode}{group.teamName ? ` · ${group.teamName}` : ''} · Tháng {month}/{year}
                            </Text>
                        </View>
                        <Pressable onPress={onClose} style={[s.modalClose, { backgroundColor: colors.inputBg }]}>
                            <X size={18} color={colors.textSecondary} />
                        </Pressable>
                    </View>

                    {/* Mini summary */}
                    <View style={[s.modalSummary, { backgroundColor: colors.inputBg }]}>
                        {[
                            { label: 'Có mặt',   value: group.present,  color: '#10B981' },
                            { label: 'Vắng',     value: group.absent,   color: '#EF4444' },
                            { label: 'Đi muộn',  value: group.late,     color: '#F59E0B' },
                            { label: 'Nghỉ',     value: group.leave,    color: '#6366F1' },
                            { label: '',      value: toShift(group.totalHours), color: colors.textAccent },
                        ].map(st => (
                            <View key={st.label} style={s.modalStat}>
                                <Text style={[s.modalStatVal, { color: st.color }]}>{st.value}</Text>
                                <Text style={[s.modalStatLbl, { color: colors.textMuted }]}>{st.label}</Text>
                            </View>
                        ))}
                    </View>

                    {/* Daily list */}
                    <ScrollView contentContainerStyle={s.modalList} showsVerticalScrollIndicator={false}>
                        {sorted.length === 0 ? (
                            <View style={s.modalEmpty}>
                                <Text style={[s.modalEmptyT, { color: colors.textMuted }]}>Không có dữ liệu</Text>
                            </View>
                        ) : sorted.map((r, i) => {
                            const cfg = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.PRESENT;
                            const StatusIcon = cfg.Icon;
                            const { day, weekday, month: mo } = fmtDate(r.date);
                            return (
                                <View key={r.id} style={[s.dayRow, i < sorted.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.divider }]}>
                                    {/* Date */}
                                    <View style={s.dayDate}>
                                        <Text style={[s.dayNum, { color: colors.textPrimary }]}>{day}/{mo}</Text>
                                        <Text style={[s.dayWd, { color: colors.textMuted }]}>{weekday}</Text>
                                    </View>

                                    {/* Status */}
                                    <View style={[s.dayStatus, { backgroundColor: cfg.bg }]}>
                                        <StatusIcon size={12} color={cfg.color} strokeWidth={2} />
                                        <Text style={[s.dayStatusT, { color: cfg.color }]}>{cfg.label}</Text>
                                    </View>

                                    {/* Hours: cong + OT */}
                                    <View style={s.dayHours}>
                                        {Number(r.workHours) > 0 && (
                                            <View style={s.hChip}>
                                                <Clock size={10} color={colors.textMuted} />
                                                <Text style={[s.hChipT, { color: colors.textMuted }]}>
                                                    {toShift(Number(r.workHours))}
                                                    {Number(r.overtimeHours) > 0 ? ' + ' + Number(r.overtimeHours).toFixed(1) + 'h OT' : ''}
                                                </Text>
                                            </View>
                                        )}
                                    </View>

                                    {/* Mark / Note */}
                                    {(r.mark || r.note) ? (
                                        <Text style={[s.dayNote, { color: colors.textMuted }]} numberOfLines={1}>
                                            {r.mark ?? r.note}
                                        </Text>
                                    ) : null}
                                </View>
                            );
                        })}
                        <View style={{ height: 40 }} />
                    </ScrollView>
                    )}
                </Animated.View>
            </View>
        </Modal>
    );
}

// ─── Main Screen ──────────────────────────────────────────────

export default function AttendanceScreen() {
    const router = useRouter();
    const { user } = useAuthStore();
    const colors = ThemeColors.light;
    const isAdmin = user?.role === 'ADMIN' || user?.role === 'MANAGER';

    const now = new Date();
    const [month, setMonth]               = useState(now.getMonth() + 1);
    const [year, setYear]                 = useState(now.getFullYear());
    const [search, setSearch]             = useState('');
    const [selectedTeam, setSelectedTeam] = useState('');
    const [teams, setTeams]               = useState<Team[]>([]);
    const [records, setRecords]           = useState<AttendanceRecord[]>([]);
    const [loading, setLoading]           = useState(true);
    const [refreshing, setRefreshing]     = useState(false);
    const [selected, setSelected]         = useState<EmployeeGroup | null>(null);

    // Load teams
    useEffect(() => {
        teamApi.getTeams().then(t => setTeams(Array.isArray(t) ? t : [])).catch(() => {});
    }, []);

    const load = useCallback(async (showLoader = true) => {
        if (showLoader) setLoading(true);
        try {
            const { fromDate, toDate } = getMonthRange(year, month);
            const filters: any = { fromDate, toDate, limit: 0 };
            if (!isAdmin) {
                const empId = (user as any)?.employeeId || user?.id;
                if (empId) filters.employeeId = empId;
            }
            const res = await attendanceApi.getAttendance(filters);
            setRecords(res.data);
        } catch { setRecords([]); }
        finally { setLoading(false); setRefreshing(false); }
    }, [year, month, isAdmin, user]);

    useEffect(() => { load(); }, [load]);

    const onRefresh = useCallback(() => { setRefreshing(true); load(false); }, [load]);

    // Group + filter
    const groups = useMemo(() => {
        let list = records;
        if (selectedTeam) list = list.filter(r => r.Employee?.Team?.id === selectedTeam || r.Employee?.teamId === selectedTeam);
        if (search.trim()) {
            const q = search.trim().toLowerCase();
            list = list.filter(r =>
                r.Employee?.fullName?.toLowerCase().includes(q) ||
                r.Employee?.employeeCode?.toLowerCase().includes(q)
            );
        }
        return groupByEmployee(list);
    }, [records, selectedTeam, search]);

    return (
        <View style={s.root}>
            <StatusBar style="dark" />
            <LinearGradient colors={colors.gradientColors} style={StyleSheet.absoluteFill} />

            <SafeAreaView style={s.safe} edges={['top']}>
                {/* Header */}
                <Animated.View entering={FadeInDown.duration(350)} style={s.header}>
                    <Pressable style={[s.headerBtn, { backgroundColor: colors.inputBg }]}
                        onPress={() => router.canGoBack() ? router.back() : router.replace('/home')}>
                        <ChevronLeft size={22} color={colors.textSecondary} />
                    </Pressable>
                    <Text style={[s.headerTitle, { color: colors.textPrimary }]}>Chấm công</Text>
                    <MonthPicker month={month} year={year} onChange={(m, y) => { setMonth(m); setYear(y); }} />
                </Animated.View>

                {/* Filters */}
                <Animated.View entering={FadeInDown.duration(350).delay(60)} style={s.filtersWrap}>
                    <View style={[s.searchBar, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder }]}>
                            <Search size={15} color={colors.textMuted} />
                            <TextInput
                                style={[s.searchInput, { color: colors.textPrimary }]}
                                placeholder="Tìm nhân viên..."
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
                    {teams.length > 0 && (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
                            <Pressable style={[s.chip, !selectedTeam && s.chipOn]} onPress={() => setSelectedTeam('')}>
                                <Users size={11} color={!selectedTeam ? '#FFF' : colors.textMuted} />
                                <Text style={[s.chipT, !selectedTeam && s.chipTOn]}>Tất cả</Text>
                            </Pressable>
                            {teams.map(t => (
                                <Pressable key={t.id} style={[s.chip, selectedTeam === t.id && s.chipOn]}
                                    onPress={() => setSelectedTeam(selectedTeam === t.id ? '' : t.id)}>
                                    <Text style={[s.chipT, selectedTeam === t.id && s.chipTOn]}>{t.code} · {t.name}</Text>
                                </Pressable>
                            ))}
                        </ScrollView>
                    )}
                </Animated.View>

                {/* Content */}
                {loading ? (
                    <View style={s.loader}>
                        <ActivityIndicator size="large" color={colors.textAccent} />
                        <Text style={[{ fontSize: FontSizes.sm, color: colors.textMuted }]}>Đang tải...</Text>
                    </View>
                ) : (
                    <ScrollView
                        contentContainerStyle={s.scroll}
                        showsVerticalScrollIndicator={false}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textAccent} colors={[colors.textAccent]} />}
                    >
                        <SummaryCard groups={groups} month={month} year={year} />

                        {groups.length === 0 ? (
                            <Animated.View entering={FadeInUp.duration(400)} style={s.empty}>
                                <CalendarDays size={44} color={colors.textMuted} strokeWidth={1.4} />
                                <Text style={[s.emptyT, { color: colors.textSecondary }]}>Không có dữ liệu</Text>
                                <Text style={[s.emptySub, { color: colors.textMuted }]}>
                                    {search || selectedTeam ? 'Thử thay đổi bộ lọc' : `Chưa có chấm công tháng ${month}/${year}`}
                                </Text>
                            </Animated.View>
                        ) : (
                            <View style={s.list}>
                                {groups.map((g, i) => (
                                    <EmployeeRow key={g.employeeId} group={g} index={i} onPress={() => setSelected(g)} />
                                ))}
                            </View>
                        )}
                        <View style={{ height: 120 }} />
                    </ScrollView>
                )}
            </SafeAreaView>

            {/* Detail modal */}
            <DetailModal
                group={selected}
                month={month}
                year={year}
                visible={!!selected}
                onClose={() => setSelected(null)}
            />
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────

const s = StyleSheet.create({
    root: { flex: 1 }, safe: { flex: 1 },

    // Header
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.xl, paddingTop: Spacing.sm, paddingBottom: Spacing.md, gap: Spacing.sm },
    headerBtn: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { flex: 1, fontSize: FontSizes.lg, fontWeight: FontWeights.bold },

    // Month picker
    monthPicker: { flexDirection: 'row', alignItems: 'center', borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.sm, paddingVertical: 6, gap: 2 },
    monthBtn: { padding: 2 },
    monthLabel: { fontSize: FontSizes.xs, fontWeight: FontWeights.semibold, minWidth: 60, textAlign: 'center' },

    // Filters
    filtersWrap: { paddingHorizontal: Spacing.xl, gap: Spacing.sm, marginBottom: Spacing.sm },
    searchBar: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: 10, borderRadius: BorderRadius.lg, borderWidth: 1 },
    searchInput: { flex: 1, fontSize: FontSizes.sm, padding: 0 },
    chips: { flexDirection: 'row', gap: Spacing.sm, paddingVertical: 2 },
    chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: BorderRadius.full, backgroundColor: 'rgba(0,0,0,0.05)', borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)' },
    chipOn: { backgroundColor: '#0156A7', borderColor: '#0156A7' },
    chipT: { fontSize: FontSizes.xs, fontWeight: FontWeights.medium, color: '#59677B' },
    chipTOn: { color: '#FFFFFF' },

    // Loader / empty
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.md },
    empty: { alignItems: 'center', paddingTop: 60, gap: Spacing.md },
    emptyT: { fontSize: FontSizes.base, fontWeight: FontWeights.semibold },
    emptySub: { fontSize: FontSizes.sm, textAlign: 'center' },

    // Scroll
    scroll: { paddingHorizontal: Spacing.xl, gap: Spacing.md },
    list: { gap: Spacing.sm },

    // Summary card
    summaryWrap: { borderRadius: BorderRadius.xxl, overflow: 'hidden', shadowColor: '#0156A7', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 6 },
    summaryCard: { padding: Spacing.xl, overflow: 'hidden' },
    sOrb1: { position: 'absolute', width: 130, height: 130, borderRadius: 65, backgroundColor: 'rgba(255,255,255,0.07)', top: -30, right: -20 },
    sOrb2: { position: 'absolute', width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.05)', bottom: -15, left: 40 },
    summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.lg },
    summaryTitle: { flex: 1, fontSize: FontSizes.base, fontWeight: FontWeights.bold, color: '#FFFFFF' },
    summaryMeta: { fontSize: FontSizes.xs, color: 'rgba(255,255,255,0.7)' },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    statItem: { width: '33.33%', alignItems: 'center', paddingVertical: Spacing.sm },
    statValue: { fontSize: FontSizes.xl, fontWeight: FontWeights.extrabold },
    statLabel: { fontSize: FontSizes.xs, color: 'rgba(255,255,255,0.65)', marginTop: 2 },

    // Employee row
    empRow: { borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1 },
    empRowInner: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.md },
    avatar: { width: 44, height: 44, borderRadius: 13, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
    avatarText: { fontSize: FontSizes.sm, fontWeight: FontWeights.extrabold, color: '#FFF' },
    empInfo: { flex: 1, gap: 3 },
    empName: { fontSize: FontSizes.sm, fontWeight: FontWeights.semibold },
    empMeta: { fontSize: FontSizes.xs },
    miniPills: { flexDirection: 'row', gap: 4, flexWrap: 'wrap' },
    pill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
    pillT: { fontSize: 10, fontWeight: FontWeights.bold },
    empRight: { alignItems: 'flex-end', gap: 2 },
    empHours: { fontSize: FontSizes.base, fontWeight: FontWeights.bold },
    empOT: { fontSize: 10, color: '#F59E0B', fontWeight: FontWeights.medium },

    // Detail modal
    modalOverlay: { flex: 1, justifyContent: 'flex-end' },
    modalSheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '85%', paddingTop: 12 },
    modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(0,0,0,0.15)', alignSelf: 'center', marginBottom: 12 },
    modalHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.xl, paddingBottom: Spacing.md, borderBottomWidth: 1 },
    modalAvatar: { width: 44, height: 44, borderRadius: 13, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
    modalAvatarText: { fontSize: FontSizes.sm, fontWeight: FontWeights.extrabold, color: '#FFF' },
    modalName: { fontSize: FontSizes.base, fontWeight: FontWeights.bold },
    modalMeta: { fontSize: FontSizes.xs, marginTop: 2 },
    modalClose: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
    modalSummary: { flexDirection: 'row', marginHorizontal: Spacing.xl, marginVertical: Spacing.md, borderRadius: BorderRadius.lg, paddingVertical: Spacing.md },
    modalStat: { flex: 1, alignItems: 'center' },
    modalStatVal: { fontSize: FontSizes.lg, fontWeight: FontWeights.extrabold },
    modalStatLbl: { fontSize: 10, marginTop: 2 },
    modalList: { paddingHorizontal: Spacing.xl },
    modalEmpty: { alignItems: 'center', paddingVertical: 40 },
    modalEmptyT: { fontSize: FontSizes.sm },

    // Day row inside modal
    dayRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: Spacing.sm },
    dayDate: { width: 44, alignItems: 'center' },
    dayNum: { fontSize: FontSizes.xs, fontWeight: FontWeights.bold },
    dayWd: { fontSize: 10 },
    dayStatus: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: BorderRadius.full },
    dayStatusT: { fontSize: 10, fontWeight: FontWeights.semibold },
    dayHours: { flexDirection: 'row', gap: 4, flex: 1 },
    hChip: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(0,0,0,0.05)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
    hChipT: { fontSize: 10, fontWeight: FontWeights.medium },
    dayNote: { fontSize: 10, maxWidth: 80 },
});


