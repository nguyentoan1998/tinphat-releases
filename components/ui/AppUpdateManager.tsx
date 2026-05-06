/**
 * AppUpdateManager — component tổng hợp quản lý toàn bộ update flow.
 *
 * Tích hợp useUpdate hook với 3 modals: UpdateDialog, DownloadProgressModal,
 * InstallPermissionModal. Tự động kiểm tra update khi mount.
 *
 * Requirements: 1.1, 1.3, 2.1, 4.1, 4.2, 4.3, 7.1, 7.2
 */
import React, { useEffect, useRef } from 'react';
import { Linking, Platform } from 'react-native';
import { useUpdate, DEFAULT_UPDATE_CONFIG } from '@/lib/update';
import type { UpdateConfig } from '@/lib/update';
import UpdateDialog from './UpdateDialog';
import DownloadProgressModal from './DownloadProgressModal';
import InstallPermissionModal from './InstallPermissionModal';

export interface AppUpdateManagerProps {
    /** Optional config override. Defaults to DEFAULT_UPDATE_CONFIG. */
    config?: UpdateConfig;
}

export default function AppUpdateManager({ config = DEFAULT_UPDATE_CONFIG }: AppUpdateManagerProps) {

    const {
        state,
        startUpdateCheck,
        startDownloadApk,
        triggerInstall,
        dismissUpdateForSession,
        retryDownload,
        resetToIdle,
    } = useUpdate(config);

    // Track whether install has been triggered to avoid double-calling
    const installTriggeredRef = useRef(false);

    // Track whether permission modal is showing
    const [showPermissionModal, setShowPermissionModal] = React.useState(false);
    // Store filePath for install after permission granted
    const pendingInstallPathRef = useRef<string | null>(null);

    // Kiểm tra update khi component mount (Requirement 1.1, 1.3)
    useEffect(() => {
        startUpdateCheck();
    }, []);

    // Khi state chuyển sang ready_to_install → tự động trigger install (Requirement 4.1)
    useEffect(() => {
        if (
            typeof state === 'object' &&
            state.type === 'ready_to_install' &&
            !installTriggeredRef.current
        ) {
            installTriggeredRef.current = true;
            pendingInstallPathRef.current = state.filePath;
            handleInstall(state.filePath);
        }
        // Reset trigger flag when state leaves ready_to_install
        if (
            typeof state === 'string' ||
            (typeof state === 'object' && state.type !== 'ready_to_install')
        ) {
            installTriggeredRef.current = false;
        }
    }, [state]);

    async function handleInstall(filePath: string) {
        if (Platform.OS !== 'android') return;
        await triggerInstall(filePath);
    }

    // Mở Settings để cấp quyền cài đặt (Requirement 4.3)
    function handleOpenSettings() {
        setShowPermissionModal(false);
        Linking.openSettings().catch(() => {
            // Fallback: mở settings chung nếu openSettings không hoạt động
            Linking.openURL('app-settings:').catch(() => {});
        });
    }

    // ── Derived UI state ──

    const isUpdateAvailable =
        typeof state === 'object' && state.type === 'update_available';

    const isDownloading =
        typeof state === 'object' && state.type === 'downloading';

    const isError =
        typeof state === 'object' && state.type === 'error';

    const showDownloadModal = isDownloading || isError;

    const downloadProgress =
        isDownloading && typeof state === 'object' && state.type === 'downloading'
            ? state.progress
            : 0;

    const errorMessage =
        isError && typeof state === 'object' && state.type === 'error'
            ? state.message
            : undefined;

    const canRetry =
        isError && typeof state === 'object' && state.type === 'error'
            ? state.canRetry
            : false;

    // ── Handlers ──

    function handleUpdate() {
        if (!isUpdateAvailable) return;
        const s = state as { type: 'update_available'; version: string; apkUrl: string; apkSize: number; releaseNotes: string };
        startDownloadApk(s.apkUrl, s.apkSize);
    }

    function handleDismiss() {
        if (!isUpdateAvailable) return;
        const s = state as { type: 'update_available'; version: string };
        dismissUpdateForSession(s.version);
    }

    return (
        <>
            {/* Dialog thông báo có bản cập nhật mới (Requirement 7.1) */}
            <UpdateDialog
                visible={isUpdateAvailable}
                version={
                    isUpdateAvailable && typeof state === 'object' && state.type === 'update_available'
                        ? state.version
                        : ''
                }
                releaseNotes={
                    isUpdateAvailable &&
                    typeof state === 'object' &&
                    state.type === 'update_available'
                        ? state.releaseNotes
                        : undefined
                }
                apkSize={
                    isUpdateAvailable &&
                    typeof state === 'object' &&
                    state.type === 'update_available'
                        ? state.apkSize
                        : undefined
                }
                onUpdate={handleUpdate}
                onDismiss={handleDismiss}
            />

            {/* Modal tiến trình tải xuống (Requirement 3.2, 3.6) */}
            <DownloadProgressModal
                visible={showDownloadModal}
                progress={downloadProgress}
                isError={isError}
                errorMessage={errorMessage}
                canRetry={canRetry}
                onRetry={retryDownload}
                onDismiss={resetToIdle}
            />

            {/* Modal hướng dẫn cấp quyền cài đặt (Requirement 4.2, 4.3) */}
            <InstallPermissionModal
                visible={showPermissionModal}
                onOpenSettings={handleOpenSettings}
                onDismiss={() => setShowPermissionModal(false)}
            />
        </>
    );
}
