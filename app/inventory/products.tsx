// Products Screen — Glassmorphism with infinite scroll (like current-stock)
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    View, Text, StyleSheet, TextInput, Pressable, ScrollView,
    Modal, Image, FlatList, ListRenderItem, RefreshControl,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import {
    Package, Search, X, Layers, Tag, Ruler,
    ChevronRight, Info, ChevronLeft, RefreshCw,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';

import { inventoryApi, Product } from '@/lib/inventory-api';
import PaginationFooter from '@/components/ui/PaginationFooter';
import { Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants/Tokens';
import { StatusBadge } from '@/components/ui/GlassDataScreen';
import { useThemeStore } from '@/store';
import { ThemeColors } from '@/constants/ThemeColors';
import { useDarkDialog } from '@/components/ui/DarkDialog';

type PType = 'RAW_MATERIAL' | 'SEMI_FINISHED' | 'FINISHED_PRODUCT' | 'TOOLS' | 'BOLTS' | 'NYLON';

const TYPE_MAP: Record<PType, { label: string; color: string }> = {
    RAW_MATERIAL: { label: 'Nguyên liệu', color: '#F59E0B' },
    SEMI_FINISHED: { label: 'Bán thành phẩm', color: '#3B82F6' },
    FINISHED_PRODUCT: { label: 'Thành phẩm', color: '#10B981' },
    TOOLS: { label: 'Công cụ DC', color: '#8B5CF6' },
    BOLTS: { label: 'Bulong', color: '#EC4899' },
    NYLON: { label: 'Nilon', color: '#06B6D4' },
};

const PAGE_SIZE = 50;

export default function ProductsScreen() {
    const router = useRouter();
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState<PType | 'all'>('all');
    const [selected, setSelected] = useState<Product | null>(null);
    const { isDark } = useThemeStore();
    const colors = ThemeColors.light;
    const { showDialog, DialogComponent } = useDarkDialog();

    // Debounce search input 300ms
    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(search), 300);
        return () => clearTimeout(t);
    }, [search]);

    const productsQuery = useInfiniteQuery({
        queryKey: ['products', debouncedSearch.trim()],
        queryFn: ({ pageParam }) =>
            inventoryApi.getProductsPage({
                q: debouncedSearch.trim() || undefined,
                page: Number(pageParam ?? 1),
                limit: PAGE_SIZE,
            }),
        initialPageParam: 1,
        getNextPageParam: (lastPage) => lastPage.nextPage ?? undefined,
    });

    const allProducts = useMemo(
        () => productsQuery.data?.pages.flatMap((p) => p.items) ?? [],
        [productsQuery.data]
    );

    // Client-side type filter (backend does not support productType query param)
    const products = useMemo(
        () => typeFilter === 'all' ? allProducts : allProducts.filter((p) => p.productType === typeFilter),
        [allProducts, typeFilter]
    );

    const lastErrorShownAt = useRef<number>(0);
    useEffect(() => {
        if (!productsQuery.isError) return;
        if (productsQuery.errorUpdatedAt <= lastErrorShownAt.current) return;
        lastErrorShownAt.current = productsQuery.errorUpdatedAt;
        const e: any = productsQuery.error;
        showDialog('Lỗi', e?.response?.data?.message || 'Không thể tải sản phẩm');
    }, [productsQuery.isError, productsQuery.errorUpdatedAt]);

    const onRefresh = useCallback(async () => {
        await productsQuery.refetch();
    }, [productsQuery]);

    const onEndReached = useCallback(() => {
        if (productsQuery.hasNextPage && !productsQuery.isFetchingNextPage) {
            productsQuery.fetchNextPage();
        }
    }, [productsQuery.hasNextPage, productsQuery.isFetchingNextPage, productsQuery.fetchNextPage]);

    const refreshing = productsQuery.isRefetching && !productsQuery.isFetchingNextPage;
    const isLoading = productsQuery.isLoading;

    const renderItem: ListRenderItem<Product> = useCallback(({ item: p, index: i }) => {
        const tm = TYPE_MAP[p.productType as PType] || { label: p.productType, color: '#6B7280' };
        const specCount = 0;
        return (
            <Animated.View entering={FadeInUp.duration(300).delay(Math.min(i, 8) * 30).springify().damping(18)}>
                <Pressable onPress={() => setSelected(p)} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
                    <View style={[s.card, { borderColor: colors.cardBorder }]}>
                        <BlurView intensity={18} tint={colors.blurTint} style={StyleSheet.absoluteFill} />
                        <View style={[s.cardInner, { backgroundColor: colors.cardBg }]}>
                            <View style={s.cardRow}>
                                {p.image ? (
                                    <Image source={{ uri: p.image }} style={[s.productImg, { backgroundColor: colors.inputBg }]} />
                                ) : (
                                    <View style={[s.productImgPlaceholder, { backgroundColor: colors.inputBg }]}>
                                        <Package size={24} color={colors.textMuted} />
                                    </View>
                                )}
                                <View style={s.cardInfo}>
                                    <Text style={[s.cardTitle, { color: colors.textPrimary }]} numberOfLines={1}>{p.name}</Text>
                                    <Text style={[s.cardCode, { color: colors.textMuted }]}>{p.code}</Text>
                                    <View style={s.cardMeta}>
                                        <StatusBadge label={tm.label} color={tm.color} />
                                        {specCount > 0 && (
                                            <View style={[s.specCountBadge, { backgroundColor: colors.inputBg }]}>
                                                <Layers size={10} color={colors.textMuted} />
                                                <Text style={[s.specCountText, { color: colors.textMuted }]}>{specCount} QC</Text>
                                            </View>
                                        )}
                                    </View>
                                </View>
                                <ChevronRight size={18} color={colors.chevronColor} />
                            </View>
                        </View>
                    </View>
                </Pressable>
            </Animated.View>
        );
    }, [colors]);

    const keyExtractor = useCallback((item: Product) => item.id, []);

    return (
        <>
            <View style={s.root}>
                <StatusBar style={isDark ? 'light' : 'dark'} />
                <LinearGradient colors={colors.gradientColors} style={StyleSheet.absoluteFill} />
                <SafeAreaView style={s.safe} edges={['top']}>

                    {/* Header */}
                    <Animated.View entering={FadeInDown.duration(400)} style={s.header}>
                        <Pressable style={[s.iconBtn, { backgroundColor: colors.inputBg }]} onPress={() => router.replace('/(tabs)/inventory')}>
                            <ChevronLeft size={20} color={colors.textSecondary} />
                        </Pressable>
                        <View style={s.headerIcon}>
                            <LinearGradient colors={['#6366F1', '#818CF8']} style={s.iconGrad}>
                                <Package size={20} color="#fff" strokeWidth={2} />
                            </LinearGradient>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[s.title, { color: colors.textPrimary }]}>Sản phẩm</Text>
                            <Text style={[s.sub, { color: colors.textMuted }]}>
                                {products.length} sản phẩm{debouncedSearch.trim() ? ` • "${debouncedSearch.trim()}"` : ''}
                            </Text>
                        </View>
                        <Pressable style={[s.iconBtn, { backgroundColor: colors.inputBg }]} onPress={onRefresh}>
                            <RefreshCw size={16} color={colors.textSecondary} />
                        </Pressable>
                    </Animated.View>

                    {/* Search */}
                    <Animated.View entering={FadeInDown.duration(400).delay(60)} style={s.searchWrap}>
                        <View style={[s.searchBox, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder }]}>
                            <Search size={16} color={colors.textMuted} />
                            <TextInput
                                style={[s.searchInput, { color: colors.textPrimary }]}
                                placeholder="Tìm sản phẩm, mã, danh mục..."
                                placeholderTextColor={colors.textMuted}
                                value={search}
                                onChangeText={setSearch}
                            />
                            {search.length > 0 && (
                                <Pressable onPress={() => setSearch('')} hitSlop={8}>
                                    <X size={16} color={colors.textMuted} />
                                </Pressable>
                            )}
                        </View>
                    </Animated.View>

                    {/* Type filter chips */}
                    <Animated.View entering={FadeInDown.duration(400).delay(90)}>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={s.chipRow}
                        >
                            <Pressable
                                style={[s.chip, { borderColor: typeFilter === 'all' ? '#6366F1' : colors.cardBorder, backgroundColor: typeFilter === 'all' ? 'rgba(99,102,241,0.15)' : colors.inputBg }]}
                                onPress={() => setTypeFilter('all')}
                            >
                                <Text style={[s.chipText, { color: typeFilter === 'all' ? '#6366F1' : colors.textMuted }]}>Tất cả</Text>
                            </Pressable>
                            {(Object.keys(TYPE_MAP) as PType[]).map(type => {
                                const tm = TYPE_MAP[type];
                                const active = typeFilter === type;
                                return (
                                    <Pressable
                                        key={type}
                                        style={[s.chip, { borderColor: active ? tm.color : colors.cardBorder, backgroundColor: active ? tm.color + '25' : colors.inputBg }]}
                                        onPress={() => setTypeFilter(active ? 'all' : type)}
                                    >
                                        <View style={[s.chipDot, { backgroundColor: tm.color }]} />
                                        <Text style={[s.chipText, { color: active ? tm.color : colors.textMuted }]}>{tm.label}</Text>
                                    </Pressable>
                                );
                            })}
                        </ScrollView>
                    </Animated.View>

                    {/* List */}
                    {isLoading ? (
                        <View style={s.loadingBox}>
                            <Text style={[s.loadingText, { color: colors.textMuted }]}>Đang tải...</Text>
                        </View>
                    ) : products.length === 0 ? (
                        <View style={s.emptyWrap}>
                            <Package size={48} color={colors.textMuted} />
                            <Text style={[s.emptyText, { color: colors.textMuted }]}>
                                {search || typeFilter !== 'all' ? 'Không tìm thấy sản phẩm' : 'Chưa có sản phẩm nào'}
                            </Text>
                        </View>
                    ) : (
                        <FlatList
                            data={products}
                            keyExtractor={keyExtractor}
                            renderItem={renderItem}
                            contentContainerStyle={[s.list, s.gap]}
                            showsVerticalScrollIndicator={false}
                            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366F1" />}
                            removeClippedSubviews
                            initialNumToRender={10}
                            maxToRenderPerBatch={12}
                            windowSize={7}
                            updateCellsBatchingPeriod={40}
                            onEndReached={onEndReached}
                            onEndReachedThreshold={0.4}
                            ListFooterComponent={
                                <PaginationFooter
                                    hasNextPage={!!productsQuery.hasNextPage}
                                    isFetchingNextPage={productsQuery.isFetchingNextPage}
                                    loadedCount={products.length}
                                    onLoadMore={onEndReached}
                                    accentColor="#6366F1"
                                />
                            }
                        />
                    )}
                </SafeAreaView>
                {DialogComponent}
            </View>

            {/* Detail Modal */}
            {selected && (
                <ProductDetailModal
                    product={selected}
                    onClose={() => setSelected(null)}
                />
            )}
        </>
    );
}

