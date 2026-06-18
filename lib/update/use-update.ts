/**
 * useUpdate — React hook that manages the in-app update flow.
 *
 * State machine:
 * idle → checking → (no_update | update_available | error)
 * update_available → downloading → (ready_to_install | error)
 * ready_to_install → (launched install | error)
 *
 * Session dismissal:
 * - dismissUpdateForSession(version) stores the dismissed version in a ref
 * - startUpdateCheck() skips emitting update_available for dismissed versions
 *
 * Requirements: 1.3, 2.1, 3.2, 3.6, 4.1, 7.1, 7.2
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { UpdateUiState, UpdateConfig } from './types';
import { checkForUpdate } from './update-checker';
import { startDownload } from './downloader';
import { installApk } from './installer';

// Auto-retry interval for transient network errors (30 seconds)
const RETRY_INTERVAL_MS = 30_000;

interface LastDownloadParams {
  apkUrl: string;
  apkSize: number;
}

export interface UseUpdateReturn {
  state: UpdateUiState;
  startUpdateCheck: () => Promise<void>;
  startDownloadApk: (apkUrl: string, apkSize: number) => Promise<void>;
  triggerInstall: (filePath: string) => Promise<void>;
  dismissUpdateForSession: (version: string) => void;
  retryDownload: () => void;
  resetToIdle: () => void;
}

/**
 * React hook that manages the in-app update flow.
 *
 * Requirements: 1.3, 2.1, 3.2, 3.6, 4.1, 7.1, 7.2
 */
export function useUpdate(config: UpdateConfig): UseUpdateReturn {
  const [state, setState] = useState<UpdateUiState>('idle');

  // Dismissed version stored in a ref — no re-render needed (Requirement 7.2)
  const dismissedVersionRef = useRef<string | null>(null);

  // Last download params stored for retry support
  const lastDownloadParamsRef = useRef<LastDownloadParams | null>(null);

  // Retry timer ref for auto-retry on transient errors
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup retry timer on unmount
  useEffect(() => {
    return () => {
      if (retryTimerRef.current !== null) {
        clearTimeout(retryTimerRef.current);
      }
    };
  }, []);

  /**
   * Check for available updates.
   * Transitions: idle → checking → (no_update | update_available | error)
   * Requirement 1.3, 2.1, 7.1, 7.2
   * On transient errors (no_network, rate_limited), auto-retries after a delay.
   */
  const startUpdateCheck = useCallback(async (retryOnFailure: boolean = true): Promise<void> => {
    setState('checking');

    console.log('[AppUpdate] Starting update check...');

    const result = await checkForUpdate(config);

    if (result.type === 'update_available') {
      const { remoteVersion, apkUrl, apkSize, releaseNotes } = result;

      // Requirement 7.2: skip update_available if version was dismissed this session
      if (dismissedVersionRef.current === remoteVersion) {
        console.log(`[AppUpdate] Version ${remoteVersion} was dismissed this session — skipping`);
        setState('no_update');
        return;
      }

      console.log(`[AppUpdate] Update available: v${remoteVersion}`);
      setState({
        type: 'update_available',
        version: remoteVersion,
        apkUrl,
        releaseNotes,
        apkSize,
      });
    } else if (result.type === 'no_update') {
      console.log('[AppUpdate] No update available');
      setState('no_update');
    } else {
      // result.type === 'error'
      console.error(`[AppUpdate] Update check failed: ${result.reason}`);

      // Transient errors: auto-retry after delay
      if (retryOnFailure && (result.reason === 'no_network' || result.reason === 'rate_limited' || result.reason === 'fetch_failed')) {
        console.log(`[AppUpdate] Will retry in ${RETRY_INTERVAL_MS / 1000}s...`);
        retryTimerRef.current = setTimeout(() => {
          console.log('[AppUpdate] Retrying update check...');
          startUpdateCheck(false).catch(() => {});
        }, RETRY_INTERVAL_MS);
      }

      // Silent: không hiện modal lỗi cho user
      setState('idle');
    }
  }, [config]);

  /**
   * Start downloading the APK.
   * Transitions: → downloading(0) → downloading(progress) → (ready_to_install | error)
   * Requirements: 3.2, 3.6
   */
  const startDownloadApk = useCallback(
    async (apkUrl: string, apkSize: number): Promise<void> => {
      // Store params for retry support
      lastDownloadParamsRef.current = { apkUrl, apkSize };

      setState({ type: 'downloading', progress: 0 });

      await startDownload(
        apkUrl,
        apkSize,
        (downloadState) => {
          if (downloadState.type === 'progress') {
            setState({ type: 'downloading', progress: downloadState.percentage });
          } else if (downloadState.type === 'success') {
            setState({ type: 'ready_to_install', filePath: downloadState.filePath });
          } else if (downloadState.type === 'failed') {
            if (downloadState.retriesLeft > 0) {
              // Retrying — reset progress to 0 (Requirement 3.6)
              setState({ type: 'downloading', progress: 0 });
            } else {
              // All retries exhausted (Requirement 3.6)
              const errorMessages: Record<string, string> = {
                network_error: 'Tải xuống thất bại do lỗi mạng. Vui lòng thử lại.',
                checksum_mismatch: 'File tải xuống bị lỗi (checksum không khớp). Vui lòng thử lại.',
                disk_full: 'Không đủ dung lượng lưu trữ để tải xuống.',
                unknown: 'Đã xảy ra lỗi không xác định khi tải xuống.',
              };
              const message =
                errorMessages[downloadState.reason] ?? 'Tải xuống thất bại. Vui lòng thử lại.';
              setState({ type: 'error', message, canRetry: true });
            }
          }
          // 'paused' state: no UI state change needed — keep current downloading state
        },
        config,
      );
    },
    [config],
  );

  /**
   * Trigger APK installation.
   * Requirements: 4.1
   */
  const triggerInstall = useCallback(async (filePath: string): Promise<void> => {
    const result = await installApk(filePath);

    if (result.type === 'launched') {
      // System takes over — keep state as ready_to_install
    } else {
      // result.type === 'failed'
      setState({ type: 'error', message: result.reason, canRetry: false });
    }
  }, []);

  /**
   * Dismiss the update dialog for the current session.
   * Stored in a ref — does not trigger re-render.
   * Requirement 7.2
   */
  const dismissUpdateForSession = useCallback((version: string): void => {
    dismissedVersionRef.current = version;
  }, []);

  /**
   * Retry the last download if params are available.
   */
  const retryDownload = useCallback((): void => {
    const params = lastDownloadParamsRef.current;
    if (params) {
      startDownloadApk(params.apkUrl, params.apkSize);
    }
  }, [startDownloadApk]);

  /**
   * Reset state về idle — dùng để dismiss error modal khi download thất bại.
   */
  const resetToIdle = useCallback((): void => {
    setState('idle');
  }, []);

  return {
    state,
    startUpdateCheck,
    startDownloadApk,
    triggerInstall,
    dismissUpdateForSession,
    retryDownload,
    resetToIdle,
  };
}
