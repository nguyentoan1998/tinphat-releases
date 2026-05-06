// TransferModal — Add / View / Edit modes with dark/light theme
import React, { useEffect, useRef, useState } from 'react';
import {
    View, Text, StyleSheet, Modal, Pressable,
    TextInput, ScrollView, ActivityIndicator,
    FlatList,
} from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import {
    X, Warehouse as WarehouseIcon, Package, StickyNote,
    ArrowLeftRight, Save, MoveRight, Eye, Copy, Calendar,
} from 'lucide-react-native';

import {
    inventoryApi, Product, Stock, Warehouse as WarehouseT, TransferVoucher,
} from '@/lib/inventory-api';
import { useThemeStore } from '@/store';
import { ThemeColors } from '@/constants/ThemeColors';
import { Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants/Tokens';
import { useDarkDialog } from '@/components/ui/DarkDialog';

const ACCENT = '#A855F7';
const ACCENT2 = '#C084FC';

type ModalMode = 'add' | 'view' | 'edit';

interface TransferModalProps {
    visible: boolean;
    mode: ModalMode;
    transfer?: TransferVoucher | null;
    onClose: () => void;
    onSuccess: () => void;
}

const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString('vi-VN') : '—');

export default function TransferModal({
    visible, mode, transfer, onClose, onSuccess,
}: TransferModalProps) {
    const { isDark } = useThemeStore();
    const colors = ThemeColors.light;
    const { showDialog, DialogComponent } = useDarkDialog();

    const modalBg = 'rgba(245,247,255,0.98)';
    const inputBg = 'rgba(99,102,241,0.06)';
    const inputBorder = 'rgba(99,102,241,0.15)';

    const isView = mode === 'view';
    const isEdit = mode === 'edit';

    const [fromWarehouseId, setFromWarehouseId] = useState('');
    const [toWarehouseId, setToWarehouseId] = useState('');
    // Each voucher transfers ONE product (single line)
    const [items, setItems] = useState<Array<{ productId: string; quantity: string }>>([
        { productId: '', quantity: '' },
    ]);
    const [note, setNote] = useState('');
    const [warehouses, setWarehouses] = useState<WarehouseT[]>([]);
    const [warehouseMap, setWarehouseMap] = useState<Record<string, WarehouseT>>({});
    const [products, setProducts] = useState<Product[]>([]);
    const [productsMap, setProductsMap] = useState<Record<string, Product>>({});
    const [loading, setLoading] = useState(false);
    const [loadingStock, setLoadingStock] = useState(false);
    const [stock, setStock] = useState<Stock[]>([]);
    const [submitting, setSubmitting] = useState(false);

    // Single-select modals
    const [showFromWhSelect, setShowFromWhSelect] = useState(false);
    const [showToWhSelect, setShowToWhSelect] = useState(false);
    const [showProductSelect, setShowProductSelect] = useState(false);
    const [fromWhQuery, setFromWhQuery] = useState('');
    const [toWhQuery, setToWhQuery] = useState('');
    const [productQuery, setProductQuery] = useState('');

    useEffect(() => {
        if (visible) {
            resetForm();
            loadData();
        }
    }, [visible]);

    const lastFromWhRef = useRef<string>('');

    // Load stock for filtering product/spec by from-warehouse
    useEffect(() => {
        if (!visible) return;

        if (!fromWarehouseId) {
            setStock([]);
            lastFromWhRef.current = '';
            return;
        }

        // Always refresh stock when from-warehouse changes
        loadStockForFromWarehouse(fromWarehouseId);

        // Reset the single line when changing from-warehouse in ADD mode
        const changed = !!lastFromWhRef.current && lastFromWhRef.current !== fromWarehouseId;
        if (mode === 'add' && changed) {
            setItems([{ productId: '', quantity: '' }]);
        }

        lastFromWhRef.current = fromWarehouseId;
    }, [visible, fromWarehouseId, mode]);

    const resetForm = () => {
        if (transfer && (mode === 'view' || mode === 'edit')) {
            setFromWarehouseId(transfer.fromWarehouseId);
            setToWarehouseId(transfer.toWarehouseId);
            // If existing voucher has multiple lines, take the first line for editing/duplicating
            const first = transfer.items?.[0];
            setItems([
                {
                    productId: first?.productId || '',
                    quantity: first?.quantity != null ? String(first.quantity) : '',
                },
            ]);
            setNote(transfer.note || '');
        } else {
            setFromWarehouseId('');
            setToWarehouseId('');
            setItems([{ productId: '', quantity: '' }]);
            setNote('');
        }
    };

    const loadData = async () => {
        setLoading(true);
        try {
            const [wh, prod] = await Promise.all([
                inventoryApi.getWarehouses(),
                inventoryApi.getProducts(),
            ]);
            const whArr = Array.isArray(wh) ? wh : [];
            const prodArr = Array.isArray(prod) ? prod : [];
            setWarehouses(whArr);
            setProducts(prodArr);

            if (whArr.length === 0) {
                showDialog('Thông báo', 'Chưa có kho hoặc không tải được danh sách kho. Vui lòng kiểm tra kết nối/quyền truy cập.');
            }

            const wMap: Record<string, WarehouseT> = {};
            whArr.forEach((w) => { wMap[w.id] = w; });
            setWarehouseMap(wMap);

            const pMap: Record<string, Product> = {};
            prodArr.forEach((p) => { pMap[p.id] = p; });
            setProductsMap(pMap);
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
        if (!fromWarehouseId) { showDialog('Lỗi', 'Vui lòng chọn kho nguồn'); return; }
        if (!toWarehouseId) { showDialog('Lỗi', 'Vui lòng chọn kho đích'); return; }
        if (fromWarehouseId === toWarehouseId) {
            showDialog('Lỗi', 'Kho nguồn và kho đích không được trùng nhau');
            return;
        }
        const normalizedItems = items
            .map((it) => ({
                productId: it.productId,
                quantity: parseInt(it.quantity),
            }))
            .filter((it) => it.productId && !Number.isNaN(it.quantity) && it.quantity > 0);

        if (normalizedItems.length === 0) {
            showDialog('Lỗi', 'Vui lòng thêm ít nhất 1 sản phẩm và số lượng > 0');
            return;
        }

        try {
            setSubmitting(true);
            await inventoryApi.createTransferVoucher({
                fromWarehouseId: fromWarehouseId,
                toWarehouseId: toWarehouseId,
                items: normalizedItems,
                note: note || undefined,
            });
            const msg = isEdit
                ? 'Đã tạo phiếu chuyển kho mới (1 sản phẩm)'
                : 'Đã tạo phiếu chuyển kho (1 sản phẩm)';
            showDialog('Thành công', msg);
            handleClose();
            onSuccess();
        } catch (error: any) {
            const msg = error.response?.data?.message || error.message || 'Không thể chuyển kho';
            showDialog('Lỗi', Array.isArray(msg) ? msg.join(', ') : msg);
        } finally {
            setSubmitting(false);
        }
    };

    const getWarehouseName = (id: string) => warehouseMap[id]?.name || id;

    const getProductName = (id: string) => {
        return productsMap[id]?.name || stock.find((s) => s.productId === id)?.Product?.name || id;
    };

    const loadStockForFromWarehouse = async (wid: string) => {
        if (!wid) { setStock([]); return; }
        try {
            setLoadingStock(true);
            const res = await inventoryApi.getStock({ warehouseId: wid });
            setStock(Array.isArray(res) ? res : []);
        } catch (error: any) {
            const msg = error?.response?.data?.message || error?.message || 'Không thể tải tồn kho kho nguồn';
            showDialog('Lỗi', Array.isArray(msg) ? msg.join(', ') : String(msg));
            setStock([]);
        } finally {
            setLoadingStock(false);
        }
    };

    const stockForFromWarehouse = stock.filter((s) => Number(s.quantity) > 0);

    const availableProductIds = Array.from(
        new Set(
            stockForFromWarehouse.map((s) => s.productId).filter(Boolean)
        )
    );

    const availableProducts = availableProductIds
        .map((id) => ({ id, name: getProductName(id) }))
        .sort((a, b) => a.name.localeCompare(b.name));

    const getStockQtyForProduct = (productId: string) => stock.find((s) => s.productId === productId)?.quantity ?? null;

    const headerTitle = isView
        ? 'Chi tiết phiếu chuyển'
        : isEdit
            ? 'Tạo phiếu tương tự'
            : 'Tạo phiếu chuyển kho';

    const headerIcon = isView ? <Eye size={24} color={ACCENT} /> : <ArrowLeftRight size={24} color={ACCENT} />;

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
                                {/* Reference ID */}
                                {transfer?.referenceId && (
                                    <View style={s.field}>
                                        <View style={s.labelRow}>
                                            <ArrowLeftRight size={14} color={colors.textMuted} />
                                            <Text style={[s.label, { color: colors.textSecondary }]}>Mã phiếu</Text>
                                        </View>
                                        <View style={[s.readOnlyBox, { backgroundColor: inputBg, borderColor: inputBorder }]}>
                                            <Text style={[s.readOnlyText, { color: ACCENT }]}>
                                                #{transfer.referenceId.replace('TRF-', '').slice(0, 12).toUpperCase()}
                                            </Text>
                                        </View>
                                    </View>
                                )}

                                {/* Created at */}
                                {transfer?.createdAt && (
                                    <View style={s.field}>
                                        <View style={s.labelRow}>
                                            <Calendar size={14} color={colors.textMuted} />
                                            <Text style={[s.label, { color: colors.textSecondary }]}>Ngày tạo</Text>
                                        </View>
                                        <View style={[s.readOnlyBox, { backgroundColor: inputBg, borderColor: inputBorder }]}>
                                            <Text style={[s.readOnlyText, { color: colors.textPrimary }]}>
                                                {fmtDate(transfer.createdAt)}
                                            </Text>
                                        </View>
                                    </View>
                                )}

                                {/* From warehouse */}
                                <View style={s.field}>
                                    <View style={s.labelRow}>
                                        <WarehouseIcon size={14} color={colors.textMuted} />
                                        <Text style={[s.label, { color: colors.textSecondary }]}>Kho nguồn</Text>
                                    </View>
                                    <View style={[s.readOnlyBox, { backgroundColor: inputBg, borderColor: inputBorder }]}>
                                        <Text style={[s.readOnlyText, { color: colors.textPrimary }]}>
                                            {getWarehouseName(fromWarehouseId)}
                                        </Text>
                                    </View>
                                </View>

                                {/* Arrow divider */}
                                <View style={s.arrowDivider}>
                                    <View style={[s.arrowLine, { backgroundColor: inputBorder }]} />
                                    <View style={[s.arrowCircle, { backgroundColor: 'rgba(168,85,247,0.1)', borderColor: inputBorder }]}>
                                        <MoveRight size={16} color={ACCENT} strokeWidth={2.5} />
                                    </View>
                                    <View style={[s.arrowLine, { backgroundColor: inputBorder }]} />
                                </View>

                                {/* To warehouse */}
                                <View style={s.field}>
                                    <View style={s.labelRow}>
                                        <WarehouseIcon size={14} color={colors.textMuted} />
                                        <Text style={[s.label, { color: colors.textSecondary }]}>Kho đích</Text>
                                    </View>
                                    <View style={[s.readOnlyBox, { backgroundColor: inputBg, borderColor: inputBorder }]}>
                                        <Text style={[s.readOnlyText, { color: colors.textPrimary }]}>
                                            {getWarehouseName(toWarehouseId)}
                                        </Text>
                                    </View>
                                </View>

                                {/* Item (single) */}
                                <View style={s.field}>
                                    <View style={s.labelRow}>
                                        <Package size={14} color={colors.textMuted} />
                                        <Text style={[s.label, { color: colors.textSecondary }]}>Sản phẩm</Text>
                                    </View>
                                    <View style={{ gap: 10 }}>
                                        <View style={[s.viewItemCard, { backgroundColor: inputBg, borderColor: inputBorder }]}
                                        >
                                            <Text style={[s.viewItemName, { color: colors.textPrimary }]} numberOfLines={2}>
                                                {items[0]?.productId ? getProductName(items[0].productId) : '—'}
                                            </Text>
                                            <View style={[s.viewQtyChip, { backgroundColor: 'rgba(168,85,247,0.12)' }]}>
                                                <Text style={s.viewQtyText}>SL: {items[0]?.quantity || '—'}</Text>
                                            </View>
                                        </View>
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
                                {/* From warehouse single select */}
                                <View style={s.field}>
                                    <View style={s.labelRow}>
                                        <WarehouseIcon size={14} color={colors.textMuted} />
                                        <Text style={[s.label, { color: colors.textSecondary }]}>Kho nguồn *</Text>
                                    </View>
                                    <Pressable
                                        onPress={() => !submitting && setShowFromWhSelect(true)}
                                        style={({ pressed }) => [
                                            s.selectField,
                                            { backgroundColor: inputBg, borderColor: inputBorder, opacity: pressed ? 0.85 : 1 },
                                            submitting && { opacity: 0.6 },
                                        ]}
                                    >
                                        <Text style={[s.selectValue, { color: fromWarehouseId ? colors.textPrimary : colors.textMuted }]} numberOfLines={1}>
                                            {fromWarehouseId ? getWarehouseName(fromWarehouseId) : '-- Chọn kho nguồn --'}
                                        </Text>
                                        <Text style={[s.selectChevron, { color: colors.textMuted }]}>▾</Text>
                                    </Pressable>
                                </View>

                                {/* Arrow divider */}
                                <View style={s.arrowDivider}>
                                    <View style={[s.arrowLine, { backgroundColor: inputBorder }]} />
                                    <View style={[s.arrowCircle, { backgroundColor: 'rgba(168,85,247,0.1)', borderColor: inputBorder }]}>
                                        <MoveRight size={16} color={ACCENT} strokeWidth={2.5} />
                                    </View>
                                    <View style={[s.arrowLine, { backgroundColor: inputBorder }]} />
                                </View>

                                {/* To warehouse single select */}
                                <View style={s.field}>
                                    <View style={s.labelRow}>
                                        <WarehouseIcon size={14} color={colors.textMuted} />
                                        <Text style={[s.label, { color: colors.textSecondary }]}>Kho đích *</Text>
                                    </View>
                                    <Pressable
                                        onPress={() => {
                                            if (submitting) return;
                                            if (!fromWarehouseId) { showDialog('Lỗi', 'Vui lòng chọn kho nguồn trước'); return; }
                                            setShowToWhSelect(true);
                                        }}
                                        style={({ pressed }) => [
                                            s.selectField,
                                            { backgroundColor: inputBg, borderColor: inputBorder, opacity: pressed ? 0.85 : 1 },
                                            submitting && { opacity: 0.6 },
                                        ]}
                                    >
                                        <Text style={[s.selectValue, { color: toWarehouseId ? colors.textPrimary : colors.textMuted }]} numberOfLines={1}>
                                            {toWarehouseId ? getWarehouseName(toWarehouseId) : '-- Chọn kho đích --'}
                                        </Text>
                                        <Text style={[s.selectChevron, { color: colors.textMuted }]}>▾</Text>
                                    </Pressable>
                                </View>

                                {/* Product items (group cards) */}
                                <View style={s.field}>
                                    <View style={s.labelRow}>
                                        <Package size={14} color={colors.textMuted} />
                                        <Text style={[s.label, { color: colors.textSecondary }]}>Sản phẩm *</Text>
                                    </View>

                                    {fromWarehouseId ? (
                                        <Text style={[s.helperText, { color: colors.textMuted }]}>Danh sách lấy theo tồn kho kho nguồn ({loadingStock ? 'đang tải...' : ' > 0'})</Text>
                                    ) : null}

                                    {(() => {
                                        const it = items[0];
                                        const stockQty = it?.productId ? getStockQtyForProduct(it.productId) : null;
                                        return (
                                            <View style={[s.itemCard, { backgroundColor: inputBg, borderColor: inputBorder, marginTop: 10 }]}>
                                                {/* Product select */}
                                                <View>
                                                    <Text style={[s.subLabel, { color: colors.textMuted }]}>Sản phẩm</Text>
                                                    <Pressable
                                                        onPress={() => {
                                                            if (submitting) return;
                                                            if (!fromWarehouseId) { showDialog('Lỗi', 'Vui lòng chọn kho nguồn trước'); return; }
                                                            setShowProductSelect(true);
                                                        }}
                                                        style={({ pressed }) => [
                                                            s.selectField,
                                                            { backgroundColor: 'rgba(255,255,255,0.35)', borderColor: inputBorder, opacity: pressed ? 0.85 : 1 },
                                                            submitting && { opacity: 0.6 },
                                                        ]}
                                                    >
                                                        <Text style={[s.selectValue, { color: it?.productId ? colors.textPrimary : colors.textMuted }]} numberOfLines={1}>
                                                            {it?.productId ? getProductName(it.productId) : '-- Chọn sản phẩm --'}
                                                        </Text>
                                                        <Text style={[s.selectChevron, { color: colors.textMuted }]}>▾</Text>
                                                    </Pressable>
                                                    
                                                    {it?.productId ? (
                                                        <View style={[s.stockInfo, { borderColor: inputBorder, backgroundColor: 'rgba(34,197,94,0.06)', marginTop: 10 }]}>
                                                            <Text style={[s.stockInfoLabel, { color: colors.textMuted }]}>Tồn kho hiện tại</Text>
                                                            <Text style={[s.stockInfoValue, { color: '#22C55E' }]}>
                                                                {stockQty === null ? (loadingStock ? 'Đang tải...' : '—') : String(stockQty)}
                                                            </Text>
                                                        </View>
                                                    ) : null}
                                                </View>

                                                {/* Quantity */}
                                                <View style={{ marginTop: 10 }}>
                                                    <Text style={[s.subLabel, { color: colors.textMuted }]}>Số lượng chuyển</Text>
                                                    <View style={[s.inputWrap, { backgroundColor: 'rgba(255,255,255,0.35)', borderColor: inputBorder }]}>
                                                        <TextInput
                                                            style={[s.input, { color: colors.textPrimary }]}
                                                            value={it?.quantity || ''}
                                                            onChangeText={(v) => setItems([{ ...items[0], quantity: v }])}
                                                            keyboardType="numeric"
                                                            placeholder="Nhập số lượng"
                                                            placeholderTextColor={colors.textMuted}
                                                            editable={!submitting}
                                                        />
                                                    </View>
                                                </View>
                                            </View>
                                        );
                                    })()}
                                </View>

                                {/* Note */}
                                <View style={s.field}>
                                    <View style={s.labelRow}>
                                        <StickyNote size={14} color={colors.textMuted} />
                                        <Text style={[s.label, { color: colors.textSecondary }]}>Ghi chú</Text>
                                    </View>
                                    <View style={[s.inputWrap, { backgroundColor: inputBg, borderColor: inputBorder }]}>
                                        <TextInput
                                            style={[s.input, s.textArea, { color: colors.textPrimary }]}
                                            value={note}
                                            onChangeText={setNote}
                                            placeholder="Lý do chuyển kho, ghi chú thêm..."
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

                        {/* Select modals */}
                        <Modal
                            visible={showFromWhSelect}
                            transparent
                            animationType="fade"
                            statusBarTranslucent
                            onRequestClose={() => setShowFromWhSelect(false)}
                        >
                            <Pressable style={s.selectOverlay} onPress={() => setShowFromWhSelect(false)}>
                                <Pressable style={[s.selectSheet, { backgroundColor: modalBg, borderColor: colors.cardBorder }]} onPress={() => { }}>
                                    <Text style={[s.selectTitle, { color: colors.textPrimary }]}>Chọn kho nguồn</Text>
                                    <View style={[s.searchWrap, { backgroundColor: inputBg, borderColor: inputBorder }]}>
                                        <TextInput
                                            value={fromWhQuery}
                                            onChangeText={setFromWhQuery}
                                            placeholder="Tìm kho..."
                                            placeholderTextColor={colors.textMuted}
                                            style={[s.searchInput, { color: colors.textPrimary }]}
                                            autoFocus
                                        />
                                    </View>
                                    <FlatList
                                        data={warehouses.filter((w) => w.name.toLowerCase().includes(fromWhQuery.trim().toLowerCase()))}
                                        keyExtractor={(it) => it.id}
                                        keyboardShouldPersistTaps="handled"
                                        style={{ maxHeight: 360 }}
                                        renderItem={({ item }) => (
                                            <Pressable
                                                onPress={() => {
                                                    setFromWarehouseId(item.id);
                                                    if (item.id === toWarehouseId) setToWarehouseId('');
                                                    setShowFromWhSelect(false);
                                                    setFromWhQuery('');
                                                }}
                                                style={({ pressed }) => [s.selectItem, { borderBottomColor: inputBorder, opacity: pressed ? 0.7 : 1 }]}
                                            >
                                                <Text style={[s.selectItemText, { color: colors.textPrimary }]}>{item.name}</Text>
                                            </Pressable>
                                        )}
                                        ListEmptyComponent={<View style={s.emptySelect}><Text style={[s.emptySelectText, { color: colors.textMuted }]}>Không có dữ liệu</Text></View>}
                                    />
                                </Pressable>
                            </Pressable>
                        </Modal>

                        <Modal
                            visible={showToWhSelect}
                            transparent
                            animationType="fade"
                            statusBarTranslucent
                            onRequestClose={() => setShowToWhSelect(false)}
                        >
                            <Pressable style={s.selectOverlay} onPress={() => setShowToWhSelect(false)}>
                                <Pressable style={[s.selectSheet, { backgroundColor: modalBg, borderColor: colors.cardBorder }]} onPress={() => { }}>
                                    <Text style={[s.selectTitle, { color: colors.textPrimary }]}>Chọn kho đích</Text>
                                    <View style={[s.searchWrap, { backgroundColor: inputBg, borderColor: inputBorder }]}>
                                        <TextInput
                                            value={toWhQuery}
                                            onChangeText={setToWhQuery}
                                            placeholder="Tìm kho..."
                                            placeholderTextColor={colors.textMuted}
                                            style={[s.searchInput, { color: colors.textPrimary }]}
                                            autoFocus
                                        />
                                    </View>
                                    <FlatList
                                        data={warehouses
                                            .filter((w) => w.id !== fromWarehouseId)
                                            .filter((w) => w.name.toLowerCase().includes(toWhQuery.trim().toLowerCase()))
                                        }
                                        keyExtractor={(it) => it.id}
                                        keyboardShouldPersistTaps="handled"
                                        style={{ maxHeight: 360 }}
                                        renderItem={({ item }) => (
                                            <Pressable
                                                onPress={() => {
                                                    setToWarehouseId(item.id);
                                                    setShowToWhSelect(false);
                                                    setToWhQuery('');
                                                }}
                                                style={({ pressed }) => [s.selectItem, { borderBottomColor: inputBorder, opacity: pressed ? 0.7 : 1 }]}
                                            >
                                                <Text style={[s.selectItemText, { color: colors.textPrimary }]}>{item.name}</Text>
                                            </Pressable>
                                        )}
                                        ListEmptyComponent={<View style={s.emptySelect}><Text style={[s.emptySelectText, { color: colors.textMuted }]}>Không có dữ liệu</Text></View>}
                                    />
                                </Pressable>
                            </Pressable>
                        </Modal>

                        <Modal
                            visible={showProductSelect}
                            transparent
                            animationType="fade"
                            statusBarTranslucent
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
                                        keyExtractor={(it) => it.id}
                                        keyboardShouldPersistTaps="handled"
                                        style={{ maxHeight: 360 }}
                                        renderItem={({ item }) => (
                                            <Pressable
                                                onPress={() => {
                                                    setItems([{ ...items[0], productId: item.id }]);
                                                    setShowProductSelect(false);
                                                    setProductQuery('');
                                                }}
                                                style={({ pressed }) => [s.selectItem, { borderBottomColor: inputBorder, opacity: pressed ? 0.7 : 1 }]}
                                            >
                                                <Text style={[s.selectItemText, { color: colors.textPrimary }]}>{item.name}</Text>
                                            </Pressable>
                                        )}
                                        ListEmptyComponent={
                                            <View style={s.emptySelect}>
                                                <Text style={[s.emptySelectText, { color: colors.textMuted }]}>
                                                    {loadingStock ? 'Đang tải tồn kho...' : 'Không có dữ liệu'}
                                                </Text>
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
                                            // Trigger edit mode from parent
                                            if (transfer) {
                                                setTimeout(() => onSuccess(), 50);
                                            }
                                        }}
                                    >
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                            <Copy size={18} color="#FFFFFF" />
                                            <Text style={s.saveBtnText}>Tạo phiếu tương tự</Text>
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
                                                    {isEdit ? 'Tạo phiếu mới' : 'Xác nhận chuyển kho'}
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

    // Arrow divider
    arrowDivider: {
        flexDirection: 'row', alignItems: 'center',
        marginBottom: Spacing.lg, gap: Spacing.sm,
    },
    arrowLine: { flex: 1, height: 1 },
    arrowCircle: {
        width: 32, height: 32, borderRadius: 16,
        borderWidth: 1, alignItems: 'center', justifyContent: 'center',
    },

    // Fields
    field: { marginBottom: Spacing.lg },
    labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.sm },
    label: { fontSize: FontSizes.sm, fontWeight: FontWeights.medium },
    inputWrap: {
        paddingHorizontal: Spacing.md, paddingVertical: 12,
        borderRadius: BorderRadius.lg, borderWidth: 1,
    },
    input: { fontSize: FontSizes.base },
    textArea: { height: 80, textAlignVertical: 'top' },
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

    viewItemCard: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: Spacing.md, paddingVertical: 14,
        borderRadius: BorderRadius.lg, borderWidth: 1, gap: 10,
    },
    viewItemName: { fontSize: FontSizes.sm, flex: 1, fontWeight: FontWeights.medium },
    viewQtyChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10 },
    viewQtyText: { fontSize: 13, fontWeight: FontWeights.bold, color: ACCENT },

    // Buttons
    removeBtn: {
        paddingVertical: 10, paddingHorizontal: 12,
        borderRadius: 12, borderWidth: 1,
    },
    addItemBtn: {
        paddingVertical: 12, borderRadius: 14,
        alignItems: 'center', justifyContent: 'center', borderWidth: 1,
    },

    helperText: { fontSize: FontSizes.xs, marginTop: 2 },
    subLabel: { fontSize: FontSizes.xs, fontWeight: FontWeights.medium, marginBottom: 6 },

    itemCard: {
        borderRadius: BorderRadius.xl,
        borderWidth: 1,
        padding: Spacing.md,
    },
    itemCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    itemBadge: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
    },
    itemBadgeText: {
        fontSize: FontSizes.xs,
        fontWeight: FontWeights.bold,
        color: ACCENT,
    },
    itemRemove: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        borderWidth: 1,
    },
    itemRemoveText: { fontSize: FontSizes.sm, fontWeight: FontWeights.semibold },

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
