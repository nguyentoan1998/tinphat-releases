// Inventory Current Stock Screen — Glassmorphism
import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, RefreshControl, TextInput, FlatList, ListRenderItem } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Boxes, ChevronLeft, Search, RefreshCw, Layers } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';

import { inventoryApi, Stock, Warehouse } from '@/lib/inventory-api';
import { Spacing, FontSizes, FontWeights, BorderRadius, Shadows } from '@/constants/Tokens';
import { useThemeStore } from '@/store';
import { ThemeColors } from '@/constants/ThemeColors';
import { useDarkDialog } from '@/components/ui/DarkDialog';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

const fmtCurrency = (n: number) => n.toLocaleString('vi-VN') + 'đ';

const WAREHOUSE_COLOR_PALETTE = [
    { bg: 'rgba(56,189,248,0.18)', fg: '#38BDF8' }, // sky
    { bg: 'rgba(34,197,94,0.18)', fg: '#22C55E' },  // green
    { bg: 'rgba(168,85,247,0.18)', fg: '#A855F7' }, // purple
    { bg: 'rgba(244,63,94,0.18)', fg: '#F43F5E' },  // rose
    { bg: 'rgba(245,158,11,0.18)', fg: '#F59E0B' }, // amber
    { bg: 'rgba(99,102,241,0.18)', fg: '#6366F1' }, // indigo
];

const colorForWarehouse = (id: string) => {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
    return WAREHOUSE_COLOR_PALETTE[h % WAREHOUSE_COLOR_PALETTE.length];
};

