// AdjustmentModal — Add / View / Edit modes with dark/light theme
import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, Modal, Pressable,
    TextInput, ScrollView, ActivityIndicator,
    FlatList,
} from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import {
    X, SlidersHorizontal, Warehouse as WarehouseIcon,
    Package, StickyNote, Save, Eye, Copy, Calendar,
} from 'lucide-react-native';

import { inventoryApi, Product, Stock, Warehouse, StockMovement } from '@/lib/inventory-api';
import { useThemeStore } from '@/store';
import { ThemeColors } from '@/constants/ThemeColors';
import { Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants/Tokens';
import { useDarkDialog } from '@/components/ui/DarkDialog';

const ACCENT = '#F59E0B';
const ACCENT2 = '#FBBF24';

type ModalMode = 'add' | 'view' | 'edit';

interface AdjustmentModalProps {
    visible: boolean;
    mode: ModalMode;
    adjustment?: StockMovement | null;
    onClose: () => void;
    onSuccess: () => void;
}

const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString('vi-VN') : '—');

export default function AdjustmentModal({
    visible, mode, adjustment, onClose, onSuccess,
}: AdjustmentModalProps) {
    const { isDark } = useThemeStore();
    const colors = ThemeColors.light;
    const { showDialog, DialogComponent } = useDarkDialog();

    const modalBg = 'rgba(245,247,255,0.98)';
    const inputBg = 'rgba(99,102,241,0.06)';
    const inputBorder = 'rgba(99,102,241,0.15)';
    // (Picker removed) keep colors for select UI
    const _pickerItemStyle = { backgroundColor: '#FFFFFF', color: '#1E1B4B' };

    // Single-select modal states (replace Android Picker dropdown which is easily clipped inside Modal/ScrollView)
    const [showWarehouseSelect, setShowWarehouseSelect] = useState(false);
    const [showProductSelect, setShowProductSelect] = useState(false);
    const [warehouseQuery, setWarehouseQuery] = useState('');
    const [productQuery, setProductQuery] = useState('');

    const isView = mode === 'view';
    const isEdit = mode === 'edit';

    const [warehouseId, setWarehouseId] = useState('');
    const [productId, setProductId] = useState('');
    const [quantity, setQuantity] = useState('');
    const [note, setNote] = useState('');
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [warehouseMap, setWarehouseMap] = useState<Record<string, Warehouse>>({});
    const [products, setProducts] = useState<Product[]>([]);
    const [productsMap, setProductsMap] = useState<Record<string, Product>>({});
    const [loading, setLoading] = useState(false);
    const [loadingStock, setLoadingStock] = useState(false);
    const [stock, setStock] = useState<Stock[]>([]);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (visible) {
            resetForm();
            loadData();
        }
    }, [visible]);

    // When warehouse changes (or is pre-filled in edit/view), load stock to filter products/specs
    useEffect(() => {
        if (!visible) return;
        if (!warehouseId) {
            setStock([]);
            return;
        }
        loadStockForWarehouse(warehouseId);
    }, [visible, warehouseId]);



    const resetForm = () => {
        if (adjustment && (mode === 'view' || mode === 'edit')) {
            setWarehouseId(adjustment.warehouseId);
            setProductId(adjustment.productId);
            setQuantity(String(adjustment.quantity));
            setNote(adjustment.note || '');
        } else {
            setWarehouseId('');
            setProductId('');
            setQuantity('');
            setNote('');
        }
    };

    const loadData = async () => {
        setLoading(true);
        try {
            const [wh, prodArrList] = await Promise.all([
                inventoryApi.getWarehouses(),
                inventoryApi.getProducts(),
            ]);

            const whArr = Array.isArray(wh) ? wh : [];
            const prodArr = Array.isArray(prodArrList) ? prodArrList : [];

            setWarehouses(whArr);
            setProducts(prodArr);

            const wMap: Record<string, Warehouse> = {};
            whArr.forEach((w) => { wMap[w.id] = w; });
            setWarehouseMap(wMap);

            const pMap: Record<string, Product> = {};
            prodArr.forEach((p) => { pMap[p.id] = p; });
            setProductsMap(pMap);

            if (whArr.length === 0) {
                showDialog('Thông báo', 'Chưa có kho hoặc không tải được danh sách kho. Vui lòng kiểm tra kết nối/quyền truy cập.');
            }
        } catch (error: any) {
            const msg = error?.response?.data?.message || error?.message || 'Không thể tải danh sách kho/sản phẩm';
            showDialog('Lỗi', Array.isArray(msg) ? msg.join(', ') : String(msg));
            setWarehouses([]);
            setWarehouseMap({});
            setProducts([]);
            setProductsMap({});
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        if (!submitting) onClose();
    };

    const handleSubmit = async () => {
        if (!warehouseId) { showDialog('Lỗi', 'Vui lòng chọn kho'); return; }
        if (!productId) { showDialog('Lỗi', 'Vui lòng chọn sản phẩm'); return; }
        const adjustmentNum = parseInt(quantity);
        if (!quantity || isNaN(adjustmentNum) || adjustmentNum === 0) {
            showDialog('Lỗi', 'Vui lòng nhập số điều chỉnh (khác 0)');
            return;
        }

        try {
            setSubmitting(true);
            await inventoryApi.adjustStock(warehouseId, productId, adjustmentNum, note || undefined);
            const msg = isEdit
                ? `Đã tạo điều chỉnh mới: ${adjustmentNum > 0 ? '+' : ''}${adjustmentNum}`
                : `Đã ${adjustmentNum > 0 ? 'tăng' : 'giảm'} ${Math.abs(adjustmentNum)} sản phẩm`;
            showDialog('Thành công', msg);
            handleClose();
            onSuccess();
        } catch (error: any) {
            const msg = error.response?.data?.message || error.message || 'Không thể điều chỉnh tồn kho';
            showDialog('Lỗi', Array.isArray(msg) ? msg.join(', ') : msg);
        } finally {
            setSubmitting(false);
        }
    };



    const getProductName = (id: string) => {
        return productsMap[id]?.name || stock.find((s) => s.productId === id)?.Product?.name || id;
    };

    const loadStockForWarehouse = async (wid: string) => {
        if (!wid) { setStock([]); return; }
        try {
            setLoadingStock(true);
            const res = await inventoryApi.getStock({ warehouseId: wid });
            setStock(Array.isArray(res) ? res : []);
        } catch (error: any) {
            const msg = error?.response?.data?.message || error?.message || 'Không thể tải tồn kho';
            showDialog('Lỗi', Array.isArray(msg) ? msg.join(', ') : String(msg));
            setStock([]);
        } finally {
            setLoadingStock(false);
        }
    };

    const stockForWarehouse = stock.filter((s) => Number(s.quantity) > 0);

    const availableProductIds = Array.from(
        new Set(
            stockForWarehouse.map((s) => s.productId).filter(Boolean)
        )
    );

    const availableProducts = availableProductIds
        .map((id) => ({ id, name: getProductName(id) }))
        .sort((a, b) => a.name.localeCompare(b.name));

    const selectedStockQty = productId
        ? (stock.find((s) => s.productId === productId)?.quantity ?? null)
        : null;

    const getWarehouseName = (id: string) => warehouseMap[id]?.name || adjustment?.Warehouse?.name || id;

    const headerTitle = isView
        ? 'Chi tiết điều chỉnh'
        : isEdit
            ? 'Tạo điều chỉnh tương tự'
            : 'Điều chỉnh tồn kho';

    const headerIcon = isView
        ? <Eye size={24} color={ACCENT} />
        : <SlidersHorizontal size={24} color={ACCENT} />;

    return (
        <>
            <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose} statusBarTranslucent>
                <View style={s.overlay}>
                    <BlurView intensity={40} tint="light" style={StyleSheet.absoluteFill} />
                    <Animated.View
                        entering={FadeIn.duration(250)}
                        exiting={FadeOut.duration(200)}
                        style={[s.container, { backgroundColor: modalBg, borderColor: colors.cardBorder }]}
                    >
                        {/* Header */}
                        <View style={[s.header, { borderBottomColor: 'rgba(0,0,0,0.06)' }]}>
                            {headerIcon}
                            <Text style={[s.headerTitle, { color: colors.textPrimary }]}>{headerTitle}</Text>
                            <Pressable
                                style={[s.closeBtn, { backgroundColor: 'rgba(0,0,0,0.05)' }]}
                                onPress={handleClose}
                                disabled={submitting}
                            >
                                <X size={22} color={colors.textSecondary} />
                            </Pressable>
                        </View>

                        {loading ? (
                            <View style={s.loadingWrap}>
                                <ActivityIndicator size="large" color={ACCENT} />
                            </View>
                        ) : isView ? (
                            /* ====== VIEW MODE ====== */
                            <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
                                {/* ID */}
                                {adjustment?.id && (
                                    <View style={s.field}>
                                        <View style={s.labelRow}>
                                            <SlidersHorizontal size={14} color={colors.textMuted} />
                                            <Text style={[s.label, { color: colors.textSecondary }]}>Mã phiếu</Text>
                                        </View>
                                        <View style={[s.readOnlyBox, { backgroundColor: inputBg, borderColor: inputBorder }]}>
                                            <Text style={[s.readOnlyText, { color: ACCENT }]}>
                                                #{adjustment.id.slice(0, 12).toUpperCase()}
                                            </Text>
                                        </View>
                                    </View>
                                )}

                                {/* Created at */}
                                {adjustment?.createdAt && (
                                    <View style={s.field}>
                                        <View style={s.labelRow}>
                                            <Calendar size={14} color={colors.textMuted} />
                                            <Text style={[s.label, { color: colors.textSecondary }]}>Ngày tạo</Text>
                                        </View>
                                        <View style={[s.readOnlyBox, { backgroundColor: inputBg, borderColor: inputBorder }]}>
                                            <Text style={[s.readOnlyText, { color: colors.textPrimary }]}>
                                                {fmtDate(adjustment.createdAt)}
                                            </Text>
                                        </View>
                                    </View>
                                )}

                                {/* Warehouse */}
                                <View style={s.field}>
                                    <View style={s.labelRow}>
                                        <WarehouseIcon size={14} color={colors.textMuted} />
                                        <Text style={[s.label, { color: colors.textSecondary }]}>Kho</Text>
                                    </View>
                                    <View style={[s.readOnlyBox, { backgroundColor: inputBg, borderColor: inputBorder }]}>
                                        <Text style={[s.readOnlyText, { color: colors.textPrimary }]}>
                                            {getWarehouseName(warehouseId)}
                                        </Text>
                                    </View>
                                </View>

                                {/* Product */}
                                <View style={s.field}>
                                    <View style={s.labelRow}>
                                        <Package size={14} color={colors.textMuted} />
                                        <Text style={[s.label, { color: colors.textSecondary }]}>Sản phẩm</Text>
                                    </View>
                                    <View style={[s.readOnlyBox, { backgroundColor: inputBg, borderColor: inputBorder }]}>
                                        <Text style={[s.readOnlyText, { color: colors.textPrimary }]}>
                                            {adjustment?.Product?.name || getProductName(productId)}
                                        </Text>
                                    </View>
                                </View>

                                {/* Quantity */}
                                <View style={s.field}>
                                    <View style={s.labelRow}>
                                        <SlidersHorizontal size={14} color={colors.textMuted} />
                                        <Text style={[s.label, { color: colors.textSecondary }]}>Số lượng điều chỉnh</Text>
                                    </View>
                                    <View style={[s.viewQtyCard, {
                                        backgroundColor: Number(quantity) >= 0 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                                        borderColor: Number(quantity) >= 0
                                            ? 'rgba(16,185,129,0.3)'
                                            : 'rgba(239,68,68,0.3)',
                                    }]}>
                                        <Text style={[s.viewQtyText, {
                                            color: Number(quantity) >= 0 ? '#10B981' : '#EF4444',
                                        }]}>
                                            {Number(quantity) > 0 ? '+' : ''}{quantity}
                                        </Text>
                                    </View>
                                </View>

                                {/* Note */}
                                {note ? (
                                    <View style={s.field}>
                                        <View style={s.labelRow}>
                                            <StickyNote size={14} color={colors.textMuted} />
                                            <Text style={[s.label, { color: colors.textSecondary }]}>Ghi chú</Text>
                                        </View>
                                        <View style={[s.readOnlyBox, { backgroundColor: inputBg, borderColor: inputBorder }]}>
                                            <Text style={[s.readOnlyText, { color: colors.textPrimary }]}>
                                                {note}
                                            </Text>
                                        </View>
                                    </View>
                                ) : null}

                                <View style={{ height: 40 }} />
                            </ScrollView>
                        ) : (
                            /* ====== ADD / EDIT MODE ====== */
                            <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                                {/* Warehouse single select */}
                                <View style={s.field}>
                                    <View style={s.labelRow}>
                                        <WarehouseIcon size={14} color={colors.textMuted} />
                                        <Text style={[s.label, { color: colors.textSecondary }]}>Kho *</Text>
                                    </View>
                                    <Pressable
                                        onPress={() => {
                                            if (submitting) return;
                                            setShowWarehouseSelect(true);
                                        }}
                                        style={({ pressed }) => [
                                            s.selectField,
                                            { backgroundColor: inputBg, borderColor: inputBorder, opacity: pressed ? 0.85 : 1 },
                                            submitting && { opacity: 0.6 },
                                        ]}
                                    >
                                        <Text style={[s.selectValue, { color: warehouseId ? colors.textPrimary : colors.textMuted }]} numberOfLines={1}>
                                            {warehouseId ? getWarehouseName(warehouseId) : '-- Chọn kho --'}
                                        </Text>
                                        <Text style={[s.selectChevron, { color: colors.textMuted }]}>▾</Text>
                                    </Pressable>
                                </View>

                                {/* Product single select (filtered by stock of selected warehouse) */}
                                <View style={s.field}>
                                    <View style={s.labelRow}>
                                        <Package size={14} color={colors.textMuted} />
                                        <Text style={[s.label, { color: colors.textSecondary }]}>Sản phẩm *</Text>
                                    </View>
                                    <Pressable
                                        onPress={() => {
                                            if (submitting) return;
                                            if (!warehouseId) { showDialog('Lỗi', 'Vui lòng chọn kho trước'); return; }
                                            setShowProductSelect(true);
                                        }}
                                        style={({ pressed }) => [
                                            s.selectField,
                                            { backgroundColor: inputBg, borderColor: inputBorder, opacity: pressed ? 0.85 : 1 },
                                            submitting && { opacity: 0.6 },
                                        ]}
                                    >
                                        <Text style={[s.selectValue, { color: productId ? colors.textPrimary : colors.textMuted }]} numberOfLines={1}>
                                            {productId ? getProductName(productId) : (loadingStock ? 'Đang tải tồn kho...' : '-- Chọn sản phẩm --')}
                                        </Text>
                                        <Text style={[s.selectChevron, { color: colors.textMuted }]}>▾</Text>
                                    </Pressable>

                                    {productId ? (
                                        <View style={[s.stockInfo, { borderColor: inputBorder, backgroundColor: 'rgba(34,197,94,0.06)', marginTop: 10 }]}>
                                            <Text style={[s.stockInfoLabel, { color: colors.textMuted }]}>Tồn kho hiện tại</Text>
                                            <Text style={[s.stockInfoValue, { color: '#22C55E' }]}>
                                                {selectedStockQty === null ? (loadingStock ? 'Đang tải...' : '—') : String(selectedStockQty)}
                                            </Text>
                                        </View>
                                    ) : null}
                                </View>



                                {/* Quantity */}
                                <View style={s.field}>
                                    <View style={s.labelRow}>
                                        <SlidersHorizontal size={14} color={colors.textMuted} />
                                        <Text style={[s.label, { color: colors.textSecondary }]}>Số lượng điều chỉnh *</Text>
                                    </View>
                                    <Text style={[s.hint, { color: colors.textMuted }]}>
                                        Số dương (+) để tăng, số âm (-) để giảm tồn kho
                                    </Text>
                                    <View style={[s.inputWrap, { backgroundColor: inputBg, borderColor: inputBorder }]}>
                                        <TextInput
                                            style={[s.input, { color: colors.textPrimary }]}
                                            value={quantity}
                                            onChangeText={setQuantity}
                                            keyboardType="numeric"
                                            placeholder="VD: +10 hoặc -5"
                                            placeholderTextColor={colors.textMuted}
                                            editable={!submitting}
                                        />
                                    </View>
                                </View>

                                {/* Note */}
                                <View style={s.field}>
                                    <View style={s.labelRow}>
                                        <StickyNote size={14} color={colors.textMuted} />
                                        <Text style={[s.label, { color: colors.textSecondary }]}>Lý do điều chỉnh</Text>
                                    </View>
                                    <View style={[s.inputWrap, { backgroundColor: inputBg, borderColor: inputBorder }]}>
                                        <TextInput
                                            style={[s.input, s.textArea, { color: colors.textPrimary }]}
                                            value={note}
                                            onChangeText={setNote}
                                            placeholder="VD: Hàng hỏng, kiểm kê phát hiện..."
                                            placeholderTextColor={colors.textMuted}
                                            multiline
                                            numberOfLines={3}
                                            editable={!submitting}
                                        />
                                    </View>
                                </View>
                                <View style={{ height: 40 }} />
                            </ScrollView>
                        )}

                        {/* Warehouse select modal */}
                        <Modal
                            visible={showWarehouseSelect}
                            animationType="fade"
                            transparent
                            onRequestClose={() => setShowWarehouseSelect(false)}
                        >
                            <Pressable style={s.selectOverlay} onPress={() => setShowWarehouseSelect(false)}>
                                <Pressable style={[s.selectSheet, { backgroundColor: modalBg, borderColor: colors.cardBorder }]} onPress={() => { }}>
                                    <Text style={[s.selectTitle, { color: colors.textPrimary }]}>Chọn kho</Text>
                                    <View style={[s.searchWrap, { backgroundColor: inputBg, borderColor: inputBorder }]}>
                                        <TextInput
                                            value={warehouseQuery}
                                            onChangeText={setWarehouseQuery}
                                            placeholder="Tìm kho..."
                                            placeholderTextColor={colors.textMuted}
                                            style={[s.searchInput, { color: colors.textPrimary }]}
                                            autoFocus
                                        />
                                    </View>
                                    <FlatList
                                        data={warehouses.filter((w) => w.name.toLowerCase().includes(warehouseQuery.trim().toLowerCase()))}
                                        keyExtractor={(item) => item.id}
                                        keyboardShouldPersistTaps="handled"
                                        style={{ maxHeight: 360 }}
                                        renderItem={({ item }) => (
                                            <Pressable
                                                onPress={() => {
                                                    setWarehouseId(item.id);
                                                    // reset dependent selections
                                                    setProductId('');
                                                    setShowWarehouseSelect(false);
                                                    setWarehouseQuery('');
                                                    // refresh stock for filtering
                                                    loadStockForWarehouse(item.id);
                                                }}
                                                style={({ pressed }) => [
                                                    s.selectItem,
                                                    { borderBottomColor: inputBorder, opacity: pressed ? 0.7 : 1 },
                                                ]}
                                            >
                                                <Text style={[s.selectItemText, { color: colors.textPrimary }]}>{item.name}</Text>
                                            </Pressable>
                                        )}
                                        ListEmptyComponent={
                                            <View style={s.emptySelect}>
                                                <Text style={[s.emptySelectText, { color: colors.textMuted }]}>Không có dữ liệu</Text>
                                            </View>
                                        }
                                    />
                                </Pressable>
                            </Pressable>
                        </Modal>

                        {/* Product select modal (filtered by stock of selected warehouse) */}
                        <Modal
                            visible={showProductSelect}
                            animationType="fade"
                            transparent
                            onRequestClose={() => setShowProductSelect(false)}
                        >
                            <Pressable style={s.selectOverlay} onPress={() => setShowProductSelect(false)}>
                                <Pressable style={[s.selectSheet, { backgroundColor: modalBg, borderColor: colors.cardBorder }]} onPress={() => { }}>
                                    <Text style={[s.selectTitle, { color: colors.textPrimary }]}>Chọn sản phẩm</Text>
                                    <View style={[s.searchWrap, { backgroundColor: inputBg, borderColor: inputBorder }]}>
                                        <TextInput
                                            value={productQuery}
                                            onChangeText={setProductQuery}
                                            placeholder="Tìm sản phẩm..."
                                            placeholderTextColor={colors.textMuted}
                                            style={[s.searchInput, { color: colors.textPrimary }]}
                                            autoFocus
                                        />
                                    </View>
                                    <FlatList
                                        data={availableProducts.filter((p) => {
                                            const q = productQuery.trim().toLowerCase();
                                            if (!q) return true;
                                            return p.name.toLowerCase().includes(q);
                                        })}
                                        keyExtractor={(item) => item.id}
                                        keyboardShouldPersistTaps="handled"
                                        style={{ maxHeight: 360 }}
                                        renderItem={({ item }) => (
                                            <Pressable
                                                onPress={() => {
                                                    setProductId(item.id);
                                                    setShowProductSelect(false);
                                                    setProductQuery('');
                                                }}
                                                style={({ pressed }) => [
                                                    s.selectItem,
                                                    { borderBottomColor: inputBorder, opacity: pressed ? 0.7 : 1 },
                                                ]}
                                            >
                                                <Text style={[s.selectItemText, { color: colors.textPrimary }]}>{item.name}</Text>
                                            </Pressable>
                                        )}
                                        ListEmptyComponent={
                                            <View style={s.emptySelect}>
                                                <Text style={[s.emptySelectText, { color: colors.textMuted }]}>Không có dữ liệu</Text>
                                            </View>
                                        }
                                    />
                                </Pressable>
                            </Pressable>
                        </Modal>



                        {/* Footer */}
                        <View style={[s.footer, { borderTopColor: 'rgba(0,0,0,0.06)' }]}>
                            {isView ? (
                                <>
                                    <Pressable
                                        style={[s.saveBtn, { backgroundColor: ACCENT }]}
                                        onPress={() => {
                                            handleClose();
                                            if (adjustment) {
                                                setTimeout(() => onSuccess(), 50);
                                            }
                                        }}
                                    >
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                            <Copy size={18} color="#FFFFFF" />
                                            <Text style={s.saveBtnText}>Tạo điều chỉnh tương tự</Text>
                                        </View>
                                    </Pressable>
                                    <Pressable style={s.cancelBtn} onPress={handleClose}>
                                        <Text style={[s.cancelText, { color: colors.textMuted }]}>Đóng</Text>
                                    </Pressable>
                                </>
                            ) : (
                                <>
                                    <Pressable
                                        style={[s.saveBtn, { backgroundColor: ACCENT }, submitting && s.saveBtnDisabled]}
                                        onPress={handleSubmit}
                                        disabled={submitting || loading}
                                    >
                                        {submitting ? (
                                            <ActivityIndicator size="small" color="#FFFFFF" />
                                        ) : (
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                                <Save size={18} color="#FFFFFF" />
                                                <Text style={s.saveBtnText}>
                                                    {isEdit ? 'Tạo điều chỉnh mới' : 'Xác nhận điều chỉnh'}
                                                </Text>
                                            </View>
                                        )}
                                    </Pressable>
                                    <Pressable style={s.cancelBtn} onPress={handleClose} disabled={submitting}>
                                        <Text style={[s.cancelText, { color: colors.textMuted }]}>Hủy</Text>
                                    </Pressable>
                                </>
                            )}
                        </View>
                    </Animated.View>
                </View>
            </Modal>
            {DialogComponent}
        </>
    );
}