// ─── Detail Modal ────────────────────────────────────────────────────────────

function ProductDetailModal({ product: p, onClose }: { product: Product; onClose: () => void }) {
    const { isDark } = useThemeStore();
    const colors = ThemeColors.light;
    const tm = TYPE_MAP[p.productType as PType] || { label: p.productType, color: '#6B7280' };
    const fmtCurrency = (n: number) => n.toLocaleString('vi-VN') + 'đ';

    const infoRows = [
        { Icon: Tag, label: 'Loại sản phẩm', value: tm.label },
        ...(p.ProductCategory ? [{ Icon: Layers, label: 'Danh mục', value: p.ProductCategory.name }] : []),
        ...(p.MeasurementUnit ? [{ Icon: Ruler, label: 'Đơn vị tính', value: p.MeasurementUnit.name }] : []),
        { Icon: Package, label: 'SL tối thiểu', value: p.minimumQuantity.toLocaleString('vi-VN') },
        ...(p.description ? [{ Icon: Info, label: 'Mô tả', value: p.description }] : []),
    ];

    return (
        <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <View style={md.container}>
                <LinearGradient colors={colors.gradientColors} style={StyleSheet.absoluteFill} />
                <View style={[md.header, { borderBottomColor: colors.divider }]}>
                    <Text style={[md.headerTitle, { color: colors.textPrimary }]}>Chi tiết sản phẩm</Text>
                    <Pressable onPress={onClose} style={[md.closeBtn, { backgroundColor: colors.inputBg }]}>
                        <X size={20} color={colors.textSecondary} />
                    </Pressable>
                </View>

                <ScrollView contentContainerStyle={md.scroll} showsVerticalScrollIndicator={false}>
                    <Animated.View entering={FadeInDown.duration(400).springify().damping(18)} style={md.profileSection}>
                        {p.image ? (
                            <Image source={{ uri: p.image }} style={md.bigImg} />
                        ) : (
                            <LinearGradient colors={[tm.color, tm.color + '99']} style={md.bigImg}>
                                <Package size={40} color="#FFFFFF" />
                            </LinearGradient>
                        )}
                        <Text style={[md.profileName, { color: colors.textPrimary }]}>{p.name}</Text>
                        <Text style={[md.profileCode, { color: colors.textMuted }]}>{p.code}</Text>
                        <View style={[md.typeBadge, { backgroundColor: tm.color + '20' }]}>
                            <View style={[md.typeDot, { backgroundColor: tm.color }]} />
                            <Text style={[md.typeBadgeText, { color: tm.color }]}>{tm.label}</Text>
                        </View>
                    </Animated.View>

                    <Animated.View entering={FadeInUp.duration(400).delay(100).springify().damping(18)} style={md.infoList}>
                        {infoRows.map(({ Icon, label, value }, idx) => (
                            <View key={idx} style={[md.infoCard, { borderColor: colors.cardBorder }]}>
                                <BlurView intensity={20} tint={colors.blurTint} style={StyleSheet.absoluteFill} />
                                <View style={[md.infoInner, { backgroundColor: colors.cardBg }]}>
                                    <View style={[md.infoIcon, { backgroundColor: isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.1)' }]}>
                                        <Icon size={18} color="#6366F1" />
                                    </View>
                                    <View style={md.infoText}>
                                        <Text style={[md.infoLabel, { color: colors.textMuted }]}>{label}</Text>
                                        <Text style={[md.infoValue, { color: colors.textPrimary }]}>{value}</Text>
                                    </View>
                                </View>
                            </View>
                        ))}
                    </Animated.View>


                    <View style={{ height: 60 }} />
                </ScrollView>
            </View>
        </Modal>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
    root: { flex: 1 },
    safe: { flex: 1 },
    header: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
        paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, paddingBottom: Spacing.sm,
    },
    iconBtn: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    headerIcon: { marginRight: 4 },
    iconGrad: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    title: { fontSize: FontSizes.lg, fontWeight: FontWeights.bold },
    sub: { fontSize: FontSizes.xs, marginTop: 1 },
    searchWrap: { paddingHorizontal: Spacing.xl, marginBottom: Spacing.sm },
    searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10 },
    searchInput: { flex: 1, fontSize: FontSizes.sm },
    chipRow: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.sm, gap: 8, flexDirection: 'row' },
    chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: BorderRadius.full, borderWidth: 1 },
    chipDot: { width: 8, height: 8, borderRadius: 4 },
    chipText: { fontSize: FontSizes.sm },
    loadingBox: { paddingVertical: 60, alignItems: 'center' },
    loadingText: { fontSize: FontSizes.base, textAlign: 'center' },
    loadingMoreText: { fontSize: FontSizes.sm, textAlign: 'center' },
    list: { paddingHorizontal: Spacing.xl },
    gap: { gap: Spacing.sm },
    emptyWrap: { alignItems: 'center', paddingVertical: 60, gap: Spacing.md },
    emptyText: { fontSize: FontSizes.base },
    card: { borderRadius: 16, overflow: 'hidden', borderWidth: 1 },
    cardInner: { padding: Spacing.md },
    cardRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
    productImg: { width: 50, height: 50, borderRadius: 12 },
    productImgPlaceholder: { width: 50, height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    cardInfo: { flex: 1 },
    cardTitle: { fontSize: FontSizes.base, fontWeight: FontWeights.semibold },
    cardCode: { fontSize: FontSizes.xs, marginTop: 1 },
    cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
    specCountBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
    specCountText: { fontSize: 10 },
});

