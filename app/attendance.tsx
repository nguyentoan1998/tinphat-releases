// Attendance Screen — Group by employee, tap to see daily detail
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    View, Text, StyleSheet, Pressable, ScrollView,
    TextInput, RefreshControl, ActivityIndicator, Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, { FadeInDown, FadeInUp, FadeInRight, withSpring, useAnimatedStyle } from 'react-native-reanimated';
import {
    ChevronLeft, ChevronRight, Search, X,
    CalendarDays, Clock, TrendingUp, Users,
    CheckCircle2, XCircle, AlertCircle, Umbrella,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';

import { Spacing, FontSizes, FontWeights, BorderRadius, Shadows } from '@/constants/Tokens';
import { ThemeColors } from '@/constants/ThemeColors';
import { useAuthStore } from '@/store';
import { attendanceApi, AttendanceRecord, AttendanceStatus } from '@/lib/attendance-api';
import { teamApi, Team } from '@/lib/team-api';

import { calculateCong } from '@/utils/attendance';

// ─── Constants ────────────────────────────────────────────────

const STATUS_CONFIG: Record<AttendanceStatus, { label: string; color: string; bg: string; Icon: any }> = {
    PRESENT: { label: 'Có mặt',    color: '#10B981', bg: 'rgba(16,185,129,0.12)',  Icon: CheckCircle2 },
    ABSENT:  { label: 'Vắng mặt',  color: '#EF4444', bg: 'rgba(239,68,68,0.12)',   Icon: XCircle      },
    LATE:    { label: 'Đi muộn',   color: '#F59E0B', bg: 'rgba(245,158,11,0.12)',  Icon: AlertCircle  },
    LEAVE:   { label: 'Nghỉ phép', color: '#6366F1', bg: 'rgba(99,102,241,0.12)',  Icon: Umbrella     },
};

const DAY_NAMES = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

function toShift(hours: number): string {
    const cong = calculateCong(hours);
    if (cong <= 0) return '0.0 công';
    return cong.toFixed(1) + ' công';
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

function fmtTime(dateStr?: string | null) {
    if (!dateStr) return '--:--';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '--:--';
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
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
        <View style={s.monthPicker}>
            <Pressable onPress={prev} hitSlop={8} style={s.monthBtn}>
                <ChevronLeft size={16} color="#59677B" />
            </Pressable>
            <Text style={s.monthLabel}>T{month}/{year}</Text>
            <Pressable onPress={next} hitSlop={8} style={s.monthBtn} disabled={isMax}>
                <ChevronRight size={16} color={isMax ? '#D1D5DB' : '#59677B'} />
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
        { label: 'Tổng Công', value: toShift(totalHrs),          color: '#FFFFFF' },
        { label: 'Tăng ca',   value: otHrs > 0 ? otHrs.toFixed(1) + 'h' : '0h',     color: '#FCD34D' },
    ];
    return (
        <Animated.View entering={FadeInDown.duration(450).delay(80).springify().damping(16)} style={s.summaryWrap}>
            <View style={s.sOrb1} /><View style={s.sOrb2} />
            <View style={s.summaryCard}>
                <View style={s.summaryHeader}>
                    <CalendarDays size={15} color="#0156A7" />
                    <Text style={s.summaryTitle}>Tháng {month}/{year}</Text>
                    <Text style={s.summaryMeta}>{groups.length} NV · {totalRecords} ngày</Text>
                </View>
                <View style={s.statsGrid}>
                    {stats.map(st => (
                        <View key={st.label} style={s.statItem}>
                            <Text style={[s.statValue, { color: st.label === 'Tổng Công' || st.label === 'Tăng ca' ? '#0156A7' : st.color }]}>{st.value}</Text>
                            <Text style={s.statLabel}>{st.label}</Text>
                        </View>
                    ))}
                </View>
            </View>
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
                style={({ pressed }) => [s.empRow, pressed && { opacity: 0.75 }]}
                onPress={onPress}
            >
                <View style={s.empRowInner}>
                    {/* Avatar */}
                    <LinearGradient colors={['#0156A7', '#0284C7']} style={s.avatar}>
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
                            {group.present > 0  && (
                                <View style={[s.pill, { backgroundColor: 'rgba(16,185,129,0.12)' }]}>
                                    <Text style={[s.pillT, { color: '#10B981' }]}>{group.present}✓</Text>
                                </View>
                            )}
                            {group.absent > 0   && (
                                <View style={[s.pill, { backgroundColor: 'rgba(239,68,68,0.12)' }]}>
                                    <Text style={[s.pillT, { color: '#EF4444' }]}>{group.absent}✗</Text>
                                </View>
                            )}
                            {group.late > 0     && (
                                <View style={[s.pill, { backgroundColor: 'rgba(245,158,11,0.12)' }]}>
                                    <Text style={[s.pillT, { color: '#F59E0B' }]}>{group.late}⚠</Text>
                                </View>
                            )}
                            {group.leave > 0    && (
                                <View style={[s.pill, { backgroundColor: 'rgba(99,102,241,0.12)' }]}>
                                    <Text style={[s.pillT, { color: '#6366F1' }]}>{group.leave}休</Text>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Hours + chevron */}
                    <View style={s.empRight}>
                        <Text style={[s.empHours, { color: colors.textAccent }]}>{toShift(group.totalHours)}</Text>
                        {group.otHours > 0 && (
                            <Text style={s.empOT}>+{group.otHours.toFixed(1)}h OT</Text>
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
                    <View style={s.modalHeaderContainer}>
                        <View style={s.modalHeaderGradient}>
                            <View style={s.modalHeaderTop}>
                                <View style={s.modalAvatarContainer}>
                                    <View style={s.modalAvatarInner}>
                                        <Text style={s.modalAvatarText}>
                                            {group.fullName.split(' ').map((w: string) => w[0]).slice(-2).join('').toUpperCase()}
                                        </Text>
                                    </View>
                                </View>
                                <View style={s.modalHeaderInfo}>
                                    <Text style={s.modalNameLight} numberOfLines={1}>{group.fullName}</Text>
                                    <Text style={s.modalMetaLight}>
                                        {group.employeeCode}{group.teamName ? ` • ${group.teamName}` : ''}
                                    </Text>
                                    <View style={s.modalBadge}>
                                        <CalendarDays size={10} color="#0156A7" />
                                        <Text style={s.modalBadgeText}>Tháng {month}/{year}</Text>
                                    </View>
                                </View>
                                <Pressable onPress={onClose} style={s.modalCloseLight}>
                                    <X size={20} color="#212529" />
                                </Pressable>
                            </View>

                            <View style={s.modalSummaryGrid}>
                                {[
                                    { label: 'Có mặt',   value: group.present,  color: '#10B981' },
                                    { label: 'Vắng',     value: group.absent,   color: '#EF4444' },
                                    { label: 'Đi muộn',  value: group.late,     color: '#F59E0B' },
                                    { label: 'Nghỉ',     value: group.leave,    color: '#A78BFA' },
                                    { label: 'Tổng Công', value: calculateCong(group.totalHours).toFixed(1), color: '#0156A7' },
                                ].map((st, idx) => (
                                    <View key={st.label} style={[s.modalSummaryItem, idx < 4 && s.modalSummaryItemBorder]}>
                                        <Text style={[s.modalSummaryVal, { color: st.color }]}>{st.value}</Text>
                                        <Text style={s.modalSummaryLbl}>{st.label}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    </View>

                    {/* Calculation Logic Visualization */}
                    <View style={s.logicSection}>
                        <View style={[s.logicCard, { backgroundColor: colors.inputBg }]}>
                            <View style={s.logicIcon}>
                                <TrendingUp size={16} color={colors.textAccent} />
                            </View>
                            <View style={s.logicContent}>
                                <Text style={[s.logicTitle, { color: colors.textPrimary }]}>Công thức tính công</Text>
                                <View style={s.formulaRow}>
                                    <View style={s.formulaPart}>
                                        <Text style={[s.formulaVal, { color: colors.textAccent }]}>Số giờ</Text>
                                        <View style={s.formulaLine} />
                                        <Text style={[s.formulaSub, { color: colors.textMuted }]}>9.0</Text>
                                    </View>
                                    <Text style={[s.formulaEqual, { color: colors.textMuted }]}>=</Text>
                                    <Text style={[s.formulaResult, { color: '#10B981' }]}>Công</Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* Daily list */}
                    <ScrollView contentContainerStyle={s.modalList} showsVerticalScrollIndicator={false}>
                        {sorted.length === 0 ? (
                            <View style={s.modalEmpty}>
                                <Text style={[s.modalEmptyT, { color: colors.textMuted }]}>Không có dữ liệu</Text>
                            </View>
                        ) : (
                            sorted.map((r, i) => {
                                const cfg = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.PRESENT;
                                const StatusIcon = cfg.Icon;
                                const { day, weekday, month: mo } = fmtDate(r.date);
                                return (
                                    <View key={r.id} style={[
                                        s.dayRow, 
                                        i < sorted.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.divider },
                                        (r.status === 'ABSENT' || r.status === 'LATE') && { backgroundColor: cfg.bg + '20' }
                                    ]}>
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

                                        {/* Times */}
                                        <View style={s.dayTimes}>
                                            <View style={s.timeItem}>
                                                <Text style={[s.timeLbl, { color: colors.textMuted }]}>Vào</Text>
                                                <Text style={[s.timeVal, { color: colors.textPrimary }]}>{fmtTime(r.checkIn)}</Text>
                                            </View>
                                            <View style={s.timeItem}>
                                                <Text style={[s.timeLbl, { color: colors.textMuted }]}>Ra</Text>
                                                <Text style={[s.timeVal, { color: colors.textPrimary }]}>{fmtTime(r.checkOut)}</Text>
                                            </View>
                                        </View>

                                        {/* Hours: cong + OT */}
                                        <View style={s.dayHours}>
                                            <Text style={[s.dayCong, { color: colors.textAccent }]}>{toShift(Number(r.workHours))}</Text>
                                            {Number(r.overtimeHours) > 0 && (
                                                <Text style={s.dayOT}>+{Number(r.overtimeHours).toFixed(1)}h OT</Text>
                                            )}
                                        </View>

                                        {/* Mark / Note (optional) */}
                                        {(r.mark || r.note) ? (
                                            <View style={s.dayInfoBtn}>
                                                <AlertCircle size={14} color={colors.textMuted} />
                                            </View>
                                        ) : null}
                                    </View>
                                );
                            })
                        )}
                        <View style={{ height: 40 }} />
                    </ScrollView>
                </Animated.View>
            </View>
        </Modal>
    );
}

// ─── Main Screen ──────────────────────────────────────────────

type ViewMode = 'PERSONAL' | 'TEAM';

export default function AttendanceScreen() {
    const router = useRouter();
    const { user } = useAuthStore();
    const colors = ThemeColors.light;
    const isAdmin = user?.role === 'ADMIN' || user?.role === 'MANAGER';

    const now = new Date();
    const [viewMode, setViewMode]         = useState<ViewMode>(isAdmin ? 'TEAM' : 'PERSONAL');
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
            
            // For regular users, always only their own records
            // For admins/managers, depends on viewMode
            if (!isAdmin || viewMode === 'PERSONAL') {
                const empId = (user as any)?.employeeId || user?.id;
                if (empId) filters.employeeId = empId;
            }
            // If isAdmin && viewMode === 'TEAM', we fetch all (no employeeId filter)

            const res = await attendanceApi.getAttendance(filters);
            setRecords(res.data);
        } catch { setRecords([]); }
        finally { setLoading(false); setRefreshing(false); }
    }, [year, month, isAdmin, user, viewMode]);

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
            <LinearGradient colors={['#F0F8FF', '#F9F9F9', '#FFFFFF']} style={StyleSheet.absoluteFill} />

            <SafeAreaView style={s.safe} edges={['top']}>
                {/* Header */}
                <Animated.View entering={FadeInDown.duration(400).springify().damping(20)} style={s.header}>
                    <Pressable style={s.headerBtn}
                        onPress={() => router.canGoBack() ? router.back() : router.replace('/home')}>
                        <ChevronLeft size={22} color="#212529" />
                    </Pressable>
                    <Text style={[s.headerTitle, { color: '#212529' }]}>Chấm công</Text>
                    <View style={s.monthPickerWrap}>
                         <MonthPicker month={month} year={year} onChange={(m, y) => { setMonth(m); setYear(y); }} />
                    </View>
                </Animated.View>

                {/* Filters */}
                <Animated.View entering={FadeInDown.duration(350).delay(60)} style={s.filtersWrap}>
                    {isAdmin && (
                        <View style={s.viewModeToggle}>
                            <Pressable 
                                style={[s.toggleBtn, viewMode === 'PERSONAL' && s.toggleBtnActive]} 
                                onPress={() => setViewMode('PERSONAL')}
                            >
                                <Text style={[s.toggleText, viewMode === 'PERSONAL' && s.toggleTextActive]}>Cá nhân</Text>
                            </Pressable>
                            <Pressable 
                                style={[s.toggleBtn, viewMode === 'TEAM' && s.toggleBtnActive]} 
                                onPress={() => setViewMode('TEAM')}
                            >
                                <Text style={[s.toggleText, viewMode === 'TEAM' && s.toggleTextActive]}>Đội nhóm</Text>
                            </Pressable>
                        </View>
                    )}

                    <View style={s.searchBar}>
                            <Search size={15} color="#9CA3AF" />
                            <TextInput
                                style={s.searchInput}
                                placeholder="Tìm nhân viên..."
                                placeholderTextColor="#9CA3AF"
                                value={search}
                                onChangeText={setSearch}
                            />
                            {search.length > 0 && (
                                <Pressable onPress={() => setSearch('')} hitSlop={8}>
                                    <X size={14} color="#9CA3AF" />
                                </Pressable>
                            )}
                    </View>
                    {teams.length > 0 && viewMode === 'TEAM' && (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
                            <Pressable style={[s.chip, !selectedTeam && s.chipOn]} onPress={() => setSelectedTeam('')}>
                                <Users size={11} color={!selectedTeam ? '#FFFFFF' : '#59677B'} />
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
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, paddingBottom: Spacing.md, gap: Spacing.sm, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
    headerBtn: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF', ...Shadows.small },
    headerTitle: { flex: 1, fontSize: FontSizes.lg, fontWeight: FontWeights.bold },

    // Month picker
    monthPickerWrap: { borderRadius: BorderRadius.lg, overflow: 'hidden', backgroundColor: '#FFFFFF', ...Shadows.small, borderWidth: 1, borderColor: '#E5E7EB' },
    monthPicker: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.sm, paddingVertical: 4, gap: 2 },
    monthBtn: { width: 28, height: 28, justifyContent: 'center', alignItems: 'center' },
    monthLabel: { fontSize: 13, fontWeight: FontWeights.bold, minWidth: 60, textAlign: 'center', color: '#212529' },

    // Filters
    filtersWrap: { paddingHorizontal: Spacing.xl, gap: Spacing.sm, marginBottom: Spacing.sm },
    viewModeToggle: { flexDirection: 'row', padding: 3, borderRadius: 20, marginBottom: 4, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', ...Shadows.small },
    toggleBtn: { flex: 1, paddingVertical: 6, alignItems: 'center', borderRadius: 18 },
    toggleBtnActive: { backgroundColor: '#0156A7' },
    toggleText: { fontSize: 11, fontWeight: FontWeights.medium, color: '#59677B' },
    toggleTextActive: { color: '#FFFFFF', fontWeight: FontWeights.bold },
    searchBar: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: 10, borderRadius: BorderRadius.lg, borderWidth: 1, backgroundColor: '#FFFFFF', borderColor: '#E5E7EB', ...Shadows.small },
    searchInput: { flex: 1, fontSize: FontSizes.sm, padding: 0, color: '#212529' },
    chips: { flexDirection: 'row', gap: Spacing.sm, paddingVertical: 2 },
    chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: BorderRadius.full, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', ...Shadows.small },
    chipOn: { backgroundColor: '#0156A7', borderColor: '#0156A7' },
    chipT: { fontSize: 11, fontWeight: FontWeights.medium, color: '#59677B' },
    chipTOn: { color: '#FFFFFF', fontWeight: FontWeights.bold },

    // Loader / empty
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.md },
    empty: { alignItems: 'center', paddingTop: 60, gap: Spacing.md },
    emptyT: { fontSize: FontSizes.base, fontWeight: FontWeights.semibold },
    emptySub: { fontSize: FontSizes.sm, textAlign: 'center' },

    // Scroll
    scroll: { paddingHorizontal: Spacing.xl, gap: Spacing.md },
    list: { gap: Spacing.sm },

    // Summary card
    summaryWrap: { borderRadius: BorderRadius.xxl, overflow: 'hidden', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', ...Shadows.medium },
    summaryCard: { padding: Spacing.xl, overflow: 'hidden' },
    sOrb1: { position: 'absolute', width: 130, height: 130, borderRadius: 65, backgroundColor: 'rgba(1,86,167,0.03)', top: -30, right: -20 },
    sOrb2: { position: 'absolute', width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(1,86,167,0.02)', bottom: -15, left: 40 },
    summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.lg },
    summaryTitle: { flex: 1, fontSize: FontSizes.base, fontWeight: FontWeights.bold, color: '#212529' },
    summaryMeta: { fontSize: FontSizes.xs, color: '#59677B' },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    statItem: { width: '33.33%', alignItems: 'center', paddingVertical: Spacing.sm },
    statValue: { fontSize: FontSizes.xl, fontWeight: FontWeights.extrabold },
    statLabel: { fontSize: FontSizes.xs, color: '#9CA3AF', marginTop: 2 },

    // Employee row
    empRow: { borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, backgroundColor: '#FFFFFF', borderColor: '#E5E7EB', ...Shadows.small },
    empRowInner: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.md },
    avatar: { width: 44, height: 44, borderRadius: 13, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
    avatarText: { fontSize: FontSizes.sm, fontWeight: FontWeights.extrabold, color: '#FFF' },
    empInfo: { flex: 1, gap: 3 },
    empName: { fontSize: FontSizes.sm, fontWeight: FontWeights.bold, color: '#212529' },
    empMeta: { fontSize: FontSizes.xs, color: '#59677B' },
    miniPills: { flexDirection: 'row', gap: 4, flexWrap: 'wrap' },
    pill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
    pillT: { fontSize: 10, fontWeight: FontWeights.bold },
    empRight: { alignItems: 'flex-end', gap: 2 },
    empHours: { fontSize: FontSizes.base, fontWeight: FontWeights.bold, color: '#212529' },
    empOT: { fontSize: 10, color: '#FCD34D', fontWeight: FontWeights.bold },

    // Detail modal
    modalOverlay: { flex: 1, justifyContent: 'flex-end' },
    modalSheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '90%', overflow: 'hidden', ...Shadows.large },
    modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#D1D5DB', position: 'absolute', top: 10, zIndex: 10, alignSelf: 'center' },
    
    // New Header Styles
    modalHeaderContainer: { width: '100%' },
    modalAvatarText: { fontSize: FontSizes.sm, fontWeight: FontWeights.extrabold, color: '#0156A7' },
    modalHeaderGradient: { paddingTop: 24, paddingBottom: 20, paddingHorizontal: Spacing.xl, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
    modalHeaderTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.xl },
    modalAvatarContainer: { width: 60, height: 60, borderRadius: 20, backgroundColor: '#F0F8FF', padding: 4 },
    modalAvatarInner: { flex: 1, borderRadius: 16, backgroundColor: 'rgba(1,86,167,0.1)', justifyContent: 'center', alignItems: 'center' },
    modalHeaderInfo: { flex: 1, gap: 2 },
    modalNameLight: { fontSize: FontSizes.lg, fontWeight: FontWeights.bold, color: '#212529' },
    modalMetaLight: { fontSize: FontSizes.xs, color: '#59677B' },
    modalBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F0F8FF', paddingHorizontal: 8, paddingVertical: 2, borderRadius: BorderRadius.full, marginTop: 4, borderWidth: 1, borderColor: 'rgba(1,86,167,0.2)' },
    modalBadgeText: { fontSize: 10, fontWeight: FontWeights.semibold, color: '#0156A7' },
    modalCloseLight: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F0F0F0', justifyContent: 'center', alignItems: 'center' },

    modalSummaryGrid: { flexDirection: 'row', backgroundColor: '#F9FAFB', borderRadius: BorderRadius.xl, paddingVertical: Spacing.md },
    modalSummaryItem: { flex: 1, alignItems: 'center' },
    modalSummaryItemBorder: { borderRightWidth: 1, borderRightColor: '#E5E7EB' },
    modalSummaryVal: { fontSize: FontSizes.base, fontWeight: FontWeights.extrabold },
    modalSummaryLbl: { fontSize: 10, color: '#9CA3AF', marginTop: 2 },

    // Logic Section
    logicSection: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg, paddingBottom: Spacing.sm },
    logicCard: { flexDirection: 'row', padding: Spacing.md, borderRadius: BorderRadius.lg, gap: Spacing.md, alignItems: 'center' },
    logicIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(1, 86, 167, 0.1)', justifyContent: 'center', alignItems: 'center' },
    logicContent: { flex: 1 },
    logicTitle: { fontSize: FontSizes.xs, fontWeight: FontWeights.bold, marginBottom: 4 },
    formulaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    formulaPart: { alignItems: 'center' },
    formulaVal: { fontSize: 11, fontWeight: FontWeights.bold },
    formulaLine: { width: 24, height: 1, backgroundColor: 'rgba(0,0,0,0.1)', marginVertical: 1 },
    formulaSub: { fontSize: 10, fontWeight: FontWeights.medium, color: 'rgba(0,0,0,0.4)' },
    formulaEqual: { fontSize: 12, fontWeight: FontWeights.bold },
    formulaResult: { fontSize: 12, fontWeight: FontWeights.extrabold },

    modalList: { paddingHorizontal: Spacing.xl },
    modalEmpty: { alignItems: 'center', paddingVertical: 40 },
    modalEmptyT: { fontSize: FontSizes.sm },

    // Day row inside modal
    dayRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 4, gap: Spacing.sm, borderRadius: BorderRadius.md },
    dayDate: { width: 42, alignItems: 'flex-start' },
    dayNum: { fontSize: 13, fontWeight: FontWeights.bold },
    dayWd: { fontSize: 10, marginTop: 1 },
    dayStatus: { width: 72, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 4, borderRadius: BorderRadius.full },
    dayStatusT: { fontSize: 9, fontWeight: FontWeights.bold },
    dayTimes: { width: 70, gap: 2 },
    timeItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    timeLbl: { fontSize: 9, fontWeight: FontWeights.medium },
    timeVal: { fontSize: 10, fontWeight: FontWeights.semibold },
    dayHours: { flex: 1, alignItems: 'flex-end', gap: 1 },
    dayCong: { fontSize: 12, fontWeight: FontWeights.bold },
    dayOT: { fontSize: 9, color: '#F59E0B', fontWeight: FontWeights.medium },
    dayInfoBtn: { marginLeft: 4 },
});


