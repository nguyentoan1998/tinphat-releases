// Product Outputs Screen — Simplified, Stable, No Flicker
import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, RefreshControl, ActivityIndicator, TextInput, Modal, FlatList, ListRenderItem, Share, Alert, Keyboard } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Package, ChevronLeft, ChevronDown, RefreshCw, CheckCircle, Clock, Banknote, SquareDashed, User, CalendarDays, FileText, Search, Users, X, Settings2, Eye, EyeOff, Save, Send } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { useAuthStore, useThemeStore } from '@/store';
import { productOutputApi, ProductOutput } from '@/lib/product-output-api';
import { teamApi, Team } from '@/lib/team-api';
import { employeeApi, Employee } from '@/lib/employee-api';
import PaginationFooter from '@/components/ui/PaginationFooter';

const toLocalISODate = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

import { Spacing, FontSizes, FontWeights, BorderRadius, Shadows } from '@/constants/Tokens';
import { ThemeColors } from '@/constants/ThemeColors';
import { useDarkDialog } from '@/components/ui/DarkDialog';

const fmtCurrency = (n: number | string) => {
    const num = Math.round(Number(n) || 0);
    return num.toLocaleString('vi-VN') + ' ₫';
};
const fmtMonth = (m: number, y: number) => `T${m}/${y}`;

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
type StatusFilter = 'all' | 'verified' | 'pending';
const PAGE_SIZE = 50;
type ViewMode = 'PERSONAL' | 'TEAM';

// ─── OutputCard Component (memoized, no entering animation) ───
interface OutputCardProps {
    out: ProductOutput;
    i: number;
    colors: any;
    showEmployee: boolean;
    fmtCurrency: (n: number | string) => string;
}

