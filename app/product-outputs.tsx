// Product Outputs Screen — Glassmorphism + Infinite Scroll (Tổng hợp sản phẩm)
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, RefreshControl, ActivityIndicator, TextInput, Modal, FlatList, ListRenderItem, Share, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import { Package, ChevronLeft, RefreshCw, CheckCircle, Clock, Banknote, SquareDashed, User, CalendarDays, FileText, Search, Users, X, Settings2, Eye, EyeOff, Save, Send } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { useAuthStore, useThemeStore } from '@/store';
import { productOutputApi, ProductOutput } from '@/lib/product-output-api';
import { teamApi, Team } from '@/lib/team-api';
import { employeeApi, Employee } from '@/lib/employee-api';

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

export default function ProductOutputsScreen() {
    const router = useRouter();
    const { user } = useAuthStore();
    const { isDark } = useThemeStore();
    const colors = ThemeColors.light;
    const { showDialog, DialogComponent } = useDarkDialog();

    const isAdmin = user?.role === 'ADMIN';
    const isManager = user?.role === 'MANAGER';

    // Filters
    const now = new Date();
    const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
    const [selectedYear] = useState<number>(now.getFullYear());
    const [selectedTeamId, setSelectedTeamId] = useState<string>('');
    const [searchText, setSearchText] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [showVisibilityModal, setShowVisibilityModal] = useState(false);
    const [savingVisibility, setSavingVisibility] = useState(false);

    const [teams, setTeams] = useState<Team[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
    const [showEmployeeModal, setShowEmployeeModal] = useState(false);

    useEffect(() => {
        employeeApi.getEmployees().then(setEmployees).catch(() => { });
        teamApi.getTeams().then(data => {
            const resolvedData = Array.isArray(data) ? data : (data as any)?.data || [];
            setTeams(resolvedData.map((t: any) => ({ ...t, outputVisible: t.outputVisible ?? true })));
        }).catch(() => { });
    }, []);

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(searchText), 400);
        return () => clearTimeout(t);
    }, [searchText]);

    const outputsQuery = useInfiniteQuery({
        queryKey: [
            'product-outputs',
            selectedMonth,
            selectedYear,
            selectedTeamId,
            statusFilter,
            debouncedSearch,
            selectedEmployeeId,
        ],
        queryFn: ({ pageParam }) => {
            const month = selectedMonth === 0 ? undefined : selectedMonth;
            const year = selectedMonth === 0 ? undefined : selectedYear;

            return productOutputApi.getOutputs({
                month,
                year,
                verified: statusFilter === 'all' ? undefined : statusFilter === 'verified',
                search: debouncedSearch.trim() || undefined,
                teamId: selectedTeamId || undefined,
                employeeId: selectedEmployeeId || undefined,
                page: Number(pageParam ?? 1),
                limit: PAGE_SIZE,
            });
        },
        initialPageParam: 1,
        getNextPageParam: (lastPage: any) => {
            if (lastPage?.meta?.hasNext) {
                return lastPage.meta.page + 1;
            }
            return undefined;
        },
    });

    const isTeamHidden = useMemo(() => {
        if (isAdmin) return false;
        const myTeamId = (user as any)?.Employee?.teamId || (user as any)?.teamId;
        const myTeam = teams.find(t => t.id === myTeamId);
        return !!(myTeam && !myTeam.outputVisible);
    }, [teams, user, isAdmin]);


    // ── Stats query: limit=0 to get accurate totals across all pages ──
    const statsQuery = useQuery({
        queryKey: [
            'product-outputs-stats',
            selectedMonth,
            selectedYear,
            selectedTeamId,
            statusFilter,
            debouncedSearch,
            selectedEmployeeId,
        ],
        queryFn: () => {
            const month = selectedMonth === 0 ? undefined : selectedMonth;
            const year = selectedMonth === 0 ? undefined : selectedYear;
            return productOutputApi.getOutputs({
                month,
                year,
                verified: statusFilter === 'all' ? undefined : statusFilter === 'verified',
                search: debouncedSearch.trim() || undefined,
                teamId: selectedTeamId || undefined,
                employeeId: selectedEmployeeId || undefined,
                limit: 0,
            });
        },
        staleTime: 30000,
    });

    const statsAll = useMemo(() => {
        if (isTeamHidden) return [];
        const statsData = statsQuery.data;
        if (!statsData) return [];
        return Array.isArray(statsData) ? statsData : ((statsData as any)?.data || []);
    }, [statsQuery.data, isTeamHidden]);

    const allOutputs = useMemo(() => {
        if (isTeamHidden) return [];
        // Extract array from paginated response wrappers
        return outputsQuery.data?.pages.flatMap((p: any) => {
            return Array.isArray(p) ? p : (p?.data || []);
        }) ?? [];
    }, [outputsQuery.data, isTeamHidden]);

    const totalQty = useMemo(() => statsAll.reduce((s: number, o: any) => s + (Number(o.quantity) || 0), 0), [statsAll]);
    const totalSalary = useMemo(() => statsAll.reduce((s: number, o: any) => s + (Number(o.salaryAmount) || 0), 0), [statsAll]);
    const verifiedCount = useMemo(() => statsAll.filter((o: any) => o.verified).length, [statsAll]);

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

        // Lấy đơn giá đúng theo loại:
        // - Công nhật: đơn giá = salaryAmount / quantity (lương/ngày)
        // - Khoán: RoutingStep.salaryPrice > 0, fallback Product.salaryPrice
        const getUnitPrice = (item: any): number => {
            if (item.isDailyRate) {
                const qty = Number(item.quantity) || 1;
                return qty > 0 ? Math.round(Number(item.salaryAmount) / qty) : 0;
            }
            const stepPrice = Number(item.RoutingStep?.salaryPrice || 0);
            if (stepPrice > 0) return stepPrice;
            return Number(item.Product?.salaryPrice || 0);
        };

        // Hàm căn chuỗi
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
        } catch (error: any) {
            Alert.alert('Lỗi', 'Không thể chia sẻ báo cáo.');
        }
    };

    const toggleTeamVisibility = async (teamId: string, current: boolean) => {
        setSavingVisibility(true);
        try {
            await teamApi.updateTeam(teamId, { outputVisible: !current });
            setTeams(prev => prev.map(t => t.id === teamId ? { ...t, outputVisible: !current } : t));
        } catch (e: any) {
            showDialog('Lỗi', e.response?.data?.message || 'Không thể cập nhật cài đặt');
        } finally {
            setSavingVisibility(false);
        }
    };

    const renderItem: ListRenderItem<ProductOutput> = useCallback(({ item, index }) => (
        <OutputCard out={item} i={index} colors={colors} showEmployee={isAdmin || isManager} />
    ), [colors, isAdmin, isManager]);

    const keyExtractor = useCallback((item: ProductOutput, index: number) => `${item.id}_${index}`, []);

    const Footer = () => {
        if (outputsQuery.isFetchingNextPage) {
            return (
                <View style={{ padding: Spacing.md, alignItems: 'center' }}>
                    <ActivityIndicator size="small" color="#14B8A6" />
                </View>
            );
        }
        return <View style={{ height: 100 }} />;
    };

    const EmptyLayer = () => {
        if (outputsQuery.isLoading) {
            return (
                <View style={s.emptyW}>
                    <ActivityIndicator size="large" color="#14B8A6" />
                    <Text style={[s.loadingText, { color: colors.textMuted }]}>Đang tải dữ liệu...</Text>
                </View>
            );
        }

        if (isTeamHidden) {
            return (
                <View style={s.emptyW}>
                    <LinearGradient colors={['#EF4444', '#F87171']} style={s.emptyIcon}>
                        <EyeOff size={32} color="#FFF" />
                    </LinearGradient>
                    <Text style={[s.emptyTitle, { color: colors.textPrimary }]}>Sản lượng đang được ẩn</Text>
                    <Text style={[s.emptyT, { color: colors.textMuted }]}>Quản trị viên đã tắt hiển thị sản lượng cho team của bạn</Text>
                </View>
            );
        }

        return (
            <View style={s.emptyW}>
                <LinearGradient colors={['#14B8A6', '#34D399']} style={s.emptyIcon}>
                    <Package size={32} color="#FFF" />
                </LinearGradient>
                <Text style={[s.emptyTitle, { color: colors.textPrimary }]}>Không có dữ liệu</Text>
                <Text style={[s.emptyT, { color: colors.textMuted }]}>
                    {searchText ? 'Thử tìm kiếm từ khóa khác' : 'Không có sản lượng trong kỳ này'}
                </Text>
            </View>
        );
    };

    const ListHeaderComponent = () => (
        <View style={{ gap: Spacing.sm }}>
            <Animated.View entering={FadeInDown.duration(400).delay(80)} style={[s.statsRow, { marginTop: Spacing.sm }]}>
                <View style={s.statCard}>
                    <View style={s.statInner}>
                        <View style={[s.statIconWrap, { backgroundColor: 'rgba(245,158,11,0.15)' }]}>
                            <SquareDashed size={16} color="#F59E0B" />
                        </View>
                        <Text style={[s.statV, { color: '#F59E0B' }]} numberOfLines={1} adjustsFontSizeToFit>{totalQty.toLocaleString('vi-VN')}</Text>
                        <Text style={[s.statL, { color: colors.textMuted }]}>Tổng SP</Text>
                    </View>
                </View>
                <View style={s.statCard}>
                    <View style={s.statInner}>
                        <View style={[s.statIconWrap, { backgroundColor: 'rgba(16,185,129,0.15)' }]}>
                            <CheckCircle size={16} color="#10B981" />
                        </View>
                        <Text style={[s.statV, { color: '#10B981' }]}>{verifiedCount}</Text>
                        <Text style={[s.statL, { color: colors.textMuted }]}>Xác nhận</Text>
                    </View>
                </View>
                <View style={s.statCard}>
                    <View style={s.statInner}>
                        <View style={[s.statIconWrap, { backgroundColor: 'rgba(129,140,248,0.15)' }]}>
                            <Banknote size={16} color="#818CF8" />
                        </View>
                        <Text style={[s.statV, { color: '#818CF8', fontSize: 13 }]} numberOfLines={1}>{fmtCurrency(totalSalary)}</Text>
                        <Text style={[s.statL, { color: colors.textMuted }]}>Lương khoán</Text>
                    </View>
                </View>
            </Animated.View>

            {/* Month Picker */}
            <Animated.View entering={FadeInDown.duration(400).delay(120)}>
                <FlatList
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={[0, ...MONTHS]}
                    keyExtractor={(m) => m.toString()}
                    contentContainerStyle={s.monthContent}
                    renderItem={({ item: m }) => (
                        <Pressable
                            style={[s.monthChip, { borderColor: selectedMonth === m ? '#14B8A6' : colors.cardBorder, backgroundColor: selectedMonth === m ? 'rgba(20,184,166,0.15)' : colors.inputBg }]}
                            onPress={() => setSelectedMonth(m)}
                        >
                            <Text style={[s.monthChipText, { color: selectedMonth === m ? '#14B8A6' : colors.textMuted }]}>{m === 0 ? 'Tất cả' : `T${m}`}</Text>
                        </Pressable>
                    )}
                />
            </Animated.View>

            {/* Team Tabs */}
            {isAdmin && teams.length > 0 && (
                <Animated.View entering={FadeInDown.duration(400).delay(160)}>
                    <FlatList
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        data={[{ id: '', name: 'Tất cả Team' }, ...teams]}
                        keyExtractor={(t) => t.id}
                        contentContainerStyle={s.monthContent}
                        renderItem={({ item: t }) => (
                            <Pressable
                                style={[s.teamChip, { borderColor: selectedTeamId === t.id ? '#818CF8' : colors.cardBorder, backgroundColor: selectedTeamId === t.id ? 'rgba(129,140,248,0.15)' : colors.inputBg }]}
                                onPress={() => setSelectedTeamId(t.id)}
                            >
                                {t.id === '' && <Users size={12} color={selectedTeamId === '' ? '#818CF8' : colors.textMuted} />}
                                <Text style={[s.teamChipText, { color: selectedTeamId === t.id ? '#818CF8' : colors.textMuted }]}>{t.name}</Text>
                            </Pressable>
                        )}
                    />
                </Animated.View>
            )}

            {/* Search + Filter bar */}
            <Animated.View entering={FadeInDown.duration(400).delay(200)} style={s.searchRow}>
                <Pressable
                    onPress={() => setShowEmployeeModal(true)}
                    style={{ width: 42, height: 42, borderRadius: 14, borderWidth: 1, borderColor: selectedEmployeeId ? '#F59E0B' : colors.cardBorder, backgroundColor: selectedEmployeeId ? 'rgba(245,158,11,0.1)' : colors.inputBg, justifyContent: 'center', alignItems: 'center' }}
                >
                    <User size={18} color={selectedEmployeeId ? '#F59E0B' : colors.textSecondary} />
                </Pressable>
                <View style={[s.searchBox, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder }]}>
                    <Search size={15} color={colors.textMuted} />
                    <TextInput
                        style={[s.searchInput, { color: colors.textPrimary }]}
                        placeholder="Tìm sản phẩm, nhân viên..."
                        placeholderTextColor={colors.textMuted}
                        value={searchText}
                        onChangeText={setSearchText}
                    />
                    {searchText.length > 0 && (
                        <Pressable onPress={() => setSearchText('')}>
                            <X size={14} color={colors.textMuted} />
                        </Pressable>
                    )}
                </View>
            </Animated.View>

            {/* Status filter chips */}
            <Animated.View entering={FadeInDown.duration(400).delay(220)} style={s.statusRow}>
                {(['all', 'verified', 'pending'] as StatusFilter[]).map(f => {
                    const label = f === 'all' ? 'Tất cả' : f === 'verified' ? 'Xác nhận' : 'Chờ duyệt';
                    const active = statusFilter === f;
                    const color = f === 'verified' ? '#10B981' : f === 'pending' ? '#F59E0B' : '#14B8A6';
                    return (
                        <Pressable key={f} onPress={() => setStatusFilter(f)}
                            style={[s.statusChip, { borderColor: active ? color : colors.cardBorder, backgroundColor: active ? `${color}22` : colors.inputBg }]}>
                            <Text style={[s.statusChipText, { color: active ? color : colors.textMuted }]}>{label}</Text>
                        </Pressable>
                    );
                })}
                <View style={{ flex: 1 }} />
            </Animated.View>

            <View style={{ height: Spacing.sm }} />
        </View>
    );

    return (
        <View style={s.root}>
            <StatusBar style={isDark ? "light" : "dark"} />
            <LinearGradient colors={colors.gradientColors} style={StyleSheet.absoluteFill} />

            {/* Decorative orbs */}
            <View style={[s.orb, { top: -50, right: -30, backgroundColor: colors.orbColor, width: 180, height: 180 }]} />
            <View style={[s.orb, { top: 180, left: -60, backgroundColor: colors.orbColor, width: 150, height: 150 }]} />

            <SafeAreaView style={s.safe} edges={['top']}>
                {/* Header */}
                <Animated.View entering={FadeInDown.duration(400)} style={s.header}>
                    <Pressable style={[s.backBtn, { backgroundColor: colors.inputBg }]} onPress={() => router.back()}>
                        <ChevronLeft size={22} color={colors.textPrimary} />
                    </Pressable>
                    <View style={s.headerCenter}>
                        <LinearGradient colors={['#14B8A6', '#34D399']} style={s.headerIcon}>
                            <Package size={18} color="#FFF" strokeWidth={2.5} />
                        </LinearGradient>
                        <View>
                            <Text style={[s.title, { color: colors.textPrimary }]}>Tổng hợp SP</Text>
                            <Text style={[s.sub, { color: colors.textSecondary }]}>
                                {selectedMonth === 0 ? `Tất cả ${selectedYear}` : fmtMonth(selectedMonth, selectedYear)}
                            </Text>
                        </View>
                    </View>
                    <View style={{ flexDirection: 'row', gap: Spacing.xs }}>
                        <Pressable style={[s.backBtn, { backgroundColor: colors.inputBg }]} onPress={handleSendZalo}>
                            <Send size={16} color={colors.textSecondary} />
                        </Pressable>
                        <Pressable style={[s.backBtn, { backgroundColor: colors.inputBg }]} onPress={onRefresh}>
                            <RefreshCw size={16} color={colors.textSecondary} />
                        </Pressable>
                        {isAdmin && (
                            <Pressable style={[s.backBtn, { backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.cardBorder }]} onPress={() => setShowVisibilityModal(true)}>
                                <Settings2 size={16} color={colors.textSecondary} />
                            </Pressable>
                        )}
                    </View>
                </Animated.View>

                <FlatList
                    data={allOutputs}
                    keyExtractor={keyExtractor}
                    renderItem={renderItem}
                    ListHeaderComponent={ListHeaderComponent}
                    ListEmptyComponent={EmptyLayer}
                    ListFooterComponent={Footer}
                    contentContainerStyle={s.list}
                    showsVerticalScrollIndicator={false}
                    onEndReached={onEndReached}
                    onEndReachedThreshold={0.5}
                    refreshControl={<RefreshControl refreshing={outputsQuery.isRefetching && !outputsQuery.isFetchingNextPage} onRefresh={onRefresh} tintColor="#14B8A6" />}
                />
            </SafeAreaView>
            {DialogComponent}

            {/* ── Employee Filter Modal ── */}
            <Modal visible={showEmployeeModal} transparent animationType="slide" onRequestClose={() => setShowEmployeeModal(false)}>
                <Pressable style={s.modalOverlay} onPress={() => setShowEmployeeModal(false)}>
                    <Pressable style={[s.modalSheet, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder, maxHeight: '80%' }]} onPress={e => e.stopPropagation()}>
                        <View style={[s.modalHandle, { backgroundColor: colors.divider }]} />
                        <View style={s.modalHeader}>
                            <View style={{ flex: 1 }}>
                                <Text style={[s.modalTitle, { color: colors.textPrimary }]}>Lọc theo nhân viên</Text>
                            </View>
                            <Pressable onPress={() => setShowEmployeeModal(false)} style={[s.backBtn, { backgroundColor: colors.inputBg }]}>
                                <X size={16} color={colors.textMuted} />
                            </Pressable>
                        </View>

                        <FlatList
                            data={[{ id: '', fullName: 'Tất cả nhân viên', employeeCode: '' }, ...employees]}
                            keyExtractor={i => i.id}
                            contentContainerStyle={{ paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xxl }}
                            renderItem={({ item }) => (
                                <Pressable
                                    style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: colors.divider }}
                                    onPress={() => { setSelectedEmployeeId(item.id); setShowEmployeeModal(false); }}
                                >
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontSize: FontSizes.base, color: selectedEmployeeId === item.id ? '#F59E0B' : colors.textPrimary, fontWeight: selectedEmployeeId === item.id ? 'bold' : 'normal' }}>{item.fullName}</Text>
                                        {item.employeeCode ? <Text style={{ fontSize: FontSizes.xs, color: colors.textMuted }}>{item.employeeCode}</Text> : null}
                                    </View>
                                    {selectedEmployeeId === item.id && <CheckCircle size={18} color="#F59E0B" />}
                                </Pressable>
                            )}
                        />
                    </Pressable>
                </Pressable>
            </Modal>


            {/* ── Team Visibility Modal (Admin only) ── */}
            <Modal visible={showVisibilityModal} transparent animationType="slide" onRequestClose={() => setShowVisibilityModal(false)}>
                <Pressable style={s.modalOverlay} onPress={() => setShowVisibilityModal(false)}>
                    <Pressable style={[s.modalSheet, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]} onPress={e => e.stopPropagation()}>
                        <View style={[s.modalHandle, { backgroundColor: colors.divider }]} />

                        <View style={s.modalHeader}>
                            <LinearGradient colors={['#818CF8', '#6366F1']} style={s.modalIcon}>
                                <Settings2 size={18} color="#FFF" />
                            </LinearGradient>
                            <View style={{ flex: 1 }}>
                                <Text style={[s.modalTitle, { color: colors.textPrimary }]}>Cài đặt hiển thị</Text>
                                <Text style={[s.modalSub, { color: colors.textMuted }]}>Ẩn/hiện sản lượng theo team</Text>
                            </View>
                            <Pressable onPress={() => setShowVisibilityModal(false)} style={[s.backBtn, { backgroundColor: colors.inputBg }]}>
                                <X size={16} color={colors.textMuted} />
                            </Pressable>
                        </View>

                        <View style={[s.infoBox, { backgroundColor: 'rgba(129,140,248,0.08)', borderColor: 'rgba(129,140,248,0.2)' }]}>
                            <Text style={[s.infoText, { color: colors.textSecondary }]}>
                                Team bị ẩn: nhân viên và manager thuộc team đó sẽ không xem được sản lượng. Admin luôn thấy tất cả.
                            </Text>
                        </View>

                        <View style={s.teamChipsGrid}>
                            {teams.length === 0 ? (
                                <Text style={[s.infoText, { color: colors.textMuted, textAlign: 'center' }]}>Chưa có team nào</Text>
                            ) : (
                                teams.map(team => {
                                    const visible = team.outputVisible;
                                    return (
                                        <Pressable
                                            key={team.id}
                                            style={[
                                                s.visChip,
                                                {
                                                    borderColor: visible ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)',
                                                    backgroundColor: visible ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.08)',
                                                }
                                            ]}
                                            onPress={() => toggleTeamVisibility(team.id, visible)}
                                            disabled={savingVisibility}
                                        >
                                            <LinearGradient
                                                colors={visible ? ['#10B981', '#34D399'] : ['#EF4444', '#F87171']}
                                                style={s.visChipIcon}
                                            >
                                                {visible ? <Eye size={13} color="#FFF" /> : <EyeOff size={13} color="#FFF" />}
                                            </LinearGradient>
                                            <View style={{ flex: 1 }}>
                                                <Text style={[s.visChipName, { color: colors.textPrimary }]} numberOfLines={1}>{team.name}</Text>
                                                <Text style={[s.visChipStatus, { color: visible ? '#10B981' : '#EF4444' }]}>
                                                    {visible ? 'Đang hiển thị' : 'Đang ẩn'}
                                                </Text>
                                            </View>
                                            <View style={[s.visToggle, { backgroundColor: visible ? '#10B981' : colors.inputBg, borderColor: visible ? '#10B981' : colors.cardBorder }]}>
                                                <View style={[s.visToggleDot, { backgroundColor: visible ? '#FFF' : colors.textMuted, transform: [{ translateX: visible ? 14 : 0 }] }]} />
                                            </View>
                                        </Pressable>
                                    );
                                })
                            )}
                        </View>

                        <View style={[s.modalFooter, { borderTopColor: colors.divider }]}>
                            <Save size={14} color={colors.textMuted} />
                            <Text style={[s.infoText, { color: colors.textMuted }]}>Thay đổi được lưu ngay lập tức</Text>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>
        </View>
    );
}