export default function CurrentStockScreen() {
    const router = useRouter();
    const [warehouseId, setWarehouseId] = useState<string>(''); // '' = all
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(search), 300);
        return () => clearTimeout(t);
    }, [search]);

    const { isDark } = useThemeStore();
    const colors = ThemeColors.light;
    const { showDialog, DialogComponent } = useDarkDialog();

    const warehousesQuery = useQuery({
        queryKey: ['warehouses'],
        queryFn: () => inventoryApi.getWarehouses(),
    });

    const PAGE_SIZE = 50;

    const stockQuery = useInfiniteQuery({
        queryKey: ['inventory-stock', warehouseId, debouncedSearch.trim()],
        queryFn: ({ pageParam }) =>
            inventoryApi.getStockPage({
                warehouseId: warehouseId || undefined,
                q: debouncedSearch.trim() || undefined,
                page: Number(pageParam ?? 1),
                limit: PAGE_SIZE,
            }),
        initialPageParam: 1,
        getNextPageParam: (lastPage) => lastPage.nextPage ?? undefined,
    });

    const warehouses = warehousesQuery.data ?? [];
    const stock = useMemo(
        () => stockQuery.data?.pages.flatMap((p) => p.items) ?? [],
        [stockQuery.data]
    );

    const warehouseMap = useMemo(
        () => warehouses.reduce<Record<string, Warehouse>>((m, w) => { m[w.id] = w; return m; }, {}),
        [warehouses]
    );

    const selectedWarehouseName = warehouseId ? (warehouseMap[warehouseId]?.name || warehouseId) : 'Tất cả kho';

    // Server-side search already applied via q param
    const filtered = stock;

    const totalValue = useMemo(
        () => filtered.reduce((sum, s) => sum + s.quantity * 0, 0),
        [filtered]
    );

    const lastStockErrorShownAt = useRef<number>(0);

    useEffect(() => {
        if (!stockQuery.isError) return;
        // show at most once per error occurrence
        if (stockQuery.errorUpdatedAt <= lastStockErrorShownAt.current) return;
        lastStockErrorShownAt.current = stockQuery.errorUpdatedAt;
        const e: any = stockQuery.error;
        showDialog('Lỗi', e?.response?.data?.message || 'Không thể tải tồn kho');
    }, [stockQuery.isError, stockQuery.errorUpdatedAt]);

    const onRefresh = useCallback(async () => {
        await Promise.all([warehousesQuery.refetch(), stockQuery.refetch()]);
    }, [warehousesQuery, stockQuery]);

    const onEndReached = useCallback(() => {
        if (stockQuery.hasNextPage && !stockQuery.isFetchingNextPage) {
            stockQuery.fetchNextPage();
        }
    }, [stockQuery.hasNextPage, stockQuery.isFetchingNextPage, stockQuery.fetchNextPage]);

    const renderItem: ListRenderItem<Stock> = useCallback(({ item }) => {
        const rs = item.RoutingStep;
        return (
            <View style={s.card}>
                <View style={s.cardInner}>
                    <View style={s.row}>
                        <View style={s.nw}>
                            <Text style={[s.cTitle, { color: colors.textPrimary }]}>{item.Product?.name || 'N/A'}</Text>
                            <Text style={[s.cSub, { color: colors.textMuted }]}>{item.Product?.code || item.productId}</Text>
                        </View>
                        <View style={[s.qtyBadge, { backgroundColor: 'rgba(56,189,248,0.12)' }]}>
                            <Text style={s.qtyT}>{Number(item.quantity).toLocaleString('vi-VN')}</Text>
                        </View>
                    </View>
                    {rs ? (
                        <View style={[s.rsRow, { backgroundColor: 'rgba(168,85,247,0.08)', borderColor: 'rgba(168,85,247,0.2)' }]}>
                            <Layers size={12} color="#A855F7" />
                            <Text style={[s.rsText, { color: '#A855F7' }]} numberOfLines={1}>
                                CĐ {rs.sequenceNo}: {rs.Operation?.name || 'N/A'}
                            </Text>
                        </View>
                    ) : null}
                    <View style={s.metaRow}>
                        {warehouseId === '' ? (
                            <View style={[s.whBadge, { backgroundColor: colorForWarehouse(item.warehouseId).bg }]}>
                                <Text style={[s.whBadgeText, { color: colorForWarehouse(item.warehouseId).fg }]}>
                                    {warehouseMap[item.warehouseId]?.name || item.warehouseId}
                                </Text>
                            </View>
                        ) : null}
                        <View style={{ flex: 1 }} />
                    </View>
                </View>
            </View>
        );
    }, [colors, warehouseId, warehouseMap]);

    const keyExtractor = useCallback((item: Stock, index: number) => `${item.warehouseId}-${item.productId}-${index}`,
        []
    );

    const warehousesLoading = warehousesQuery.isLoading || warehousesQuery.isFetching;
    const refreshing = (stockQuery.isRefetching && !stockQuery.isFetchingNextPage) || warehousesQuery.isRefetching;
    const isLoading = stockQuery.isLoading;

    return (
        <View style={s.root}>
            <StatusBar style={isDark ? "light" : "dark"} />
            <LinearGradient colors={colors.gradientColors} style={StyleSheet.absoluteFill} />
            <SafeAreaView style={s.safe} edges={['top']}>
                <Animated.View entering={FadeInDown.duration(400)} style={s.header}>
                    <Pressable style={[s.backBtn, { backgroundColor: colors.inputBg }]} onPress={() => router.replace('/(tabs)/inventory')}>
                        <ChevronLeft size={20} color={colors.textSecondary} />
                    </Pressable>
                    <View style={s.headerIcon}>
                        <LinearGradient colors={['#10B981', '#34D399']} style={s.iconGrad}>
                            <Boxes size={20} color="#fff" strokeWidth={2} />
                        </LinearGradient>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[s.title, { color: colors.textPrimary }]}>Tồn kho hiện tại</Text>
                        <Text style={[s.sub, { color: colors.textMuted }]}>
                            {filtered.length} mặt hàng • {selectedWarehouseName}{debouncedSearch.trim() ? ` • "${debouncedSearch.trim()}"` : ''}
                        </Text>
                    </View>
                    <Pressable style={[s.btn, { backgroundColor: colors.inputBg }]} onPress={() => onRefresh()}>
                        <RefreshCw size={16} color={colors.textSecondary} />
                    </Pressable>
                </Animated.View>

                {/* Stats */}
                <Animated.View entering={FadeInDown.duration(400).delay(60)} style={s.statsRow}>
                    {[
                        { label: 'Mặt hàng', value: filtered.length, color: '#38BDF8' },
                        { label: 'Giá trị tồn', value: (totalValue / 1000000).toFixed(1) + 'M', color: '#34D399' },
                    ].map(st => (
                        <View key={st.label} style={s.statCard}>
                            <View style={s.statInner}>
                                <Text style={[s.statV, { color: st.color }]}>{st.value}</Text>
                                <Text style={[s.statL, { color: colors.textMuted }]}>{st.label}</Text>
                            </View>
                        </View>
                    ))}
                </Animated.View>

                {/* Filters */}
                <View style={s.filtersWrap}>
                    {/* Warehouse filter chips (like team filter) */}
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={s.whChipsRow}
                    >
                        <Pressable
                            style={[
                                s.whChip,
                                {
                                    borderColor: warehouseId === '' ? '#38BDF8' : colors.cardBorder,
                                    backgroundColor: warehouseId === '' ? 'rgba(56,189,248,0.15)' : colors.inputBg,
                                },
                            ]}
                            onPress={() => setWarehouseId('')}
                        >
                            <Text style={[s.whChipText, { color: warehouseId === '' ? '#38BDF8' : colors.textMuted }]}>Tất cả</Text>
                        </Pressable>

                        {warehousesLoading && warehouses.length === 0 ? (
                            [0, 1, 2].map((i) => (
                                <View
                                    key={`wh_skel_${i}`}
                                    style={[s.whChip, { borderColor: colors.cardBorder, backgroundColor: colors.inputBg, opacity: 0.55 }]}
                                >
                                    <View style={[s.whChipSkeleton, { backgroundColor: colors.cardBorder }]} />
                                </View>
                            ))
                        ) : (
                            warehouses.map((w) => {
                                const active = warehouseId === w.id;
                                const c = colorForWarehouse(w.id);
                                return (
                                    <Pressable
                                        key={w.id}
                                        style={[
                                            s.whChip,
                                            {
                                                borderColor: active ? c.fg : colors.cardBorder,
                                                backgroundColor: active ? c.bg : colors.inputBg,
                                            },
                                        ]}
                                        onPress={() => setWarehouseId(active ? '' : w.id)}
                                    >
                                        <Text style={[s.whChipText, { color: active ? c.fg : colors.textMuted }]} numberOfLines={1}>
                                            {w.name}
                                        </Text>
                                    </Pressable>
                                );
                            })
                        )}
                    </ScrollView>

                    {/* Search */}
                    <View style={[s.searchBox, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder }]}>
                        <Search size={16} color={colors.textMuted} />
                        <TextInput
                            style={[s.searchInput, { color: colors.textPrimary }]}
                            placeholder="Tìm sản phẩm, quy cách..."
                            placeholderTextColor={colors.textMuted}
                            value={search}
                            onChangeText={setSearch}
                        />
                    </View>
                </View>

                {isLoading ? (
                    <View style={s.loadingBox}>
                        <Text style={[s.loadingText, { color: colors.textMuted }]}>Đang tải...</Text>
                    </View>
                ) : filtered.length === 0 ? (
                    <View style={s.emptyW}>
                        <Boxes size={44} color={colors.textMuted} />
                        <Text style={[s.emptyT, { color: colors.textMuted }]}>Không có dữ liệu tồn kho</Text>
                    </View>
                ) : (
                    <FlatList
                        data={filtered}
                        keyExtractor={keyExtractor}
                        renderItem={renderItem}
                        contentContainerStyle={[s.list, s.gap]}
                        showsVerticalScrollIndicator={false}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#38BDF8" />}
                        removeClippedSubviews
                        initialNumToRender={10}
                        maxToRenderPerBatch={12}
                        windowSize={7}
                        updateCellsBatchingPeriod={40}
                        onEndReached={onEndReached}
                        onEndReachedThreshold={0.4}
                        ListFooterComponent={
                            <View style={{ paddingVertical: 18 }}>
                                {stockQuery.isFetchingNextPage ? (
                                    <Text style={[s.loadingMoreText, { color: colors.textMuted }]}>Đang tải thêm...</Text>
                                ) : stockQuery.hasNextPage ? (
                                    <Text style={[s.loadingMoreText, { color: colors.textMuted }]}>Kéo để tải thêm</Text>
                                ) : (
                                    <View style={{ height: 70 }} />
                                )}
                            </View>
                        }
                    />
                )}
            </SafeAreaView>
            {DialogComponent}
        </View>
    );
}

