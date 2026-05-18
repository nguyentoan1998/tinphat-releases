// Stock Out Modal — đồng bộ style EmployeeFormModal
import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    Pressable,
    TextInput,
    ScrollView,
    ActivityIndicator,
    Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { X, ArrowUpFromLine, Warehouse as WarehouseIcon, Package, StickyNote, Save } from 'lucide-react-native';
import { Picker } from '@react-native-picker/picker';
import { useThemeStore } from '@/store';
import { ThemeColors } from '@/constants/ThemeColors';
import { Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants/Tokens';
import { useDarkDialog } from '@/components/ui/DarkDialog';
import { inventoryApi, Product, Warehouse } from '@/lib/inventory-api';

interface StockOutModalProps {
    visible: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function StockOutModal({ visible, onClose, onSuccess }: StockOutModalProps) {
    const { isDark } = useThemeStore();
    const colors = isDark ? ThemeColors.dark : ThemeColors.light;
    const { showDialog, DialogComponent } = useDarkDialog();

    const modalBg = isDark ? 'rgba(15,15,30,0.98)' : 'rgba(245,247,255,0.98)';
    const inputBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(99,102,241,0.06)';
    const inputBorder = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(99,102,241,0.15)';
    const pickerItemStyle = isDark
        ? { backgroundColor: '#1a1a2e', color: '#FFFFFF' }
        : { backgroundColor: '#FFFFFF', color: '#1E1B4B' };

    const [warehouseId, setWarehouseId] = useState('');
    const [productId, setProductId] = useState('');
    const [quantity, setQuantity] = useState('');
    const [note, setNote] = useState('');
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (visible) { loadData(); resetForm(); }
    }, [visible]);

    const resetForm = () => {
        setWarehouseId(''); setProductId(''); setQuantity(''); setNote('');
    };

    const loadData = async () => {
        setLoading(true);
        try {
            const [wh, sp] = await Promise.all([
                inventoryApi.getWarehouses(),
                inventoryApi.getProducts(),
            ]);
            const whArr = Array.isArray(wh) ? wh : [];
            const prodArr = Array.isArray(sp) ? sp : [];
            setWarehouses(whArr);
            setProducts(prodArr);

            if (whArr.length === 0) {
                showDialog('Thông báo', 'Chưa có kho hoặc không tải được danh sách kho. Vui lòng kiểm tra kết nối/quyền truy cập.');
            }
        } catch (error: any) {
            const msg = error?.response?.data?.message || error?.message || 'Không thể tải danh sách kho/sản phẩm';
            showDialog('Lỗi', Array.isArray(msg) ? msg.join(', ') : String(msg));
            setWarehouses([]);
            setProducts([]);
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => { if (!submitting) { resetForm(); onClose(); } };

    const handleSubmit = async () => {
        if (!warehouseId) { showDialog('Lỗi', 'Vui lòng chọn kho xuất'); return; }
        if (!productId) { showDialog('Lỗi', 'Vui lòng chọn sản phẩm'); return; }
        const qNum = parseInt(quantity);
        if (!quantity || isNaN(qNum) || qNum <= 0) { showDialog('Lỗi', 'Vui lòng nhập số lượng > 0'); return; }
        try {
            setSubmitting(true);
            await inventoryApi.createStockMovement({ type: 'OUT', warehouseId, productId, quantity: qNum, note: note || undefined });
            showDialog('Thành công', `Đã xuất ${qNum} sản phẩm khỏi kho`);
            handleClose();
            onSuccess();
        } catch (error: any) {
            const msg = error.response?.data?.message || error.message || 'Không thể xuất kho';
            showDialog('Lỗi', Array.isArray(msg) ? msg.join(', ') : msg);
        } finally { setSubmitting(false); }
    };

    return (
        <>
            <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose} statusBarTranslucent>
                <View style={s.overlay}>
                    <BlurView intensity={40} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
                    <Animated.View
                        entering={FadeIn.duration(250)}
                        exiting={FadeOut.duration(200)}
                        style={[s.container, { backgroundColor: modalBg, borderColor: colors.cardBorder }]}
                    >
                        {/* Header */}
                        <View style={[s.header, { borderBottomColor: 'rgba(0,0,0,0.06)' }]}>
                            <ArrowUpFromLine size={24} color="#EF4444" />
                            <Text style={[s.headerTitle, { color: colors.textPrimary }]}>Xuất kho</Text>
                            <Pressable style={[s.closeBtn, { backgroundColor: 'rgba(0,0,0,0.05)' }]} onPress={handleClose} disabled={submitting}>
                                <X size={22} color={colors.textSecondary} />
                            </Pressable>
                        </View>

                        {loading ? (
                            <View style={s.loadingWrap}>
                                <ActivityIndicator size="large" color="#EF4444" />
                            </View>
                        ) : (
                            <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                                {/* Kho xuất */}
                                <View style={s.field}>
                                    <View style={s.labelRow}>
                                        <WarehouseIcon size={14} color={colors.textMuted} />
                                        <Text style={[s.label, { color: colors.textSecondary }]}>Kho xuất *</Text>
                                    </View>
                                    <View style={[s.pickerWrap, { backgroundColor: inputBg, borderColor: inputBorder }]}>
                                        <Picker selectedValue={warehouseId} onValueChange={setWarehouseId}
                                            style={[s.picker, { color: colors.textPrimary }]}
                                            dropdownIconColor={colors.textMuted} enabled={!submitting} mode={Platform.OS === 'android' ? 'dialog' : 'dropdown'}>
                                            <Picker.Item label="-- Chọn kho --" value="" style={pickerItemStyle} />
                                            {warehouses.length === 0 ? (
                                                <Picker.Item label="(Chưa có kho hoặc không tải được danh sách kho)" value="" style={pickerItemStyle} />
                                            ) : (
                                                warehouses.map((w) => (
                                                    <Picker.Item key={w.id} label={w.name} value={w.id} style={pickerItemStyle} />
                                                ))
                                            )}
                                        </Picker>
                                    </View>
                                </View>

                                {/* Sản phẩm */}
                                <View style={s.field}>
                                    <View style={s.labelRow}>
                                        <Package size={14} color={colors.textMuted} />
                                        <Text style={[s.label, { color: colors.textSecondary }]}>Sản phẩm *</Text>
                                    </View>
                                    <View style={[s.pickerWrap, { backgroundColor: inputBg, borderColor: inputBorder }]}>
                                        <Picker selectedValue={productId} onValueChange={setProductId}
                                            style={[s.picker, { color: colors.textPrimary }]}
                                            dropdownIconColor={colors.textMuted} enabled={!submitting} mode={Platform.OS === 'android' ? 'dialog' : 'dropdown'}>
                                            <Picker.Item label="-- Chọn sản phẩm --" value="" style={pickerItemStyle} />
                                            {products.map(p => (
                                                <Picker.Item key={p.id} label={p.name} value={p.id} style={pickerItemStyle} />
                                            ))}
                                        </Picker>
                                    </View>
                                </View>

                                {/* Số lượng */}
                                <View style={s.field}>
                                    <View style={s.labelRow}>
                                        <Package size={14} color={colors.textMuted} />
                                        <Text style={[s.label, { color: colors.textSecondary }]}>Số lượng xuất *</Text>
                                    </View>
                                    <View style={[s.inputWrap, { backgroundColor: inputBg, borderColor: inputBorder }]}>
                                        <TextInput
                                            style={[s.input, { color: colors.textPrimary }]}
                                            value={quantity} onChangeText={setQuantity}
                                            keyboardType="numeric" placeholder="Nhập số lượng"
                                            placeholderTextColor={colors.textMuted} editable={!submitting}
                                        />
                                    </View>
                                </View>

                                {/* Ghi chú */}
                                <View style={s.field}>
                                    <View style={s.labelRow}>
                                        <StickyNote size={14} color={colors.textMuted} />
                                        <Text style={[s.label, { color: colors.textSecondary }]}>Ghi chú</Text>
                                    </View>
                                    <View style={[s.inputWrap, { backgroundColor: inputBg, borderColor: inputBorder }]}>
                                        <TextInput
                                            style={[s.input, s.textArea, { color: colors.textPrimary }]}
                                            value={note} onChangeText={setNote}
                                            placeholder="VD: Xuất bán, xuất sản xuất..."
                                            placeholderTextColor={colors.textMuted}
                                            multiline numberOfLines={3} editable={!submitting}
                                        />
                                    </View>
                                </View>
                                <View style={{ height: 40 }} />
                            </ScrollView>
                        )}

                        {/* Footer */}
                        <View style={[s.footer, { borderTopColor: 'rgba(0,0,0,0.06)' }]}>
                            <Pressable style={[s.saveBtn, { backgroundColor: '#EF4444' }, submitting && s.saveBtnDisabled]} onPress={handleSubmit} disabled={submitting || loading}>
                                {submitting ? <ActivityIndicator size="small" color="#FFFFFF" /> : (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <Save size={18} color="#FFFFFF" />
                                        <Text style={s.saveBtnText}>Xác nhận xuất kho</Text>
                                    </View>
                                )}
                            </Pressable>
                            <Pressable style={s.cancelBtn} onPress={handleClose} disabled={submitting}>
                                <Text style={[s.cancelText, { color: colors.textMuted }]}>Hủy</Text>
                            </Pressable>
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
    container: { height: '85%', borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, overflow: 'hidden' },
    header: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
        paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg, borderBottomWidth: 1,
    },
    headerTitle: { flex: 1, fontSize: FontSizes.xl, fontWeight: FontWeights.bold },
    closeBtn: { padding: 8, borderRadius: 12 },
    loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scroll: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg },
    field: { marginBottom: Spacing.lg },
    labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.sm },
    label: { fontSize: FontSizes.sm, fontWeight: FontWeights.medium },
    inputWrap: { paddingHorizontal: Spacing.md, paddingVertical: 12, borderRadius: BorderRadius.lg, borderWidth: 1 },
    input: { fontSize: FontSizes.base },
    textArea: { height: 80, textAlignVertical: 'top' },
    pickerWrap: { borderRadius: BorderRadius.lg, borderWidth: 1, minHeight: 48, justifyContent: 'center', paddingHorizontal: 4 },
    picker: { flex: 1 },
    footer: { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg, gap: Spacing.md, borderTopWidth: 1 },
    saveBtn: { paddingVertical: 14, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    saveBtnDisabled: { opacity: 0.5 },
    saveBtnText: { fontSize: FontSizes.base, fontWeight: FontWeights.semibold, color: '#FFFFFF' },
    cancelBtn: { padding: Spacing.md, alignItems: 'center' },
    cancelText: { fontSize: FontSizes.base, fontWeight: FontWeights.medium },
});