const s = StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'flex-end' },
    container: {
        height: '90%', borderTopLeftRadius: 28, borderTopRightRadius: 28,
        borderWidth: 1, overflow: 'hidden',
    },
    header: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
        paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg, borderBottomWidth: 1,
    },
    headerTitle: { flex: 1, fontSize: FontSizes.xl, fontWeight: FontWeights.bold },
    closeBtn: { padding: 8, borderRadius: 12 },
    loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scroll: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg },

    // Fields
    field: { marginBottom: Spacing.lg },
    labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.sm },
    label: { fontSize: FontSizes.sm, fontWeight: FontWeights.medium },
    hint: { fontSize: FontSizes.xs, marginBottom: Spacing.sm, fontStyle: 'italic' },
    inputWrap: {
        paddingHorizontal: Spacing.md, paddingVertical: 12,
        borderRadius: BorderRadius.lg, borderWidth: 1,
    },
    input: { fontSize: FontSizes.base },
    textArea: { height: 80, textAlignVertical: 'top' },
    pickerWrap: {
        borderRadius: BorderRadius.lg, borderWidth: 1,
        minHeight: 48, justifyContent: 'center', paddingHorizontal: 4,
    },
    picker: { flex: 1 },

    // Single select field
    selectField: {
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        minHeight: 48,
        paddingHorizontal: Spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    selectValue: { flex: 1, fontSize: FontSizes.base, fontWeight: FontWeights.medium },
    selectChevron: { marginLeft: 10, fontSize: 16, fontWeight: '700' },

    // Select modal
    selectOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.55)',
        justifyContent: 'center',
        padding: Spacing.xl,
    },
    selectSheet: {
        borderRadius: 18,
        borderWidth: 1,
        padding: Spacing.lg,
    },
    selectTitle: { fontSize: FontSizes.lg, fontWeight: FontWeights.bold, marginBottom: Spacing.md },
    searchWrap: {
        borderRadius: 14,
        borderWidth: 1,
        paddingHorizontal: Spacing.md,
        paddingVertical: 10,
        marginBottom: Spacing.md,
    },
    searchInput: { fontSize: FontSizes.base },
    selectItem: {
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    selectItemText: { fontSize: FontSizes.base, fontWeight: FontWeights.medium },
    emptySelect: { paddingVertical: 18, alignItems: 'center' },
    emptySelectText: { fontSize: FontSizes.sm },

    // View mode
    readOnlyBox: {
        paddingHorizontal: Spacing.md, paddingVertical: 14,
        borderRadius: BorderRadius.lg, borderWidth: 1,
    },
    readOnlyText: { fontSize: FontSizes.base, fontWeight: FontWeights.medium },
    viewQtyCard: {
        paddingHorizontal: Spacing.md, paddingVertical: 16,
        borderRadius: BorderRadius.lg, borderWidth: 1,
        alignItems: 'center',
    },
    viewQtyText: { fontSize: 28, fontWeight: FontWeights.bold },

    // Stock info
    stockInfo: {
        marginTop: Spacing.sm,
        borderWidth: 1,
        borderRadius: 14,
        paddingHorizontal: Spacing.md,
        paddingVertical: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    stockInfoLabel: { fontSize: FontSizes.xs, fontWeight: FontWeights.medium },
    stockInfoValue: { fontSize: FontSizes.lg, fontWeight: FontWeights.bold },

    // Footer
    footer: {
        paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg,
        gap: Spacing.md, borderTopWidth: 1,
    },
    saveBtn: {
        paddingVertical: 14, borderRadius: 16,
        alignItems: 'center', justifyContent: 'center',
    },
    saveBtnDisabled: { opacity: 0.5 },
    saveBtnText: { fontSize: FontSizes.base, fontWeight: FontWeights.semibold, color: '#FFFFFF' },
    cancelBtn: { padding: Spacing.md, alignItems: 'center' },
    cancelText: { fontSize: FontSizes.base, fontWeight: FontWeights.medium },
});