const s = StyleSheet.create({
    root: { flex: 1 }, safe: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
    backBtn: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    btn: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    headerIcon: { marginRight: 4 },
    iconGrad: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    title: { fontSize: FontSizes.lg, fontWeight: FontWeights.bold },
    sub: { fontSize: FontSizes.xs, marginTop: 1 },
    statsRow: { flexDirection: 'row', gap: Spacing.md, paddingHorizontal: Spacing.xl, marginBottom: Spacing.sm },
    statCard: { flex: 1, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(1, 86, 167, 0.45)', backgroundColor: '#FFF', ...Shadows.small },
    statInner: { paddingVertical: 12, paddingHorizontal: 8, alignItems: 'center' },
    statV: { fontSize: 20, fontWeight: FontWeights.bold },
    statL: { fontSize: 10 },
    // Warehouse filter chips
    filtersWrap: {
        marginHorizontal: Spacing.xl,
        marginBottom: Spacing.sm,
        gap: Spacing.sm,
    },

    whChipsRow: {
        paddingRight: Spacing.xl, // allow last chip spacing while horizontal scrolling
        gap: 8,
        minHeight: 36,
        alignItems: 'center',
    },
    whChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        height: 32,
        borderRadius: 16,
        borderWidth: 1,
        maxWidth: 160,
    },
    whChipText: { fontSize: 11, fontWeight: FontWeights.semibold },
    whChipSkeleton: { width: 56, height: 10, borderRadius: 6 },

    searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10 },
    searchInput: { flex: 1, fontSize: FontSizes.sm },

    loadingBox: { paddingVertical: 60, alignItems: 'center' },
    loadingText: { fontSize: FontSizes.base, textAlign: 'center' },
    loadingMoreText: { fontSize: FontSizes.sm, textAlign: 'center' },
    list: { paddingHorizontal: Spacing.xl },
    emptyW: { alignItems: 'center', paddingVertical: 60, gap: Spacing.md },
    emptyT: { fontSize: FontSizes.base, textAlign: 'center' },
    gap: { gap: Spacing.md },
    card: { borderRadius: 18, borderWidth: 1, borderColor: 'rgba(1, 86, 167, 0.45)', backgroundColor: '#FFF', ...Shadows.small },
    cardInner: { padding: Spacing.md, gap: 6 },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    nw: { flex: 1, marginRight: Spacing.sm },
    cTitle: { fontSize: FontSizes.sm, fontWeight: FontWeights.semibold },
    cSub: { fontSize: FontSizes.xs, marginTop: 2 },
    qtyBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8 },
    qtyT: { fontSize: FontSizes.base, fontWeight: FontWeights.bold, color: '#38BDF8' },
    metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
    rsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, borderWidth: 1, alignSelf: 'flex-start' },
    rsText: { fontSize: 11, fontWeight: FontWeights.semibold },
    meta: { fontSize: FontSizes.xs },
    totalV: { fontSize: FontSizes.xs, fontWeight: FontWeights.bold },
    whBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
    },
    whBadgeText: { fontSize: FontSizes.xs, fontWeight: FontWeights.semibold },
});
