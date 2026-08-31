// Product Prices Screen — Don gia san pham theo to
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList, TextInput, ActivityIndicator, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Tag, Search, X, ChevronLeft, RefreshCw, Users } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';

import { inventoryApi, Product } from '@/lib/inventory-api';
import { teamApi, Team } from '@/lib/team-api';
import { employeeApi } from '@/lib/employee-api';
import { useAuthStore, useThemeStore } from '@/store';
import { ThemeColors } from '@/constants/ThemeColors';
import { Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants/Tokens';
import PaginationFooter from '@/components/ui/PaginationFooter';
import { useDarkDialog } from '@/components/ui/DarkDialog';

const PAGE_SIZE = 50;

export default function ProductPricesScreen() {
    const router = useRouter();
    const { user } = useAuthStore();
    const { isDark } = useThemeStore();
    const colors = ThemeColors.light;
    const { showDialog, DialogComponent } = useDarkDialog();

    const role = user?.role as 'ADMIN' | 'MANAGER' | 'USER' | undefined;
    const isAdmin = role === 'ADMIN';
    const canViewTeam = isAdmin || role === 'MANAGER';

    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [selectedTeamId, setSelectedTeamId] = useState('');
    const [teams, setTeams] = useState<Team[]>([]);
    const [userTeamId, setUserTeamId] = useState<string>('');

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(search), 300);
        return () => clearTimeout(t);
    }, [search]);

    useEffect(() => {
        teamApi.getTeams().then(d => setTeams(Array.isArray(d) ? d : (d as any)?.data || [])).catch(() => {});
        const empId = (user as any)?.employeeId || user?.id;
        if (empId) {
            employeeApi.getEmployeeById(empId).then(emp => {
                if ((emp as any)?.teamId) setUserTeamId((emp as any).teamId);
            }).catch(() => {});
        }
    }, [user]);

    const productsQuery = useInfiniteQuery({
        queryKey: ['product-prices', debouncedSearch.trim(), isAdmin ? selectedTeamId : userTeamId],
        queryFn: ({ pageParam }) =>
            inventoryApi.getProductsPage({
                q: debouncedSearch.trim() || undefined,
                page: Number(pageParam ?? 1),
                limit: PAGE_SIZE,
            }),
        initialPageParam: 1,
        getNextPageParam: (lastPage: any) => lastPage.nextPage ?? undefined,
        enabled: !!user,
    });

    const allProducts = useMemo(() => productsQuery.data?.pages.flatMap(p => p.items) ?? [], [productsQuery.data]);

    // Filter by team for non-admin: only products that have a routing step in user's team
    // For now, we filter client-side if product has teamId or routingSteps with workshopId
    const filtered = useMemo(() => {
        let list = allProducts;
        // Search is already server-side via q, but keep client filter for team
        if (!isAdmin && userTeamId) {
            // If product has no team info, keep it (fallback to show all for USER/MANAGER without team mapping)
            // If we have teamId in product, filter
            // For now, show all for non-admin as well, but Admin can filter by team
        }
        if (isAdmin && selectedTeamId) {
            // Filter products that have at least one routing step in selected team
            // Since Product may not have teamId directly, we check if any routing step's operation's workshopId matches
            // For now, filter by product.teamId if exists, otherwise keep all
            list = list.filter((p: any) => {
                const teamId = (p as any).teamId || (p as any).Team?.id;
                if (teamId) return teamId === selectedTeamId;
                // If no teamId on product, keep (cannot filter)
                return true;
            });
        }
        return list;
    }, [allProducts, isAdmin, selectedTeamId, userTeamId]);

    const onRefresh = useCallback(async () => { await productsQuery.refetch(); }, [productsQuery]);
    const onEndReached = useCallback(() => {
        if (productsQuery.hasNextPage && !productsQuery.isFetchingNextPage) productsQuery.fetchNextPage();
    }, [productsQuery.hasNextPage, productsQuery.isFetchingNextPage, productsQuery.fetchNextPage]);

    const renderItem = useCallback(({ item: p }: { item: any }) => {
        const steps = (p as any).RoutingSteps || (p as any).routingSteps || [];
        const total = steps.length > 0
            ? steps.reduce((s: number, rs: any) => s + Number(rs.salaryPrice || 0), 0)
            : Number((p as any).salaryPrice || 0);
        return (
            <View style={[s.card, { borderColor: colors.cardBorder }]}>
                <View style={[s.cardInner, { backgroundColor: colors.cardBg }]}>
                    <View style={s.cardTop}>
                        <View style={{ flex: 1 }}>
                            <Text style={[s.cardTitle, { color: colors.textPrimary }]} numberOfLines={1}>{p.name}</Text>
                            <Text style={[s.cardSub, { color: colors.textMuted }]}>{p.code}</Text>
                        </View>
                        <View style={[s.totalBadge, { backgroundColor: 'rgba(139,92,246,0.12)' }]}>
                            <Text style={[s.totalBadgeText, { color: '#8B5CF6' }]}>{total.toLocaleString('vi-VN')}đ</Text>
                        </View>
                    </View>
                    {steps.length > 0 ? (
                        <View style={[s.stepsWrap, { borderTopColor: colors.divider }]}>
                            {steps.map((rs: any, idx: number) => (
                                <View key={rs.id || idx} style={[s.stepRow, { borderColor: colors.cardBorder }]}>
                                    <Text style={[s.stepSeq, { color: colors.textMuted }]}>CĐ {rs.sequenceNo || idx + 1}</Text>
                                    <Text style={[s.stepName, { color: colors.textPrimary }]} numberOfLines={1}>{rs.Operation?.name || 'Công đoạn'}</Text>
                                    <Text style={[s.stepPrice, { color: '#8B5CF6' }]}>{Number(rs.salaryPrice || 0).toLocaleString('vi-VN')}đ</Text>
                                </View>
                            ))}
                        </View>
                    ) : (
                        <View style={[s.stepsWrap, { borderTopColor: colors.divider }]}>
                            <Text style={[s.stepPrice, { color: colors.textMuted, textAlign: 'center', flex: 1 }]}>Đơn giá SP: {Number((p as any).salaryPrice || 0).toLocaleString('vi-VN')}đ</Text>
                        </View>
                    )}
                </View>
            </View>
        );
    }, [colors]);

    const keyExtractor = useCallback((item: any) => item.id, []);

    return (
        <View style={s.root}>
            <StatusBar style={isDark ? 'light' : 'dark'} />
            <LinearGradient colors={colors.gradientColors} style={StyleSheet.absoluteFill} />
            <SafeAreaView style={s.safe} edges={['top']}>
                <View style={s.header}>
                    <Pressable style={[s.backBtn, { backgroundColor: colors.inputBg }]} onPress={() => router.back()}>
                        <ChevronLeft size={22} color={colors.textPrimary} />
                    </Pressable>
                    <View style={s.headerIcon}>
                        <LinearGradient colors={['#8B5CF6', '#A78BFA']} style={s.iconGrad}>
                            <Tag size={18} color="#FFF" strokeWidth={2.5} />
                        </LinearGradient>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[s.title, { color: colors.textPrimary }]}>Đơn giá sản phẩm</Text>
                        <Text style={[s.sub, { color: colors.textMuted }]}>
                            {isAdmin ? 'Tất cả tổ' : userTeamId ? `Tổ của bạn` : 'Xem đơn giá khoán'}
                        </Text>
                    </View>
                    <Pressable style={[s.backBtn, { backgroundColor: colors.inputBg }]} onPress={onRefresh}>
                        <RefreshCw size={16} color={colors.textSecondary} />
                    </Pressable>
                </View>

                <View style={{ paddingHorizontal: Spacing.xl, gap: Spacing.sm, paddingTop: Spacing.sm }}>
                    <View style={[s.searchBox, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder }]}>
                        <Search size={15} color={colors.textMuted} />
                        <TextInput
                            style={[s.searchInput, { color: colors.textPrimary }]}
                            placeholder="Tìm sản phẩm, mã..."
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
                    {isAdmin && (
                        <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                            <Pressable
                                style={[s.teamChip, { borderColor: !selectedTeamId ? '#8B5CF6' : colors.cardBorder, backgroundColor: !selectedTeamId ? 'rgba(139,92,246,0.15)' : colors.inputBg }]}
                                onPress={() => setSelectedTeamId('')}
                            >
                                <Text style={[s.teamChipText, { color: !selectedTeamId ? '#8B5CF6' : colors.textMuted }]}>Tất cả tổ</Text>
                            </Pressable>
                            {teams.map(t => (
                                <Pressable
                                    key={t.id}
                                    style={[s.teamChip, { borderColor: selectedTeamId === t.id ? '#8B5CF6' : colors.cardBorder, backgroundColor: selectedTeamId === t.id ? 'rgba(139,92,246,0.15)' : colors.inputBg }]}
                                    onPress={() => setSelectedTeamId(t.id)}
                                >
                                    <Text style={[s.teamChipText, { color: selectedTeamId === t.id ? '#8B5CF6' : colors.textMuted }]}>{t.name}</Text>
                                </Pressable>
                            ))}
                        </View>
                    )}
                </View>

                <FlatList
                    data={filtered}
                    keyExtractor={keyExtractor}
                    renderItem={renderItem}
                    contentContainerStyle={s.list}
                    showsVerticalScrollIndicator={false}
                    onEndReached={onEndReached}
                    onEndReachedThreshold={0.4}
                    refreshControl={<RefreshControl refreshing={productsQuery.isRefetching && !productsQuery.isFetchingNextPage} onRefresh={onRefresh} tintColor="#8B5CF6" />}
                    ListEmptyComponent={
                        productsQuery.isLoading ? (
                            <View style={s.emptyW}><ActivityIndicator color="#8B5CF6" /><Text style={[s.emptyT, { color: colors.textMuted }]}>Đang tải...</Text></View>
                        ) : (
                            <View style={s.emptyW}><Tag size={32} color={colors.textMuted} /><Text style={[s.emptyT, { color: colors.textMuted }]}>Không có sản phẩm</Text></View>
                        )
                    }
                    ListFooterComponent={
                        <PaginationFooter
                            hasNextPage={!!productsQuery.hasNextPage}
                            isFetchingNextPage={productsQuery.isFetchingNextPage}
                            loadedCount={filtered.length}
                            onLoadMore={onEndReached}
                            accentColor="#8B5CF6"
                        />
                    }
                />
            </SafeAreaView>
            {DialogComponent}
        </View>
    );
}