const md = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg, paddingTop: 50,
        borderBottomWidth: 1,
    },
    headerTitle: { fontSize: FontSizes.xl, fontWeight: FontWeights.bold, flex: 1 },
    closeBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    scroll: { paddingHorizontal: Spacing.xl, paddingBottom: 60 },
    profileSection: { alignItems: 'center', paddingVertical: Spacing.xxl },
    bigImg: { width: 88, height: 88, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.lg },
    profileName: { fontSize: FontSizes.xxl, fontWeight: FontWeights.bold, textAlign: 'center' },
    profileCode: { fontSize: FontSizes.sm, marginTop: 4, marginBottom: Spacing.md },
    typeBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
    typeDot: { width: 8, height: 8, borderRadius: 4 },
    typeBadgeText: { fontSize: FontSizes.sm, fontWeight: '600' },
    infoList: { gap: Spacing.sm, marginBottom: Spacing.xl, paddingHorizontal: Spacing.xl },
    infoCard: { borderRadius: BorderRadius.xl, overflow: 'hidden', borderWidth: 1 },
    infoInner: { flexDirection: 'row', alignItems: 'center', padding: Spacing.lg },
    infoIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
    infoText: { flex: 1 },
    infoLabel: { fontSize: FontSizes.xs },
    infoValue: { fontSize: FontSizes.base, fontWeight: FontWeights.medium, marginTop: 2 },
    specsSection: { marginBottom: Spacing.xl, paddingHorizontal: Spacing.xl },
    specsSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.md },
    specsSectionTitle: { fontSize: FontSizes.base, fontWeight: FontWeights.semibold },
    specCard: { borderRadius: BorderRadius.xl, overflow: 'hidden', borderWidth: 1, marginBottom: Spacing.sm },
    specInner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg },
    nameWrap: { flex: 1 },
    name: { fontSize: FontSizes.sm, fontWeight: FontWeights.medium },
    code: { fontSize: FontSizes.xs, marginTop: 1 },
    specPrices: { alignItems: 'flex-end' },
    specPrice: { fontSize: FontSizes.sm, fontWeight: FontWeights.semibold },
    specSalary: { fontSize: FontSizes.xs, marginTop: 1 },
});