// ── Output Card Component ──
function OutputCard({ out, i, colors, showEmployee }: { out: ProductOutput; i: number; colors: any; showEmployee: boolean }) {
    return (
        <Animated.View entering={FadeInUp.duration(350).delay(Math.min(i, 8) * 40).springify().damping(16)}>
            <View style={s.card}>
                <View style={s.cardInner}>
                    {/* Top: icon + title + status */}
                    <View style={s.cardTop}>
                        <LinearGradient
                            colors={out.verified ? ['#10B981', '#34D399'] : ['#F59E0B', '#FBBF24']}
                            style={s.cardIconWrap}
                        >
                            <Package size={16} color="#FFF" />
                        </LinearGradient>
                        <View style={s.cardTitleWrap}>
                            <Text style={[s.cTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                                {out.Product?.name || out.productId}
                            </Text>
                            {out.Product?.name && (
                                <Text style={[s.cSub, { color: colors.textSecondary }]} numberOfLines={1}>
                                    {out.Product?.code || 'Mã SP'}
                                </Text>
                            )}
                        </View>
                        <View style={[s.statusBadge, { backgroundColor: out.verified ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)' }]}>
                            {out.verified ? <CheckCircle size={13} color="#34D399" /> : <Clock size={13} color="#FBBF24" />}
                            <Text style={[s.statusText, { color: out.verified ? '#34D399' : '#FBBF24' }]}>
                                {out.verified ? 'Xác nhận' : 'Chờ duyệt'}
                            </Text>
                        </View>
                    </View>

                    {/* Meta: employee + date + order */}
                    <View style={[s.metaRow, { borderTopColor: colors.divider }]}>
                        {showEmployee && (
                            <View style={s.metaItem}>
                                <User size={12} color={colors.textMuted} />
                                <Text style={[s.metaText, { color: colors.textSecondary }]} numberOfLines={1}>
                                    {out.Employee?.fullName || out.employeeId}
                                </Text>
                            </View>
                        )}
                        <View style={s.metaItem}>
                            <CalendarDays size={12} color={colors.textMuted} />
                            <Text style={[s.metaText, { color: colors.textSecondary }]}>
                                {new Date(out.outputDate).toLocaleDateString('vi-VN')}
                            </Text>
                        </View>
                        {out.ProductionOrder && (
                            <View style={s.metaItem}>
                                <FileText size={12} color={colors.textMuted} />
                                <Text style={[s.metaText, { color: '#38BDF8' }]}>
                                    {out.ProductionOrder.orderNumber}
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Detail: qty + salary */}
                    <View style={[s.detailRow, { borderTopColor: colors.divider }]}>
                        <View style={s.detItem}>
                            <Text style={[s.detL, { color: colors.textMuted }]}>Số lượng</Text>
                            <Text style={[s.detV, { color: '#F59E0B' }]}>{out.quantity || 0} SP</Text>
                        </View>
                        <View style={[s.detDivider, { backgroundColor: colors.divider }]} />
                        <View style={s.detItem}>
                            <Text style={[s.detL, { color: colors.textMuted }]}>Lương khoán</Text>
                            <Text style={[s.detV, { color: '#818CF8' }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{fmtCurrency(out.salaryAmount || 0)}</Text>
                        </View>
                    </View>

                    {/* Note */}
                    {out.note && (
                        <View style={[s.noteWrap, { backgroundColor: 'rgba(0,0,0,0.03)', borderColor: colors.cardBorder }]}>
                            <Text style={[s.note, { color: colors.textSecondary }]}>{out.note}</Text>
                        </View>
                    )}
                </View>
            </View>
        </Animated.View>
    );
}

const s = StyleSheet.create({
    root: { flex: 1 },
    safe: { flex: 1 },
    orb: { position: 'absolute', borderRadius: 999 },
    header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
    backBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    headerIcon: { width: 38, height: 38, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
    title: { fontSize: FontSizes.lg, fontWeight: FontWeights.bold },
    sub: { fontSize: FontSizes.xs, marginTop: 1 },
    statsRow: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.xl },
    statCard: {
        flex: 1,
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(1, 86, 167, 0.45)',
        backgroundColor: '#FFFFFF',
        ...Shadows.small,
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
    gap: { gap: Spacing.md },
    loadingText: { fontSize: FontSizes.sm, marginTop: 4 },
    emptyW: { alignItems: 'center', paddingVertical: 60, gap: Spacing.md },
    emptyIcon: { width: 72, height: 72, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
    emptyTitle: { fontSize: FontSizes.lg, fontWeight: FontWeights.bold },
    emptyT: { fontSize: FontSizes.sm, textAlign: 'center' },
    card: {
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        marginHorizontal: Spacing.xl,
        marginBottom: Spacing.md,
        borderColor: 'rgba(1, 86, 167, 0.45)',
        backgroundColor: '#FFFFFF',
        ...Shadows.medium,
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
    modalIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    modalTitle: { fontSize: FontSizes.base, fontWeight: FontWeights.bold },
    modalSub: { fontSize: FontSizes.xs, marginTop: 2 },
    infoBox: { marginHorizontal: Spacing.xl, marginBottom: Spacing.md, padding: Spacing.md, borderRadius: 12, borderWidth: 1 },
    infoText: { fontSize: FontSizes.xs, lineHeight: 18 },
    teamChipsGrid: { paddingHorizontal: Spacing.xl, rowGap: Spacing.sm },
    visChip: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md, borderRadius: 16, borderWidth: 1 },
    visChipIcon: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    visChipName: { fontSize: FontSizes.sm, fontWeight: FontWeights.semibold },
    visChipStatus: { fontSize: 11, marginTop: 2 },
    visToggle: { width: 36, height: 22, borderRadius: 11, borderWidth: 1.5, justifyContent: 'center', paddingHorizontal: 2 },
    visToggleDot: { width: 16, height: 16, borderRadius: 8 },
    modalFooter: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, marginTop: Spacing.md, borderTopWidth: 1 },
});