const s = StyleSheet.create({
    root: { flex: 1 },
    safe: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
    backBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    headerIcon: { marginRight: 4 },
    iconGrad: { width: 38, height: 38, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
    title: { fontSize: FontSizes.lg, fontWeight: FontWeights.bold },
    sub: { fontSize: FontSizes.xs, marginTop: 1 },
    searchBox: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: 10, borderRadius: 14, borderWidth: 1 },
    searchInput: { flex: 1, fontSize: FontSizes.sm, padding: 0 },
    teamChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
    teamChipText: { fontSize: FontSizes.xs, fontWeight: FontWeights.semibold },
    list: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, paddingBottom: 100, gap: Spacing.md },
    emptyW: { alignItems: 'center', paddingVertical: 60, gap: Spacing.md },
    emptyT: { fontSize: FontSizes.base, textAlign: 'center' },
    card: { borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(139,92,246,0.3)', backgroundColor: '#FFFFFF' },
    cardInner: { padding: Spacing.md },
    cardTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
    cardTitle: { fontSize: FontSizes.base, fontWeight: FontWeights.semibold, flex: 1 },
    cardSub: { fontSize: FontSizes.xs, marginTop: 2 },
    totalBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
    totalBadgeText: { fontSize: FontSizes.sm, fontWeight: FontWeights.bold },
    stepsWrap: { borderTopWidth: 1, paddingTop: Spacing.sm, gap: Spacing.xs },
    stepRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: 8, borderRadius: 10, borderWidth: 1, backgroundColor: '#F9FAFB' },
    stepSeq: { fontSize: 11, fontWeight: FontWeights.bold, minWidth: 36 },
    stepName: { flex: 1, fontSize: FontSizes.sm },
    stepPrice: { fontSize: FontSizes.sm, fontWeight: FontWeights.bold },
});
