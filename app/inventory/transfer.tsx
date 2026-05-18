// Inventory Transfer Screen — Glassmorphism
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, RefreshControl } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import { ArrowLeftRight, ChevronLeft, RefreshCw, Calendar, Warehouse as WarehouseIcon, Plus, MoveRight } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';

import { inventoryApi, TransferVoucher, Warehouse as WarehouseT } from '@/lib/inventory-api';
import { Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants/Tokens';
import { useThemeStore } from '@/store';
import { ThemeColors } from '@/constants/ThemeColors';
import { useDarkDialog } from '@/components/ui/DarkDialog';
import TransferModal from '@/components/TransferModal';

const ACCENT = '#A855F7';
const ACCENT2 = '#C084FC';

type ModalMode = 'add' | 'view' | 'edit';

const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString('vi-VN') : '—');

export default function TransferScreen() {
    const router = useRouter();
    const [transfers, setTransfers] = useState<TransferVoucher[]>([]);
    const [warehousesById, setWarehousesById] = useState<Record<string, WarehouseT>>({});
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState<ModalMode>('add');
    const [selectedTransfer, setSelectedTransfer] = useState<TransferVoucher | null>(null);

    const { isDark } = useThemeStore();
    const colors = ThemeColors.light;
    const { showDialog, DialogComponent } = useDarkDialog();

    useEffect(() => { load(); }, []);

    const load = async () => {
        try {
            setLoading(true);
            const [vouchers, warehouses] = await Promise.all([
                inventoryApi.getTransferVouchers().catch(() => []),
                inventoryApi.getWarehouses().catch(() => []),
            ]);
            setTransfers(Array.isArray(vouchers) ? vouchers : []);
            const map: Record<string, WarehouseT> = {};
            (Array.isArray(warehouses) ? warehouses : []).forEach((w) => { map[w.id] = w; });
            setWarehousesById(map);
        } catch (e: any) {
            showDialog('Lỗi', e.response?.data?.message || 'Không thể tải phiếu chuyển kho');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const openAdd = () => {
        setSelectedTransfer(null);
        setModalMode('add');
        setShowModal(true);
    };

    const openView = (t: TransferVoucher) => {
        setSelectedTransfer(t);
        setModalMode('view');
        setShowModal(true);
    };

    const openEdit = (t: TransferVoucher) => {
        setSelectedTransfer(t);
        setModalMode('edit');
        setShowModal(true);
    };

    const handleModalClose = () => {
        setShowModal(false);
    };

    const handleModalSuccess = () => {
        // If we were in view mode and user clicked "Tạo phiếu tương tự"
        if (modalMode === 'view' && selectedTransfer) {
            // Re-open as edit mode
            setTimeout(() => openEdit(selectedTransfer), 100);
            return;
        }
        setShowModal(false);
        load();
    };

    const totalQty = transfers.reduce((sum, t) => sum + t.items.reduce((s2, it) => s2 + (it.quantity || 0), 0), 0);

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
                            <ArrowLeftRight size={20} color="#fff" strokeWidth={2} />
                        </LinearGradient>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[s.title, { color: colors.textPrimary }]}>Chuyển kho</Text>
                        <Text style={[s.sub, { color: colors.textMuted }]}>{transfers.length} phiếu chuyển</Text>
                    </View>
                    <Pressable style={[s.iconBtn, { backgroundColor: colors.inputBg }]} onPress={() => { setRefreshing(true); load(); }}>
                        <RefreshCw size={15} color={colors.textSecondary} />
                    </Pressable>
                </Animated.View>

                {/* Summary Cards */}
                <Animated.View entering={FadeInDown.duration(400).delay(60)} style={s.summaryRow}>
                    <View style={[s.summaryCard, { backgroundColor: 'rgba(168,85,247,0.12)', borderColor: 'rgba(168,85,247,0.25)' }]}>
                        <Text style={[s.summaryVal, { color: ACCENT }]}>{transfers.length}</Text>
                        <Text style={[s.summaryLbl, { color: colors.textMuted }]}>Tổng phiếu</Text>
                    </View>
                    <View style={[s.summaryCard, { backgroundColor: 'rgba(192,132,252,0.12)', borderColor: 'rgba(192,132,252,0.25)' }]}>
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
                    ) : transfers.length === 0 ? (
                        <View style={s.emptyW}>
                            <View style={[s.emptyIcon, { backgroundColor: 'rgba(168,85,247,0.1)' }]}>
                                <ArrowLeftRight size={36} color={ACCENT} strokeWidth={1.5} />
                            </View>
                            <Text style={[s.emptyTitle, { color: colors.textPrimary }]}>Chưa có phiếu chuyển</Text>
                            <Text style={[s.emptyT, { color: colors.textMuted }]}>Nhấn nút + để tạo phiếu chuyển kho</Text>
                        </View>
                    ) : (
                        <View style={s.gap}>
                            {transfers.map((t, i) => (
                                <Animated.View key={t.referenceId} entering={FadeInUp.duration(300).delay(i * 40).springify().damping(18)}>
                                    <Pressable onPress={() => openView(t)} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
                                        <View style={[s.card, { borderColor: colors.cardBorder }]}>
                                            <BlurView intensity={18} tint={colors.blurTint} style={StyleSheet.absoluteFill} />
                                            <View style={[s.cardInner, { backgroundColor: colors.cardBg }]}>
                                                {/* Top Row: ID + Badge */}
                                                <View style={s.cardTop}>
                                                    <View style={s.idBadge}>
                                                        <Text style={s.idText}>#{t.referenceId.replace('TRF-', '').slice(0, 8).toUpperCase()}</Text>
                                                    </View>
                                                    <View style={[s.statusDot, { backgroundColor: ACCENT }]} />
                                                    <Text style={[s.statusText, { color: ACCENT }]}>Chuyển kho</Text>
                                                </View>

                                                {/* Warehouse row: From → To */}
                                                <View style={s.warehouseRow}>
                                                    <WarehouseIcon size={13} color={colors.textMuted} />
                                                    <Text style={[s.warehouseText, { color: colors.textSecondary }]} numberOfLines={1}>
                                                        {warehousesById[t.fromWarehouseId]?.name || 'Chưa xác định'}
                                                    </Text>
                                                    <MoveRight size={13} color={ACCENT} />
                                                    <Text style={[s.warehouseText, { color: colors.textSecondary }]} numberOfLines={1}>
                                                        {warehousesById[t.toWarehouseId]?.name || '—'}
                                                    </Text>
                                                </View>

                                                {/* Product summary */}
                                                {t.items.length > 0 && (
                                                    <Text style={[s.productText, { color: colors.textMuted }]} numberOfLines={2}>
                                                        📦 {t.items[0].Product?.name || ''} — {t.items[0].Product?.name || t.items[0].productId}
                                                        {t.items.length > 1 ? `  (+${t.items.length - 1} sản phẩm)` : ''}
                                                    </Text>
                                                )}

                                                {/* Bottom: Date + Qty */}
                                                <View style={s.cardBottom}>
                                                    <View style={s.infoRow}>
                                                        <Calendar size={13} color={colors.textMuted} />
                                                        <Text style={[s.infoText, { color: colors.textMuted }]}>{fmtDate(t.createdAt)}</Text>
                                                    </View>
                                                    <View style={[s.qtyChip, { backgroundColor: 'rgba(168,85,247,0.15)' }]}>
                                                        <Text style={s.qtyText}>SL: {t.items.reduce((s2, it) => s2 + (it.quantity || 0), 0)}</Text>
                                                    </View>
                                                </View>

                                                {/* Note */}
                                                {t.note ? (
                                                    <Text style={[s.note, { color: colors.textMuted }]} numberOfLines={1}>📝 {t.note}</Text>
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

            <TransferModal
                visible={showModal}
                mode={modalMode}
                transfer={selectedTransfer}
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
    idBadge: { backgroundColor: 'rgba(168,85,247,0.15)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    idText: { fontSize: 11, fontWeight: FontWeights.bold, color: ACCENT, letterSpacing: 0.5 },
    statusDot: { width: 6, height: 6, borderRadius: 3, marginLeft: 'auto' },
    statusText: { fontSize: 11, fontWeight: FontWeights.semibold },
    warehouseRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'nowrap' },
    warehouseText: { fontSize: FontSizes.xs, flexShrink: 1 },
    productText: { fontSize: FontSizes.xs },
    cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    infoText: { fontSize: FontSizes.xs },
    qtyChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    qtyText: { fontSize: 12, fontWeight: FontWeights.bold, color: ACCENT },
    note: { fontSize: 11, fontStyle: 'italic' },
    fab: { position: 'absolute', bottom: 28, right: 24 },
    fabBtn: { borderRadius: 28, overflow: 'hidden', elevation: 6, shadowColor: ACCENT, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8 },
    fabGrad: { width: 56, height: 56, justifyContent: 'center', alignItems: 'center' },
});
