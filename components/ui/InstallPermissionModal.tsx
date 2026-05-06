/**
 * InstallPermissionModal — hướng dẫn người dùng cấp quyền REQUEST_INSTALL_PACKAGES.
 *
 * Chỉ hiển thị khi cần thiết (khi thiếu quyền cài đặt APK từ nguồn ngoài).
 *
 * Requirements: 4.2, 4.3, 4.4
 */
import React from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
} from 'react-native';
import { Colors } from '@/constants/Colors';

const { width } = Dimensions.get('window');

export interface InstallPermissionModalProps {
    visible: boolean;
    onOpenSettings: () => void;
    onDismiss: () => void;
}

export default function InstallPermissionModal({
    visible,
    onOpenSettings,
    onDismiss,
}: InstallPermissionModalProps) {
    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onDismiss}
            statusBarTranslucent
        >
            <View style={styles.overlay}>
                <View style={styles.card}>
                    {/* Icon */}
                    <View style={styles.iconContainer}>
                        <Text style={styles.icon}>🔐</Text>
                    </View>

                    {/* Title */}
                    <Text style={styles.title}>Cần cấp quyền cài đặt</Text>

                    {/* Explanation */}
                    <Text style={styles.description}>
                        Để cài đặt bản cập nhật, ứng dụng cần quyền{' '}
                        <Text style={styles.bold}>Cài đặt ứng dụng từ nguồn không xác định</Text>.
                    </Text>

                    <Text style={styles.steps}>
                        Nhấn <Text style={styles.bold}>"Mở Cài đặt"</Text> → tìm ứng dụng này → bật{' '}
                        <Text style={styles.bold}>"Cho phép từ nguồn này"</Text>.
                    </Text>

                    {/* Divider */}
                    <View style={styles.divider} />

                    {/* Buttons */}
                    <View style={styles.buttonRow}>
                        <TouchableOpacity
                            style={[styles.button, styles.cancelButton]}
                            onPress={onDismiss}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.cancelButtonText}>Hủy</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.button, styles.settingsButton]}
                            onPress={onOpenSettings}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.settingsButtonText}>Mở Cài đặt</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
    },
    card: {
        width: width * 0.85,
        maxWidth: 360,
        backgroundColor: Colors.neutral.white,
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 16,
        paddingTop: 28,
    },
    iconContainer: {
        alignItems: 'center',
        marginBottom: 12,
    },
    icon: {
        fontSize: 40,
    },
    title: {
        fontSize: 17,
        fontWeight: '700',
        color: Colors.neutral.gray800,
        textAlign: 'center',
        paddingHorizontal: 24,
        marginBottom: 12,
    },
    description: {
        fontSize: 14,
        color: Colors.neutral.gray600,
        textAlign: 'center',
        lineHeight: 21,
        paddingHorizontal: 24,
        marginBottom: 10,
    },
    steps: {
        fontSize: 13,
        color: Colors.neutral.gray500,
        textAlign: 'center',
        lineHeight: 19,
        paddingHorizontal: 24,
        marginBottom: 20,
        backgroundColor: Colors.neutral.gray100,
        marginHorizontal: 16,
        borderRadius: 10,
        paddingVertical: 10,
    },
    bold: {
        fontWeight: '700',
        color: Colors.neutral.gray700,
    },
    divider: {
        height: 1,
        backgroundColor: Colors.neutral.gray200,
    },
    buttonRow: {
        flexDirection: 'row',
    },
    button: {
        flex: 1,
        paddingVertical: 15,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelButton: {
        borderRightWidth: 1,
        borderRightColor: Colors.neutral.gray200,
    },
    cancelButtonText: {
        fontSize: 15,
        fontWeight: '500',
        color: Colors.neutral.gray500,
    },
    settingsButton: {
        backgroundColor: Colors.primary[500],
    },
    settingsButtonText: {
        fontSize: 15,
        fontWeight: '700',
        color: Colors.neutral.white,
    },
});
