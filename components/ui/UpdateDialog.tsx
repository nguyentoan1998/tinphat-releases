/**
 * UpdateDialog — thông báo có bản cập nhật mới.
 *
 * Hiển thị version mới, release notes (markdown từ GitHub Release body),
 * kích thước file APK, và hai nút: "Cập nhật ngay" và "Để sau".
 *
 * Requirements: 5.1, 5.5
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

export interface UpdateDialogProps {
    visible: boolean;
    version: string;
    /** Release notes markdown string from GitHub Release body */
    releaseNotes?: string;
    /** APK file size in bytes — displayed as human-readable string (e.g. "12.5 MB") */
    apkSize?: number;
    onUpdate: () => void;
    onDismiss: () => void;
}

/**
 * Chuyển đổi số bytes thành chuỗi dễ đọc.
 * Ví dụ: 13107200 → "12.5 MB"
 */
function formatFileSize(bytes: number): string {
    if (bytes >= 1024 * 1024) {
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    if (bytes >= 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${bytes} B`;
}

export default function UpdateDialog({
    visible,
    version,
    releaseNotes,
    apkSize,
    onUpdate,
    onDismiss,
}: UpdateDialogProps) {

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={() => {
                // Non-dismissible: không làm gì khi nhấn back
            }}
            statusBarTranslucent
        >
            <View style={styles.overlay}>
                <View style={styles.card}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.emoji}>🚀</Text>
                        <Text style={styles.title}>Có bản cập nhật mới!</Text>
                        <Text style={styles.versionBadge}>v{version}</Text>
                    </View>

                    {/* Release notes */}
                    {releaseNotes ? (
                        <View style={styles.notesContainer}>
                            <Text style={styles.notesLabel}>Có gì mới:</Text>
                            <Text style={styles.notesText}>{releaseNotes}</Text>
                        </View>
                    ) : (
                        <Text style={styles.defaultMessage}>
                            Phiên bản mới đã sẵn sàng. Cập nhật ngay để trải nghiệm các tính năng mới nhất.
                        </Text>
                    )}

                    {/* File size */}
                    {apkSize != null && apkSize > 0 && (
                        <Text style={styles.fileSizeText}>
                            Kích thước: {formatFileSize(apkSize)}
                        </Text>
                    )}

                    {/* Divider */}
                    <View style={styles.divider} />

                    {/* Buttons */}
                    <View style={styles.buttonRow}>
                        <TouchableOpacity
                            style={[styles.button, styles.dismissButton]}
                            onPress={onDismiss}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.dismissButtonText}>Để sau</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.button, styles.updateButton]}
                            onPress={onUpdate}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.updateButtonText}>Cập nhật ngay</Text>
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
    },
    header: {
        alignItems: 'center',
        paddingTop: 28,
        paddingHorizontal: 24,
        paddingBottom: 16,
        backgroundColor: Colors.primary[50],
    },
    emoji: {
        fontSize: 36,
        marginBottom: 8,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.primary[500],
        textAlign: 'center',
        marginBottom: 6,
    },
    versionBadge: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.neutral.white,
        backgroundColor: Colors.primary[500],
        paddingHorizontal: 12,
        paddingVertical: 3,
        borderRadius: 12,
        overflow: 'hidden',
    },
    notesContainer: {
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 8,
    },
    notesLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.neutral.gray600,
        marginBottom: 6,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    notesText: {
        fontSize: 14,
        color: Colors.neutral.gray700,
        lineHeight: 20,
    },
    defaultMessage: {
        fontSize: 14,
        color: Colors.neutral.gray600,
        lineHeight: 20,
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 8,
        textAlign: 'center',
    },
    fileSizeText: {
        fontSize: 12,
        color: Colors.neutral.gray500,
        paddingHorizontal: 24,
        paddingBottom: 8,
        textAlign: 'right',
    },
    divider: {
        height: 1,
        backgroundColor: Colors.neutral.gray200,
        marginTop: 16,
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
    dismissButton: {
        borderRightWidth: 1,
        borderRightColor: Colors.neutral.gray200,
    },
    dismissButtonText: {
        fontSize: 15,
        fontWeight: '500',
        color: Colors.neutral.gray500,
    },
    updateButton: {
        backgroundColor: Colors.primary[500],
    },
    updateButtonText: {
        fontSize: 15,
        fontWeight: '700',
        color: Colors.neutral.white,
    },
});
