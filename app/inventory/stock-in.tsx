// Inventory Stock-In Screen — Infinite Scroll
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList, ListRenderItem, RefreshControl, ActivityIndicator } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import { PackagePlus, ChevronLeft, RefreshCw, Calendar, Warehouse, Package, Layers } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';

import { inventoryApi, StockMovement } from '@/lib/inventory-api';
import { Spacing, FontSizes, FontWeights } from '@/constants/Tokens';
import { useThemeStore } from '@/store';
import { ThemeColors } from '@/constants/ThemeColors';
import { useDarkDialog } from '@/components/ui/DarkDialog';

const PAGE_SIZE = 20;
const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';

export default function StockInScreen() {
    const router = useRouter();
    const [items, setItems] = useState<StockMovement[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasNext, setHasNext] = useState(false);
    const [total, setTotal] = useState(0);
    const pageRef = useRef(1);
    const { isDark } = useThemeStore();
    const colors = ThemeColors.light;
    const { showDialog, DialogComponent } = useDarkDialog();

    useEffect(() => { loadFirst(); }, []);

    const loadFirst = async () => {
        try {
            setLoading(true);
            pageRef.current = 1;
            const res = await inventoryApi.getInbound(1, PAGE_SIZE);
            setItems(res.data);
            setHasNext(res.hasNext);
            setTotal(res.total);
        } catch (e: any) {
            showDialog('Lỗi', e.response?.data?.message || e.message || 'Không thể tải nhập kho');
            setItems([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const loadMore = useCallback(async () => {
        if (loadingMore || !hasNext) return;
        try {
            setLoadingMore(true);
            const nextPage = pageRef.current + 1;
            const res = await inventoryApi.getInbound(nextPage, PAGE_SIZE);
            setItems(prev => [...prev, ...res.data]);
            setHasNext(res.hasNext);
            setTotal(res.total);
            pageRef.current = nextPage;
        } catch (e: any) {
            // silent — không block UI
        } finally {
            setLoadingMore(false);
        }
    }, [loadingMore, hasNext]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadFirst();
    }, []);

    const totalQty = items.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);

    const renderItem: ListRenderItem<StockMovement> = useCallback(({ item, index }) => (
        <Animated.View entering={FadeInUp.duration(300).delay(Math.min(index, 8) * 40).springify().damping(18)}>
            <View style={[s.card, { borderColor: colors.cardBorder }]}>
                <BlurView intensity={18} tint={colors.blurTint} style={StyleSheet.absoluteFill} />
                <View style={[s.cardInner, { backgroundColor: colors.cardBg }]}>
                    {/* Top row */}
                    <View style={s.cardTop}>
                        <View style={s.idBadge}>
                            <Text style={s.idText}>#{item.id.slice(0, 8).toUpperCase()}</Text>
                        </View>
                        <View style={[s.statusDot, { backgroundColor: '#10B981' }]} />
                        <Text style={[s.statusText, { color: '#10B981' }]}>Nhập kho</Text>
                    </View>
                    {/* Tên sản phẩm */}
                    {item.Product?.name && (
                        <View style={s.infoRow}>
                            <Package size={13} color="#0EA5E9" />
                            <Text style={[s.infoText, { color: colors.textPrimary, fontWeight: FontWeights.semibold }]} numberOfLines={1}>
                                {item.Product.name}
                            </Text>
                        </View>
                    )}
                    {/* Công đoạn — chỉ hiển thị khi thuộc đúng sản phẩm */}
                    {item.RoutingStep?.Operation?.name && item.RoutingStep?.productId === item.productId && (
                        <View style={s.infoRow}>
                            <Layers size={13} color="#A855F7" />
                            <Text style={[s.infoText, { color: '#A855F7' }]} numberOfLines={1}>
                                CĐ {item.RoutingStep.sequenceNo}: {item.RoutingStep.Operation.name}
                            </Text>
                        </View>
                    )}
                    {/* Kho */}
                    <View style={s.infoRow}>
                        <Warehouse size={13} color={colors.textMuted} />
                        <Text style={[s.infoText, { color: colors.textMuted }]}>{item.Warehouse?.name || 'Chưa xác định'}</Text>
                    </View>
                    <View style={s.cardBottom}>
                        <View style={s.infoRow}>
                            <Calendar size={13} color={colors.textMuted} />
                            <Text style={[s.infoText, { color: colors.textMuted }]}>{fmtDate(item.createdAt)}</Text>
                        </View>
                        <View style={[s.qtyChip, { backgroundColor: 'rgba(14,165,233,0.15)' }]}>
                            <Text style={s.qtyText}>SL: {Number(item.quantity).toLocaleString('vi-VN')}</Text>
                        </View>
                    </View>
                    {item.note ? <Text style={[s.note, { color: colors.textMuted }]} numberOfLines={1}>📝 {item.note}</Text> : null}
                </View>
            </View>
        </Animated.View>
    ), [colors]);

    const keyExtractor = useCallback((item: StockMovement) => item.id, []);

    const ListFooter = () => {
        if (loadingMore) {
            return (
                <View style={{ paddingVertical: Spacing.lg, alignItems: 'center' }}>
                    <ActivityIndicator size="small" color="#0EA5E9" />
                    <Text style={{ fontSize: FontSizes.xs, color: colors.textMuted, marginTop: 6 }}>Đang tải thêm...</Text>
                </View>
            );
        }
        if (!hasNext && items.length > 0) {
            return (
                <View style={{ paddingVertical: Spacing.md, alignItems: 'center' }}>
                    <Text style={{ fontSize: FontSizes.xs, color: colors.textMuted }}>
                        Đã hiển thị {items.length}/{total} phiếu
                    </Text>
                </View>
            );
        }
        return <View style={{ height: 100 }} />;
    };

    return (
        <View style={s.root}>
            <StatusBar style={isDark ? 'light' : 'dark'} />
            <LinearGradient colors={colors.gradientColors} style={StyleSheet.absoluteFill} />
            <SafeAreaView style={s.safe} edges={['top']}>
                {/* Header */}
                <Animated.View entering={FadeInDown.duration(400)} style={s.header}>
                    <Pressable style={[s.backBtn, { backgroundColor: colors.inputBg }]} onPress={() => router.replace('/(tabs)/inventory')}>
                        <ChevronLeft size={20} color={colors.textSecondary} />
                    </Pressable>
                    <View style={s.headerIcon}>
                        <LinearGradient colors={['#0EA5E9', '#38BDF8']} style={s.iconGrad}>
                            <PackagePlus size={20} color="#fff" strokeWidth={2} />
                        </LinearGradient>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[s.title, { color: colors.textPrimary }]}>Nhập kho</Text>
                        <Text style={[s.sub, { color: colors.textMuted }]}>
                            {total > 0 ? `${items.length}/${total} phiếu` : `${items.length} phiếu`}
                        </Text>
                    </View>
                    <Pressable style={[s.backBtn, { backgroundColor: colors.inputBg }]} onPress={onRefresh}>
                        <RefreshCw size={15} color={colors.textSecondary} />
                    </Pressable>
                </Animated.View>

                {/* Summary */}
                <Animated.View entering={FadeInDown.duration(400).delay(60)} style={s.summaryRow}>
                    <View style={[s.summaryCard, { backgroundColor: 'rgba(14,165,233,0.12)', borderColor: 'rgba(14,165,233,0.25)' }]}>
                        <Text style={[s.summaryVal, { color: '#0EA5E9' }]}>{total || items.length}</Text>
                        <Text style={[s.summaryLbl, { color: colors.textMuted }]}>Tổng phiếu</Text>
                    </View>
                    <View style={[s.summaryCard, { backgroundColor: 'rgba(16,185,129,0.12)', borderColor: 'rgba(16,185,129,0.25)' }]}>
                        <Text style={[s.summaryVal, { color: '#10B981' }]}>
                            {totalQty.toLocaleString('vi-VN')}
                        </Text>
                        <Text style={[s.summaryLbl, { color: colors.textMuted }]}>
                            SL đã tải {hasNext ? '(chưa đủ)' : ''}
                        </Text>
                    </View>
                </Animated.View>

                {/* List */}
                {loading ? (
                    <View style={s.emptyW}>
                        <ActivityIndicator size="large" color="#0EA5E9" />
                        <Text style={[s.emptyT, { color: colors.textMuted }]}>Đang tải...</Text>
                    </View>
                ) : items.length === 0 ? (
                    <View style={s.emptyW}>
                        <View style={s.emptyIcon}>
                            <PackagePlus size={36} color="#0EA5E9" strokeWidth={1.5} />
                        </View>
                        <Text style={[s.emptyTitle, { color: colors.textPrimary }]}>Chưa có phiếu nhập</Text>
                        <Text style={[s.emptyT, { color: colors.textMuted }]}>Dữ liệu nhập kho sẽ hiển thị ở đây</Text>
                    </View>
                ) : (
                    <FlatList
                        data={items}
                        keyExtractor={keyExtractor}
                        renderItem={renderItem}
                        contentContainerStyle={s.list}
                        showsVerticalScrollIndicator={false}
                        onEndReached={loadMore}
                        onEndReachedThreshold={0.3}
                        ListFooterComponent={ListFooter}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0EA5E9" />
                        }
                        removeClippedSubviews
                        initialNumToRender={10}
                        maxToRenderPerBatch={10}
                        windowSize={5}
                        ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
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
    headerIcon: { marginRight: 4 },
    iconGrad: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    title: { fontSize: FontSizes.lg, fontWeight: FontWeights.bold },
    sub: { fontSize: FontSizes.xs, marginTop: 1 },
    summaryRow: { flexDirection: 'row', gap: Spacing.md, paddingHorizontal: Spacing.xl, marginBottom: Spacing.sm },
    summaryCard: { flex: 1, borderRadius: 14, borderWidth: 1, paddingVertical: 12, alignItems: 'center' },
    summaryVal: { fontSize: 22, fontWeight: FontWeights.bold },
    summaryLbl: { fontSize: 11, marginTop: 2 },
    list: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.xs },
    emptyW: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingVertical: 70 },
    emptyIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(14,165,233,0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
    emptyTitle: { fontSize: FontSizes.base, fontWeight: FontWeights.semibold },
    emptyT: { fontSize: FontSizes.sm, textAlign: 'center' },
    card: { borderRadius: 16, overflow: 'hidden', borderWidth: 1 },
    cardInner: { padding: Spacing.md, gap: 8 },
    cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    idBadge: { backgroundColor: 'rgba(14,165,233,0.15)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    idText: { fontSize: 11, fontWeight: FontWeights.bold, color: '#0EA5E9', letterSpacing: 0.5 },
    statusDot: { width: 6, height: 6, borderRadius: 3, marginLeft: 'auto' },
    statusText: { fontSize: 11, fontWeight: FontWeights.semibold },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    infoText: { fontSize: FontSizes.xs, flex: 1 },
    cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    qtyChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    qtyText: { fontSize: 12, fontWeight: FontWeights.bold, color: '#0EA5E9' },
    note: { fontSize: 11, fontStyle: 'italic' },
});
