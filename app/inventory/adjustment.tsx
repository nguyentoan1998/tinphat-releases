// Inventory Adjustment Screen — Glassmorphism
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, RefreshControl } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import { SlidersHorizontal, ChevronLeft, RefreshCw, Calendar, Warehouse, Plus } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';

import { inventoryApi, StockMovement } from '@/lib/inventory-api';
import { Spacing, FontSizes, FontWeights } from '@/constants/Tokens';
import { useThemeStore } from '@/store';
import { ThemeColors } from '@/constants/ThemeColors';
import { useDarkDialog } from '@/components/ui/DarkDialog';
import AdjustmentModal from '@/components/AdjustmentModal';

const ACCENT = '#F59E0B';
const ACCENT2 = '#FBBF24';

type ModalMode = 'add' | 'view' | 'edit';

const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';

export default function AdjustmentScreen() {
    const router = useRouter();
    const [adjustments, setAdjustments] = useState<StockMovement[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState<ModalMode>('add');
    const [selectedAdjustment, setSelectedAdjustment] = useState<StockMovement | null>(null);

    const { isDark } = useThemeStore();
    const colors = ThemeColors.light;
    const { showDialog, DialogComponent } = useDarkDialog();

    useEffect(() => { load(); }, []);

    const load = async () => {
        try {
            setLoading(true);
            // Backend rejects ?type=ADJUST on stock-movements — use /inventory/count instead
            const d = await inventoryApi.getInventoryCounts();
            setAdjustments(Array.isArray(d) ? d : []);
        } catch (e: any) {
            showDialog('Lỗi', e.response?.data?.message || 'Không thể tải điều chỉnh');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const openAdd = () => {
        setSelectedAdjustment(null);
        setModalMode('add');
        setShowModal(true);
    };

    const openView = (a: StockMovement) => {
        setSelectedAdjustment(a);
        setModalMode('view');
        setShowModal(true);
    };

    const openEdit = (a: StockMovement) => {
        setSelectedAdjustment(a);
        setModalMode('edit');
        setShowModal(true);
    };

    const handleModalClose = () => {
        setShowModal(false);
    };

    const handleModalSuccess = () => {
        if (modalMode === 'view' && selectedAdjustment) {
            setTimeout(() => openEdit(selectedAdjustment), 100);
            return;
        }
        setShowModal(false);
        load();
    };

    const totalQty = adjustments.reduce((sum, a) => sum + (a.quantity || 0), 0);

    return (
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
                        <LinearGradient colors={[ACCENT, ACCENT2]} style={s.iconGrad}>
                            <SlidersHorizontal size={20} color="#fff" strokeWidth={2} />
                        </LinearGradient>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[s.title, { color: colors.textPrimary }]}>Điều chỉnh kho</Text>
                        <Text style={[s.sub, { color: colors.textMuted }]}>{adjustments.length} phiếu điều chỉnh</Text>
                    </View>
                    <Pressable style={[s.iconBtn, { backgroundColor: colors.inputBg }]} onPress={() => { setRefreshing(true); load(); }}>
                        <RefreshCw size={15} color={colors.textSecondary} />
                    </Pressable>
                </Animated.View>

                {/* Summary Cards */}
                <Animated.View entering={FadeInDown.duration(400).delay(60)} style={s.summaryRow}>
                    <View style={[s.summaryCard, { backgroundColor: 'rgba(245,158,11,0.12)', borderColor: 'rgba(245,158,11,0.25)' }]}>
                        <Text style={[s.summaryVal, { color: ACCENT }]}>{adjustments.length}</Text>
                        <Text style={[s.summaryLbl, { color: colors.textMuted }]}>Tổng phiếu</Text>
                    </View>
                    <View style={[s.summaryCard, { backgroundColor: 'rgba(251,191,36,0.12)', borderColor: 'rgba(251,191,36,0.25)' }]}>
                        <Text style={[s.summaryVal, { color: ACCENT2 }]}>{totalQty}</Text>
                        <Text style={[s.summaryLbl, { color: colors.textMuted }]}>Tổng SL</Text>
                    </View>
                </Animated.View>

                {/* List */}
                <ScrollView
                    contentContainerStyle={s.list}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => { setRefreshing(true); load(); }}
                            tintColor={ACCENT}
                        />
                    }
                >
                    {loading ? (
                        <View style={s.emptyW}>
                            <Text style={[s.emptyT, { color: colors.textMuted }]}>Đang tải...</Text>
                        </View>
                    ) : adjustments.length === 0 ? (
                        <View style={s.emptyW}>
                            <View style={[s.emptyIcon, { backgroundColor: 'rgba(245,158,11,0.1)' }]}>
                                <SlidersHorizontal size={36} color={ACCENT} strokeWidth={1.5} />
                            </View>
                            <Text style={[s.emptyTitle, { color: colors.textPrimary }]}>Chưa có điều chỉnh</Text>
                            <Text style={[s.emptyT, { color: colors.textMuted }]}>Nhấn nút + để tạo phiếu điều chỉnh kho</Text>
                        </View>
                    ) : (
                        <View style={s.gap}>
                            {adjustments.map((a, i) => (
                                <Animated.View key={a.id} entering={FadeInUp.duration(300).delay(i * 40).springify().damping(18)}>
                                    <Pressable onPress={() => openView(a)} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
                                        <View style={[s.card, { borderColor: colors.cardBorder }]}>
                                            <BlurView intensity={18} tint={colors.blurTint} style={StyleSheet.absoluteFill} />
                                            <View style={[s.cardInner, { backgroundColor: colors.cardBg }]}>
                                                {/* Top Row */}
                                                <View style={s.cardTop}>
                                                    <View style={s.idBadge}>
                                                        <Text style={s.idText}>#{a.id.slice(0, 8).toUpperCase()}</Text>
                                                    </View>
                                                    <View style={[s.statusDot, { backgroundColor: ACCENT }]} />
                                                    <Text style={[s.statusText, { color: ACCENT }]}>Điều chỉnh</Text>
                                                </View>

                                                {/* Warehouse */}
                                                <View style={s.infoRow}>
                                                    <Warehouse size={13} color={colors.textMuted} />
                                                    <Text style={[s.infoText, { color: colors.textMuted }]}>
                                                        {a.Warehouse?.name || 'Chưa xác định'}
                                                    </Text>
                                                </View>

                                                {/* Product info */}
                                                {a.Product && (
                                                    <Text style={[s.productText, { color: colors.textMuted }]} numberOfLines={1}>
                                                        📦 {a.Product?.name || ''}
                                                    </Text>
                                                )}

                                                {/* Bottom: Date + Qty */}
                                                <View style={s.cardBottom}>
                                                    <View style={s.infoRow}>
                                                        <Calendar size={13} color={colors.textMuted} />
                                                        <Text style={[s.infoText, { color: colors.textMuted }]}>
                                                            {fmtDate(a.createdAt)}
                                                        </Text>
                                                    </View>
                                                    <View style={[s.qtyChip, {
                                                        backgroundColor: (a.quantity || 0) >= 0
                                                            ? 'rgba(16,185,129,0.15)'
                                                            : 'rgba(239,68,68,0.15)',
                                                    }]}>
                                                        <Text style={[s.qtyText, {
                                                            color: (a.quantity || 0) >= 0 ? '#10B981' : '#EF4444',
                                                        }]}>
                                                            {(a.quantity || 0) > 0 ? '+' : ''}{a.quantity ?? '—'}
                                                        </Text>
                                                    </View>
                                                </View>

                                                {/* Note */}
                                                {a.note ? (
                                                    <Text style={[s.note, { color: colors.textMuted }]} numberOfLines={1}>
                                                        📝 {a.note}
                                                    </Text>
                                                ) : null}
                                            </View>
                                        </View>
                                    </Pressable>
                                </Animated.View>
                            ))}
                        </View>
                    )}
                    <View style={{ height: 100 }} />
                </ScrollView>

                {/* FAB */}
                <Animated.View entering={FadeInUp.duration(400).delay(200)} style={s.fab}>
                    <Pressable onPress={openAdd} style={s.fabBtn}>
                        <LinearGradient colors={[ACCENT, ACCENT2]} style={s.fabGrad}>
                            <Plus size={22} color="#fff" strokeWidth={2.5} />
                        </LinearGradient>
                    </Pressable>
                </Animated.View>
            </SafeAreaView>

            <AdjustmentModal
                visible={showModal}
                mode={modalMode}
                adjustment={selectedAdjustment}
                onClose={handleModalClose}
                onSuccess={handleModalSuccess}
            />

            {DialogComponent}
        </View>
    );
}

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
    summaryRow: { flexDirection: 'row', gap: Spacing.md, paddingHorizontal: Spacing.xl, marginBottom: Spacing.sm },
    summaryCard: { flex: 1, borderRadius: 14, borderWidth: 1, paddingVertical: 12, alignItems: 'center' },
    summaryVal: { fontSize: 22, fontWeight: FontWeights.bold },
    summaryLbl: { fontSize: 11, marginTop: 2 },
    list: { paddingHorizontal: Spacing.xl },
    emptyW: { alignItems: 'center', paddingVertical: 70, gap: Spacing.sm },
    emptyIcon: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
    emptyTitle: { fontSize: FontSizes.base, fontWeight: FontWeights.semibold },
    emptyT: { fontSize: FontSizes.sm, textAlign: 'center' },
    gap: { gap: Spacing.md },
    card: { borderRadius: 16, overflow: 'hidden', borderWidth: 1 },
    cardInner: { padding: Spacing.md, gap: 8 },
    cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    idBadge: { backgroundColor: 'rgba(245,158,11,0.15)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    idText: { fontSize: 11, fontWeight: FontWeights.bold, color: ACCENT, letterSpacing: 0.5 },
    statusDot: { width: 6, height: 6, borderRadius: 3, marginLeft: 'auto' },
    statusText: { fontSize: 11, fontWeight: FontWeights.semibold },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    infoText: { fontSize: FontSizes.xs },
    productText: { fontSize: FontSizes.xs },
    cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    qtyChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    qtyText: { fontSize: 12, fontWeight: FontWeights.bold },
    note: { fontSize: 11, fontStyle: 'italic' },
    fab: { position: 'absolute', bottom: 28, right: 24 },
    fabBtn: {
        borderRadius: 28, overflow: 'hidden', elevation: 6,
        shadowColor: ACCENT, shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4, shadowRadius: 8,
    },
    fabGrad: { width: 56, height: 56, justifyContent: 'center', alignItems: 'center' },
});