const OutputCard = React.memo(function OutputCard({ out, i, colors, showEmployee, fmtCurrency }: OutputCardProps) {
    return (
        <View style={styles.card}>
            <View style={styles.cardInner}>
                {/* Top: icon + title + status */}
                <View style={styles.cardTop}>
                    <View style={[
                        styles.cardIconWrap,
                        { backgroundColor: out.verified ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)' }
                    ]}>
                        <Package size={16} color={out.verified ? '#10B981' : '#F59E0B'} />
                    </View>
                    <View style={styles.cardTitleWrap}>
                        <Text style={[styles.cTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                            {out.Product?.name || out.productId}
                        </Text>
                        {out.Product?.name ? (
                            <Text style={[styles.cSub, { color: colors.textSecondary }]} numberOfLines={1}>
                                {out.Product?.code || 'Mã SP'}
                            </Text>
                        ) : null}
                    </View>
                    <View style={[
                        styles.statusBadge,
                        { backgroundColor: out.verified ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)' }
                    ]}>
                        {out.verified ? <CheckCircle size={13} color="#10B981" /> : <Clock size={13} color="#F59E0B" />}
                        <Text style={[styles.statusText, { color: out.verified ? '#10B981' : '#F59E0B' }]}>
                            {out.verified ? 'Xác nhận' : 'Chờ duyệt'}
                        </Text>
                    </View>
                </View>

                {/* Meta: employee + date + order */}
                <View style={[styles.metaRow, { borderTopColor: colors.divider }]}>
                    {showEmployee && (
                        <View style={styles.metaItem}>
                            <User size={12} color={colors.textMuted} />
                            <Text style={[styles.metaText, { color: colors.textSecondary }]} numberOfLines={1}>
                                {out.Employee?.fullName || out.employeeId}
                            </Text>
                        </View>
                    )}
                    <View style={styles.metaItem}>
                        <CalendarDays size={12} color={colors.textMuted} />
                        <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                            {new Date(out.outputDate).toLocaleDateString('vi-VN')}
                        </Text>
                    </View>
                    {out.ProductionOrder && (
                        <View style={styles.metaItem}>
                            <FileText size={12} color={colors.textMuted} />
                            <Text style={[styles.metaText, { color: '#38BDF8' }]}>
                                {out.ProductionOrder.orderNumber}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Detail: qty + salary */}
                <View style={[styles.detailRow, { borderTopColor: colors.divider }]}>
                    <View style={styles.detItem}>
                        <Text style={[styles.detL, { color: colors.textMuted }]}>Số lượng</Text>
                        <Text style={[styles.detV, { color: '#F59E0B' }]}>{out.quantity || 0} SP</Text>
                    </View>
                    <View style={[styles.detDivider, { backgroundColor: colors.divider }]} />
                    <View style={styles.detItem}>
                        <Text style={[styles.detL, { color: colors.textMuted }]}>Lương khoán</Text>
                        <Text style={[styles.detV, { color: '#818CF8' }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                            {fmtCurrency(out.salaryAmount || 0)}
                        </Text>
                    </View>
                </View>

                {/* Note */}
                {out.note ? (
                    <View style={[styles.noteWrap, { backgroundColor: 'rgba(0,0,0,0.03)', borderColor: colors.cardBorder }]}>
                        <Text style={[styles.note, { color: colors.textSecondary }]}>{out.note}</Text>
                    </View>
                ) : null}
            </View>
        </View>
    );
}, (prev, next) => prev.out.id === next.out.id && prev.i === next.i);

// ─── Employee Autocomplete Component (Admin only in TEAM mode) ───
interface EmployeeAutocompleteProps {
    employees: Employee[];
    selectedEmployeeId: string;
    onSelect: (id: string) => void;
    colors: any;
}

function EmployeeAutocomplete({ employees, selectedEmployeeId, onSelect, colors, isOpen, setIsOpen }: EmployeeAutocompleteProps & { isOpen: boolean; setIsOpen: (v: boolean) => void }) {
    const [isFocused, setIsFocused] = useState(false);
    const [filterText, setFilterText] = useState('');
    const dropdownRef = useRef<View>(null);

    const filteredEmployees = useMemo(() => {
        if (!filterText) return employees;
        const lower = filterText.toLowerCase();
        return employees.filter(e =>
            e.fullName.toLowerCase().includes(lower) ||
            e.employeeCode?.toLowerCase().includes(lower)
        );
    }, [employees, filterText]);

    const displayOptions = [{ id: '', fullName: 'Tất cả nhân viên', employeeCode: '' }, ...filteredEmployees];

    const handleSelect = (id: string) => {
        onSelect(id);
        setIsOpen(false);
        setFilterText('');
    };

    return (
        <View style={{ flex: 1, zIndex: 1000, overflow: 'visible' }}>
            <Pressable
                style={[styles.autocompleteTrigger, {
                    borderColor: selectedEmployeeId ? '#F59E0B' : colors.cardBorder,
                    backgroundColor: selectedEmployeeId ? 'rgba(245,158,11,0.1)' : colors.inputBg,
                    flexDirection: 'row', gap: 6, paddingHorizontal: 12, width: '100%', justifyContent: 'space-between',
                }]}
                onPress={() => setIsOpen(!isOpen)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setTimeout(() => setIsFocused(false), 200)}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                    <User size={16} color={selectedEmployeeId ? '#F59E0B' : colors.textMuted} />
                    <Text style={{ fontSize: FontSizes.sm, color: selectedEmployeeId ? '#F59E0B' : colors.textSecondary, flex: 1 }} numberOfLines={1}>
                        {employees.find(e => e.id === selectedEmployeeId)?.fullName || 'Chọn nhân viên'}
                    </Text>
                </View>
                <ChevronDown size={14} color={colors.textMuted} />
            </Pressable>

            {isOpen && (
                <>
                    <Pressable onPress={() => setIsOpen(false)} style={styles.dropdownOverlay} />
                    <View style={[styles.dropdown, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
                    <TextInput
                        style={styles.dropdownSearch}
                        placeholder="Tìm nhân viên..."
                        placeholderTextColor={colors.textMuted}
                        value={filterText}
                        onChangeText={setFilterText}
                        onFocus={() => setIsFocused(true)}
                        autoFocus
                    />
                    <FlatList
                        data={displayOptions}
                        keyExtractor={i => i.id}
                        contentContainerStyle={{ paddingBottom: Spacing.xl }}
                        renderItem={({ item }) => (
                            <Pressable
                                style={{
                                    flexDirection: 'row', alignItems: 'center',
                                    paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl,
                                    borderBottomWidth: 1, borderBottomColor: colors.divider
                                }}
                                onPress={() => handleSelect(item.id)}
                            >
                                <View style={{ flex: 1 }}>
                                    <Text style={{
                                        fontSize: FontSizes.base,
                                        color: selectedEmployeeId === item.id ? '#F59E0B' : colors.textPrimary,
                                        fontWeight: selectedEmployeeId === item.id ? 'bold' : 'normal'
                                    }}>
                                        {item.fullName}
                                    </Text>
                                    {item.employeeCode ? <Text style={{ fontSize: FontSizes.xs, color: colors.textMuted }}>{item.employeeCode}</Text> : null}
                                </View>
                                {selectedEmployeeId === item.id && <CheckCircle size={18} color="#F59E0B" />}
                            </Pressable>
                        )}
                    />
                </View>
            </>)}
        </View>
    );
}

// ─── Team Autocomplete Component ───
interface TeamAutocompleteProps {
    teams: Team[];
    selectedTeamId: string;
    onSelect: (id: string) => void;
    colors: any;
}

function TeamAutocomplete({ teams, selectedTeamId, onSelect, colors, isOpen, setIsOpen }: TeamAutocompleteProps & { isOpen: boolean; setIsOpen: (v: boolean) => void }) {
    const [filterText, setFilterText] = useState('');

    const filteredTeams = useMemo(() => {
        if (!filterText) return teams;
        const lower = filterText.toLowerCase();
        return teams.filter(t => t.name.toLowerCase().includes(lower));
    }, [teams, filterText]);

    const displayOptions = [{ id: '', name: 'Tất cả tổ' } as any, ...filteredTeams];
    const selectedTeam = teams.find(t => t.id === selectedTeamId);

    const handleSelect = (id: string) => {
        onSelect(id);
        setIsOpen(false);
        setFilterText('');
    };

    return (
        <View style={{ flex: 1, zIndex: 1000, overflow: 'visible' }}>
            <Pressable
                style={[styles.autocompleteTrigger, {
                    borderColor: selectedTeamId ? '#818CF8' : colors.cardBorder,
                    backgroundColor: selectedTeamId ? 'rgba(129,140,248,0.1)' : colors.inputBg,
                    flexDirection: 'row', gap: 6, paddingHorizontal: 12, width: '100%', justifyContent: 'space-between',
                }]}
                onPress={() => setIsOpen(!isOpen)}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                    <Users size={16} color={selectedTeamId ? '#818CF8' : colors.textMuted} />
                    <Text style={{ fontSize: FontSizes.sm, color: selectedTeam ? '#818CF8' : colors.textSecondary, flex: 1 }} numberOfLines={1}>
                        {selectedTeam?.name || 'Chọn tổ'}
                    </Text>
                </View>
                <ChevronDown size={14} color={colors.textMuted} />
            </Pressable>

            {isOpen && (
                <>
                    <Pressable onPress={() => setIsOpen(false)} style={styles.dropdownOverlay} />
                    <View style={[styles.dropdown, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
                    <TextInput
                        style={[styles.dropdownSearch, { color: colors.textPrimary, borderBottomColor: colors.divider }]}
                        placeholder="Tìm tổ..."
                        placeholderTextColor={colors.textMuted}
                        value={filterText}
                        onChangeText={setFilterText}
                        autoFocus
                    />
                    <FlatList
                        data={displayOptions}
                        keyExtractor={i => i.id || 'all'}
                        contentContainerStyle={{ paddingBottom: Spacing.xl }}
                        renderItem={({ item }) => (
                            <Pressable
                                style={{
                                    flexDirection: 'row', alignItems: 'center',
                                    paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl,
                                    borderBottomWidth: 1, borderBottomColor: colors.divider
                                }}
                                onPress={() => handleSelect(item.id)}
                            >
                                <Text style={{
                                    flex: 1,
                                    fontSize: FontSizes.base,
                                    color: selectedTeamId === item.id ? '#818CF8' : colors.textPrimary,
                                    fontWeight: selectedTeamId === item.id ? '700' as const : '400' as const
                                }}>
                                    {item.name}
                                </Text>
                                {selectedTeamId === item.id && <CheckCircle size={18} color="#818CF8" />}
                            </Pressable>
                        )}
                    />
                </View>
            </>
            )}
        </View>
    );
}
export default function ProductOutputsScreen() {
    const router = useRouter();
    const { user, isAuthenticated } = useAuthStore();
    const { isDark } = useThemeStore();
    const colors = ThemeColors.light;
    const { showDialog, DialogComponent } = useDarkDialog();

    const isAdmin = user?.role === 'ADMIN';
    const isManager = user?.role === 'MANAGER';
    const canViewTeam = isAdmin || isManager;

    // View mode: PERSONAL (my outputs) or TEAM (team outputs)
    const [viewMode, setViewMode] = useState<ViewMode>(canViewTeam ? 'TEAM' : 'PERSONAL');

    // Filters
    const now = new Date();
    const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
    const [selectedYear] = useState<number>(now.getFullYear());
    const [selectedTeamId, setSelectedTeamId] = useState<string>('');
    const [searchInputValue, setSearchInputValue] = useState(''); // Local input state (no flicker)
    const [debouncedSearch, setDebouncedSearch] = useState(''); // Debounced for API
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

    // Employee filter (Admin only in TEAM mode)
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
    const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);

    // Teams & employees
    const [teams, setTeams] = useState<Team[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [isTeamOpen, setIsTeamOpen] = useState(false);
    const [isEmployeeOpen, setIsEmployeeOpen] = useState(false);

    // Search input ref for focus management
    const searchInputRef = useRef<TextInput>(null);

    // Load teams & employees once — only when authenticated
    useEffect(() => {
        if (!isAuthenticated) return;
        employeeApi.getEmployees().then(setEmployees).catch(() => { });
        teamApi.getTeams().then(data => {
            const resolvedData = Array.isArray(data) ? data : (data as any)?.data || [];
            setTeams(resolvedData.map((t: any) => ({ ...t, outputVisible: t.outputVisible ?? true })));
        }).catch(() => { });
    }, [isAuthenticated]);

    // Debounce search (800ms) - only update debouncedSearch for API
    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(searchInputValue), 800);
        return () => clearTimeout(t);
    }, [searchInputValue]);

    // Handle search input change - local state only, no flicker
    const handleSearchChange = useCallback((text: string) => {
        setSearchInputValue(text);
    }, []);

    // ─── Effective filters for API ───
    const myEmployeeId = (user as any)?.employeeId || '';

    // In PERSONAL mode: always filter by my employeeId
    // In TEAM mode (Admin): use selectedEmployeeId if set
    // In TEAM mode (Manager): no employee filter (sees whole team)
    const effectiveEmployeeId = useMemo(() => {
        if (viewMode === 'PERSONAL') return myEmployeeId;
        if (isAdmin && selectedEmployeeId) return selectedEmployeeId;
        return ''; // Manager or Admin without filter
    }, [viewMode, isAdmin, myEmployeeId, selectedEmployeeId]);

    const effectiveTeamId = useMemo(() => {
        if (!isAdmin || viewMode !== 'TEAM') return '';
        return selectedTeamId;
    }, [isAdmin, viewMode, selectedTeamId]);

    // ─── Queries ───
    const outputsQuery = useInfiniteQuery({
        queryKey: [
            'product-outputs',
            selectedMonth,
            selectedYear,
            effectiveTeamId,
            statusFilter,
            debouncedSearch, // Use debounced search
            effectiveEmployeeId,
            viewMode,
        ],
        queryFn: ({ pageParam }) => {
            const month = selectedMonth === 0 ? undefined : selectedMonth;
            const year = selectedMonth === 0 ? undefined : selectedYear;

            return productOutputApi.getOutputs({
                month,
                year,
                verified: statusFilter === 'all' ? undefined : statusFilter === 'verified',
                search: debouncedSearch.trim() || undefined,
                teamId: effectiveTeamId || undefined,
                employeeId: effectiveEmployeeId || undefined,
                page: Number(pageParam ?? 1),
                limit: PAGE_SIZE,
            });
        },
        initialPageParam: 1,
        getNextPageParam: (lastPage: any) => {
            if (lastPage?.meta?.hasNext) return lastPage.meta.page + 1;
            return undefined;
        },
        staleTime: 15000, // Cache for 15s
        enabled: isAuthenticated,
    });

    // Stats query (for totals)
    const statsQuery = useQuery({
        queryKey: [
            'product-outputs-stats',
            selectedMonth,
            selectedYear,
            effectiveTeamId,
            statusFilter,
            debouncedSearch,
            effectiveEmployeeId,
            viewMode,
        ],
        queryFn: () => {
            const month = selectedMonth === 0 ? undefined : selectedMonth;
            const year = selectedMonth === 0 ? undefined : selectedYear;
            return productOutputApi.getOutputs({
                month,
                year,
                verified: statusFilter === 'all' ? undefined : statusFilter === 'verified',
                search: debouncedSearch.trim() || undefined,
                teamId: effectiveTeamId || undefined,
                employeeId: effectiveEmployeeId || undefined,
                limit: 0,
            });
        },
        staleTime: 30000,
        enabled: isAuthenticated && !outputsQuery.isLoading, // Wait for main query and require auth
    });

    const statsAll = useMemo(() => {
        const data = statsQuery.data;
        if (!data) return [];
        return Array.isArray(data) ? data : ((data as any)?.data || []);
    }, [statsQuery.data]);

    const allOutputs = useMemo(() => {
        return outputsQuery.data?.pages.flatMap((p: any) => Array.isArray(p) ? p : (p?.data || [])) ?? [];
    }, [outputsQuery.data]);

    const totalQty = useMemo(() => statsAll.reduce((s: number, o: any) => s + (Number(o.quantity) || 0), 0), [statsAll]);
    const totalSalary = useMemo(() => statsAll.reduce((s: number, o: any) => s + (Number(o.salaryAmount) || 0), 0), [statsAll]);
    const verifiedCount = useMemo(() => statsAll.filter((o: any) => o.verified).length, [statsAll]);

    // ─── Actions ───
    const onRefresh = useCallback(async () => {
        await Promise.all([
            outputsQuery.refetch(),
            statsQuery.refetch(),
        ]);
    }, [outputsQuery, statsQuery]);

    const onEndReached = useCallback(() => {
        if (outputsQuery.hasNextPage && !outputsQuery.isFetchingNextPage) {
            outputsQuery.fetchNextPage();
        }
    }, [outputsQuery.hasNextPage, outputsQuery.isFetchingNextPage, outputsQuery.fetchNextPage]);

    const handleSendZalo = async () => {
        if (statsAll.length === 0) {
            Alert.alert('Thông báo', 'Không có dữ liệu để gửi.');
            return;
        }
        const sorted = [...statsAll].sort((a: any, b: any) =>
            new Date(a.outputDate).getTime() - new Date(b.outputDate).getTime()
        );

        const periodLabel = selectedMonth === 0 ? `Năm ${selectedYear}` : fmtMonth(selectedMonth, selectedYear);
        const getUnitPrice = (item: any): number => {
            if (item.isDailyRate) {
                const qty = Number(item.quantity) || 1;
                return qty > 0 ? Math.round(Number(item.salaryAmount) / qty) : 0;
            }
            const stepPrice = Number(item.RoutingStep?.salaryPrice || 0);
            if (stepPrice > 0) return stepPrice;
            return Number(item.Product?.salaryPrice || 0);
        };

        const pad = (s: string, len: number) => {
            const str = String(s);
            return str.length >= len ? str.substring(0, len) : str + ' '.repeat(len - str.length);
        };
        const padL = (s: string, len: number) => {
            const str = String(s);
            return str.length >= len ? str.substring(0, len) : ' '.repeat(len - str.length) + str;
        };

        const SEP = `+----+-------+--------------+----------------+-------+----------+----------+----------+\n`;
        const HDR = `|STT | Ngày  | Nhân viên    | Sản phẩm       | Loại  | SL       | Đơn giá  | T.tiền   |\n`;

        let rows = '';
        sorted.forEach((item: any, idx: number) => {
            const dateStr = new Date(item.outputDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
            const emp = pad(item.Employee?.fullName || '-', 12);
            const prod = pad(item.Product?.name || '-', 14);
            const loai = item.isDailyRate ? 'Nhật ' : 'Khoán';
            const qty = padL((Number(item.quantity) || 0).toLocaleString('vi-VN'), 8);
            const unitPrice = padL(getUnitPrice(item).toLocaleString('vi-VN'), 8);
            const amount = padL((Number(item.salaryAmount) || 0).toLocaleString('vi-VN'), 8);
            rows += `|${padL(String(idx + 1), 3)} | ${pad(dateStr, 5)} | ${emp} | ${prod} | ${loai} | ${qty} | ${unitPrice} | ${amount} |\n`;
        });

        const totalAmount = sorted.reduce((s: number, o: any) => s + (Number(o.salaryAmount) || 0), 0);
        const footerRow = `|TỔNG|       |              |                |       | ${padL(totalQty.toLocaleString('vi-VN'), 8)} |          | ${padL(totalAmount.toLocaleString('vi-VN'), 8)} |\n`;

        let message = `📦 BÁO CÁO SẢN LƯỢNG - ${periodLabel}\n\`\`\`\n`;
        message += SEP + HDR + SEP + rows + SEP + footerRow + SEP;
        message += `\`\`\`\n`;
        message += `📊 Tổng SP: ${totalQty.toLocaleString('vi-VN')} | 💰 Tổng lương: ${totalSalary.toLocaleString('vi-VN')} đ\n`;
        message += `_Loại: Nhật=Công nhật | Khoán=Khoán sản lượng_`;

        try {
            await Share.share({ message });
        } catch {
            Alert.alert('Lỗi', 'Không thể chia sẻ báo cáo.');
        }
    };

    // ─── Render Item (stable key) ───
    const renderItem: ListRenderItem<any> = useCallback(({ item, index }) => (
        <OutputCard out={item} i={index} colors={colors} showEmployee={viewMode === 'TEAM'} fmtCurrency={fmtCurrency} />
    ), [colors, viewMode]);

    const keyExtractor = useCallback((item: any, index: number) => {
        // item.id should be unique, fallback to index to avoid duplicate key warning on web
        return item.id ? `${item.id}_${index}` : `idx_${index}`;
    }, []);

    const Footer = () => (
        <PaginationFooter
            hasNextPage={!!outputsQuery.hasNextPage}
            isFetchingNextPage={outputsQuery.isFetchingNextPage}
            loadedCount={allOutputs.length}
            totalCount={statsAll.length || undefined}
            onLoadMore={onEndReached}
            accentColor="#14B8A6"
        />
    );

    const EmptyLayer = () => {
        if (outputsQuery.isLoading) {
            return (
                <View style={styles.emptyW}>
                    <ActivityIndicator size="large" color="#14B8A6" />
                    <Text style={[styles.loadingText, { color: colors.textMuted }]}>Đang tải dữ liệu...</Text>
                </View>
            );
        }
        return (
            <View style={styles.emptyW}>
                <View style={styles.emptyIcon}>
                    <Package size={32} color="#14B8A6" />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Không có dữ liệu</Text>
                <Text style={[styles.emptyT, { color: colors.textMuted }]}>
                    {searchInputValue ? 'Thử tìm kiếm từ khóa khác' : 'Không có sản lượng trong kỳ này'}
                </Text>
            </View>
        );
    };

    // ─── List Header (Filters) — simplified, filters moved outside to prevent focus loss and for correct order
    const ListHeaderComponent = useCallback(() => <View style={{ height: Spacing.sm }} />, []);

    return (
        <View style={styles.root}>
            <StatusBar style="dark" />
            <LinearGradient colors={colors.gradientColors} style={StyleSheet.absoluteFill} />

            <SafeAreaView style={styles.safe} edges={['top']}>
                {/* Header */}
                <View style={styles.header}>
                    <Pressable style={[styles.backBtn, { backgroundColor: colors.inputBg }]} onPress={() => router.back()}>
                        <ChevronLeft size={22} color={colors.textPrimary} />
                    </Pressable>
                    <View style={styles.headerCenter}>
                        <View style={styles.headerIcon}>
                            <Package size={18} color="#FFF" strokeWidth={2.5} />
                        </View>
                        <View>
                            <Text style={[styles.title, { color: colors.textPrimary }]}>Tổng hợp SP</Text>
                            <Text style={[styles.sub, { color: colors.textSecondary }]}>
                                {selectedMonth === 0 ? `Tất cả ${selectedYear}` : fmtMonth(selectedMonth, selectedYear)}
                            </Text>
                        </View>
                    </View>
                    <View style={{ flexDirection: 'row', gap: Spacing.xs }}>
                        <Pressable style={[styles.backBtn, { backgroundColor: colors.inputBg }]} onPress={handleSendZalo}>
                            <Send size={16} color={colors.textSecondary} />
                        </Pressable>
                        <Pressable style={[styles.backBtn, { backgroundColor: colors.inputBg }]} onPress={onRefresh}>
                            <RefreshCw size={16} color={colors.textSecondary} />
                        </Pressable>
                    </View>
                </View>

                <View style={{ gap: Spacing.sm, paddingTop: Spacing.sm, zIndex: 20, overflow: 'visible', position: 'relative' }}>
                    {/* Stats Row — cardview */}
                    <View style={styles.statsRow}>
                        <View style={styles.statCard}>
                            <View style={styles.statInner}>
                                <View style={[styles.statIconWrap, { backgroundColor: 'rgba(245,158,11,0.15)' }]}>
                                    <SquareDashed size={16} color="#F59E0B" />
                                </View>
                                <Text style={[styles.statV, { color: '#F59E0B' }]} numberOfLines={1}>{totalQty.toLocaleString('vi-VN')}</Text>
                                <Text style={[styles.statL, { color: colors.textMuted }]}>Tổng SP</Text>
                            </View>
                        </View>
                        <View style={styles.statCard}>
                            <View style={styles.statInner}>
                                <View style={[styles.statIconWrap, { backgroundColor: 'rgba(16,185,129,0.15)' }]}>
                                    <CheckCircle size={16} color="#10B981" />
                                </View>
                                <Text style={[styles.statV, { color: '#10B981' }]}>{verifiedCount}</Text>
                                <Text style={[styles.statL, { color: colors.textMuted }]}>Xác nhận</Text>
                            </View>
                        </View>
                        <View style={styles.statCard}>
                            <View style={styles.statInner}>
                                <View style={[styles.statIconWrap, { backgroundColor: 'rgba(129,140,248,0.15)' }]}>
                                    <Banknote size={16} color="#818CF8" />
                                </View>
                                <Text style={[styles.statV, { color: '#818CF8', fontSize: 13 }]} numberOfLines={1}>{fmtCurrency(totalSalary)}</Text>
                                <Text style={[styles.statL, { color: colors.textMuted }]}>Lương khoán</Text>
                            </View>
                        </View>
                    </View>

                    {/* ViewMode Toggle */}
                    {canViewTeam && (
                        <View style={{ paddingHorizontal: Spacing.xl }}>
                            <View style={styles.viewModeToggle}>
                                <Pressable
                                    style={[styles.toggleBtn, viewMode === 'PERSONAL' && styles.toggleBtnActive]}
                                    onPress={() => setViewMode('PERSONAL')}
                                >
                                    <Text style={[styles.toggleText, viewMode === 'PERSONAL' && styles.toggleTextActive]}>Cá nhân</Text>
                                </Pressable>
                                <Pressable
                                    style={[styles.toggleBtn, viewMode === 'TEAM' && styles.toggleBtnActive]}
                                    onPress={() => {
                                        setViewMode('TEAM');
                                        setSelectedEmployeeId('');
                                    }}
                                >
                                    <Text style={[styles.toggleText, viewMode === 'TEAM' && styles.toggleTextActive]}>Đội nhóm</Text>
                                </Pressable>
                            </View>
                        </View>
                    )}

                    {/* Month Picker — filter thang */}
                    <FlatList
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        data={[0, ...MONTHS]}
                        keyExtractor={(m) => m.toString()}
                        contentContainerStyle={styles.monthContent}
                        renderItem={({ item: m }) => (
                            <Pressable
                                style={[styles.monthChip, { borderColor: selectedMonth === m ? '#14B8A6' : colors.cardBorder, backgroundColor: selectedMonth === m ? 'rgba(20,184,166,0.15)' : colors.inputBg }]}
                                onPress={() => setSelectedMonth(m)}
                            >
                                <Text style={[styles.monthChipText, { color: selectedMonth === m ? '#14B8A6' : colors.textMuted }]}>{m === 0 ? 'Tất cả' : `T${m}`}</Text>
                            </Pressable>
                        )}
                    />

                    {/* Team filter — autocomplete, below month */}
                    <View style={{ paddingHorizontal: Spacing.xl, zIndex: 30, overflow: 'visible' }}>
                        <TeamAutocomplete
                            teams={teams}
                            selectedTeamId={selectedTeamId}
                            onSelect={(id) => {
                                setSelectedTeamId(id);
                                if (selectedEmployeeId) {
                                    const emp = employees.find(e => e.id === selectedEmployeeId);
                                    if (emp && (emp as any).teamId !== id) setSelectedEmployeeId('');
                                }
                            }}
                            colors={colors}
                            isOpen={isTeamOpen}
                            setIsOpen={(v) => {
                                setIsTeamOpen(v);
                                if (v) setIsEmployeeOpen(false);
                            }}
                        />
                    </View>

                    {/* Employee filter — autocomplete, filtered by team */}
                    {viewMode === 'TEAM' && (
                        <View style={{ paddingHorizontal: Spacing.xl, zIndex: 20, overflow: 'visible' }}>
                            <EmployeeAutocomplete
                                employees={selectedTeamId ? employees.filter(e => (e as any).teamId === selectedTeamId) : employees}
                                selectedEmployeeId={selectedEmployeeId}
                                onSelect={setSelectedEmployeeId}
                                colors={colors}
                                isOpen={isEmployeeOpen}
                                setIsOpen={(v) => {
                                    setIsEmployeeOpen(v);
                                    if (v) setIsTeamOpen(false);
                                }}
                            />
                        </View>
                    )}

                    {/* Status filter chips — filter trang thai */}
                    <View style={styles.statusRow}>
                        {(['all', 'verified', 'pending'] as StatusFilter[]).map(f => {
                            const label = f === 'all' ? 'Tất cả' : f === 'verified' ? 'Xác nhận' : 'Chờ duyệt';
                            const active = statusFilter === f;
                            const color = f === 'verified' ? '#10B981' : f === 'pending' ? '#F59E0B' : '#14B8A6';
                            return (
                                <Pressable key={f} onPress={() => setStatusFilter(f)}
                                    style={[styles.statusChip, { borderColor: active ? color : colors.cardBorder, backgroundColor: active ? `${color}22` : colors.inputBg }]}>
                                    <Text style={[styles.statusChipText, { color: active ? color : colors.textMuted }]}>{label}</Text>
                                </Pressable>
                            );
                        })}
                        <View style={{ flex: 1 }} />
                    </View>

                    {/* Search — below status, outside FlatList to keep focus */}
                    <View style={styles.searchRow}>
                        <View style={[styles.searchBox, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder }]}>
                            <Search size={15} color={colors.textMuted} />
                            <TextInput
                                ref={searchInputRef}
                                style={[styles.searchInput, { color: colors.textPrimary }]}
                                placeholder="Tìm sản phẩm, nhân viên..."
                                placeholderTextColor={colors.textMuted}
                                value={searchInputValue}
                                onChangeText={handleSearchChange}
                                returnKeyType="search"
                                autoCapitalize="none"
                                autoCorrect={false}
                                autoComplete="off"
                                spellCheck={false}
                                onSubmitEditing={() => Keyboard.dismiss()}
                                onKeyPress={(e) => {
                                    if (e.nativeEvent.key === 'Enter') {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        Keyboard.dismiss();
                                    }
                                }}
                            />
                            {searchInputValue.length > 0 && (
                                <Pressable onPress={() => { handleSearchChange(''); Keyboard.dismiss(); }}>
                                    <X size={14} color={colors.textMuted} />
                                </Pressable>
                            )}
                        </View>
                    </View>
                </View>

                <FlatList
                    data={allOutputs}
                    keyExtractor={keyExtractor}
                    renderItem={renderItem}
                    ListHeaderComponent={ListHeaderComponent}
                    ListEmptyComponent={EmptyLayer}
                    ListFooterComponent={Footer}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    onEndReached={onEndReached}
                    onEndReachedThreshold={0.5}
                    refreshControl={<RefreshControl refreshing={outputsQuery.isRefetching && !outputsQuery.isFetchingNextPage} onRefresh={onRefresh} tintColor="#14B8A6" />}
                />
            </SafeAreaView>
            {DialogComponent}
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    safe: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
    backBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    headerIcon: { width: 38, height: 38, borderRadius: 11, justifyContent: 'center', alignItems: 'center', backgroundColor: '#14B8A6' },
    title: { fontSize: FontSizes.lg, fontWeight: FontWeights.bold },
    sub: { fontSize: FontSizes.xs, marginTop: 1 },
    statsRow: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.xl },
    statCard: {
        flex: 1,
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(20,184,166,0.45)',
        backgroundColor: '#FFFFFF',
    },
    statInner: {
        padding: Spacing.xs,
        alignItems: 'center',
        gap: 2,
    },
    statIconWrap: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 2 },
    statV: { fontSize: FontSizes.sm, fontWeight: FontWeights.bold, textAlign: 'center' },
    statL: { fontSize: 10, textAlign: 'center' },
    list: { paddingBottom: 100 },
    loadingText: { fontSize: FontSizes.sm, marginTop: 4 },
    emptyW: { alignItems: 'center', paddingVertical: 60, gap: Spacing.md },
    emptyIcon: { width: 72, height: 72, borderRadius: 22, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(20,184,166,0.15)' },
    emptyTitle: { fontSize: FontSizes.lg, fontWeight: FontWeights.bold },
    emptyT: { fontSize: FontSizes.sm, textAlign: 'center' },
    card: {
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        marginHorizontal: Spacing.xl,
        marginBottom: Spacing.md,
        borderColor: 'rgba(20,184,166,0.3)',
        backgroundColor: '#FFFFFF',
    },
    cardInner: {
        padding: Spacing.md,
    },
    cardTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
    cardIconWrap: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    cardTitleWrap: { flex: 1 },
    cTitle: { fontSize: FontSizes.base, fontWeight: FontWeights.semibold },
    cSub: { fontSize: FontSizes.xs, marginTop: 2 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 10 },
    statusText: { fontSize: 11, fontWeight: FontWeights.semibold },
    metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, paddingTop: Spacing.sm, borderTopWidth: 1, marginBottom: Spacing.sm },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    metaText: { fontSize: FontSizes.xs },
    detailRow: { flexDirection: 'row', alignItems: 'center', paddingTop: Spacing.sm, borderTopWidth: 1 },
    detItem: { flex: 1, alignItems: 'center' },
    detDivider: { width: 1, height: 28, marginHorizontal: Spacing.sm },
    detL: { fontSize: 10, marginBottom: 3 },
    detV: { fontSize: FontSizes.sm, fontWeight: FontWeights.bold },
    noteWrap: { marginTop: Spacing.sm, padding: Spacing.sm, borderRadius: 10, borderWidth: 1 },
    note: { fontSize: FontSizes.xs, fontStyle: 'italic' },
    monthContent: { paddingHorizontal: Spacing.xl, gap: Spacing.xs, paddingVertical: Spacing.xs },
    monthChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, minWidth: 44, alignItems: 'center' },
    monthChipText: { fontSize: FontSizes.xs, fontWeight: FontWeights.semibold },
    teamChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
    teamChipText: { fontSize: FontSizes.xs, fontWeight: FontWeights.semibold },
    searchRow: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.xl, marginVertical: Spacing.xs },
    searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: 10, borderRadius: 14, borderWidth: 1 },
    searchInput: { flex: 1, fontSize: FontSizes.sm, padding: 0 },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, paddingHorizontal: Spacing.xl, marginBottom: Spacing.xs },
    statusChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1 },
    statusChipText: { fontSize: 11, fontWeight: FontWeights.semibold },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalSheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, paddingBottom: 32 },
    modalHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
    modalHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md },
    modalTitle: { fontSize: FontSizes.base, fontWeight: FontWeights.bold },
    modalSub: { fontSize: FontSizes.xs, marginTop: 2 },
    viewModeToggle: { flexDirection: 'row', padding: 3, borderRadius: 20, marginBottom: 4, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB' },
    toggleBtn: { flex: 1, paddingVertical: 6, alignItems: 'center', borderRadius: 18 },
    toggleBtnActive: { backgroundColor: '#14B8A6' },
    toggleText: { fontSize: FontSizes.sm, fontWeight: FontWeights.semibold, color: '#6B7280' },
    toggleTextActive: { color: '#FFFFFF' },

    // Employee Autocomplete
    employeeAutocomplete: { flex: 1, maxWidth: 120 },
    autocompleteTrigger: {
        width: 42, height: 42, borderRadius: 14, borderWidth: 1,
        justifyContent: 'center', alignItems: 'center', flexDirection: 'row',
    },
    dropdownArrow: { marginLeft: 2 },
    dropdownOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1001, elevation: 10 },
    dropdown: {
        position: 'absolute', top: 46, left: 0, right: 0, zIndex: 1005, elevation: 12,
        borderRadius: 12, borderWidth: 1, overflow: 'hidden', maxHeight: 380, backgroundColor: '#FFFFFF',
        boxShadow: '0px 8px 24px rgba(0,0,0,0.15)',
    },
    dropdownSearch: {
        paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
        fontSize: FontSizes.sm, borderBottomWidth: 1,
    },
},);