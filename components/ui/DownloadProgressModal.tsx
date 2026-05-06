/**
 * DownloadProgressModal — hiển thị tiến trình tải APK.
 *
 * Non-dismissible. Hiển thị progress bar, phần trăm, và trạng thái lỗi.
 *
 * Requirements: 3.2, 3.3, 3.6, 4.5
 */
import React from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    ActivityIndicator,
} from 'react-native';
import { Colors } from '@/constants/Colors';

const { width } = Dimensions.get('window');

export interface DownloadProgressModalProps {
    visible: boolean;
    /** Tiến trình tải xuống, từ 0 đến 100 */
    progress: number;
    isError: boolean;
    errorMessage?: string;
    canRetry: boolean;
    onRetry?: () => void;
    onDismiss?: () => void;
}

export default function DownloadProgressModal({
    visible,
    progress,
    isError,
    errorMessage,
    canRetry,
    onRetry,
    onDismiss,
}: DownloadProgressModalProps) {
    // Clamp progress to [0, 100]
    const clampedProgress = Math.min(100, Math.max(0, progress));
    const progressPercent = `${Math.round(clampedProgress)}%`;

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
                    {isError ? (
                        /* ── Error state ── */
                        <View style={styles.errorContainer}>
                            <Text style={styles.errorIcon}>⚠️</Text>
                            <Text style={styles.errorTitle}>
                                {canRetry ? 'Tải xuống thất bại' : 'Không thể tải xuống'}
                            </Text>
                            {errorMessage ? (
                                <Text style={styles.errorMessage}>{errorMessage}</Text>
                            ) : (
                                <Text style={styles.errorMessage}>
                                    {canRetry
                                        ? 'Đã xảy ra lỗi khi tải xuống. Vui lòng thử lại.'
                                        : 'Không thể tải xuống bản cập nhật. Vui lòng thử lại sau.'}
                                </Text>
                            )}

                            <View style={styles.errorButtonRow}>
                                {canRetry ? (
                                    <>
                                        <TouchableOpacity
                                            style={[styles.errorButton, styles.dismissErrorButton]}
                                            onPress={onDismiss}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={styles.dismissErrorButtonText}>Hủy</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.errorButton, styles.retryButton]}
                                            onPress={onRetry}
                                            activeOpacity={0.8}
                                        >
                                            <Text style={styles.retryButtonText}>Thử lại</Text>
                                        </TouchableOpacity>
                                    </>
                                ) : (
                                    <TouchableOpacity
                                        style={[styles.errorButton, styles.closeButton]}
                                        onPress={onDismiss}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={styles.closeButtonText}>Đóng</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    ) : (
                        /* ── Downloading state ── */
                        <View style={styles.downloadContainer}>
                            <ActivityIndicator
                                size="small"
                                color={Colors.primary[500]}
                                style={styles.spinner}
                            />
                            <Text style={styles.downloadTitle}>Đang tải bản cập nhật...</Text>

                            {/* Progress bar */}
                            <View style={styles.progressBarTrack}>
                                <View
                                    style={[
                                        styles.progressBarFill,
                                        { width: `${clampedProgress}%` },
                                    ]}
                                />
                            </View>

                            {/* Percentage text */}
                            <Text style={styles.percentageText}>{progressPercent}</Text>

                            <Text style={styles.downloadHint}>
                                Vui lòng không tắt ứng dụng trong khi tải xuống.
                            </Text>
                        </View>
                    )}
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
        width: width * 0.82,
        maxWidth: 340,
        backgroundColor: Colors.neutral.white,
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 16,
    },

    /* ── Downloading ── */
    downloadContainer: {
        padding: 28,
        alignItems: 'center',
    },
    spinner: {
        marginBottom: 12,
    },
    downloadTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.neutral.gray800,
        marginBottom: 20,
        textAlign: 'center',
    },
    progressBarTrack: {
        width: '100%',
        height: 8,
        backgroundColor: Colors.neutral.gray200,
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: Colors.primary[500],
        borderRadius: 4,
    },
    percentageText: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.primary[500],
        marginTop: 10,
        marginBottom: 12,
    },
    downloadHint: {
        fontSize: 12,
        color: Colors.neutral.gray400,
        textAlign: 'center',
        lineHeight: 17,
    },

    /* ── Error ── */
    errorContainer: {
        padding: 28,
        alignItems: 'center',
    },
    errorIcon: {
        fontSize: 36,
        marginBottom: 12,
    },
    errorTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.semantic.error,
        marginBottom: 8,
        textAlign: 'center',
    },
    errorMessage: {
        fontSize: 14,
        color: Colors.neutral.gray600,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
    },
    errorButtonRow: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    errorButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dismissErrorButton: {
        backgroundColor: Colors.neutral.gray100,
    },
    dismissErrorButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.neutral.gray600,
    },
    retryButton: {
        backgroundColor: Colors.primary[500],
    },
    retryButtonText: {
        fontSize: 15,
        fontWeight: '700',
        color: Colors.neutral.white,
    },
    closeButton: {
        backgroundColor: Colors.neutral.gray100,
    },
    closeButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.neutral.gray700,
    },
});
