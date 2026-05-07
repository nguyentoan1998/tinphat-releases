/**
 * ApkDownloadRepository — downloads an APK from a GitHub Release using expo-file-system.
 *
 * Features:
 * - Progress tracking via onState callback
 * - File size verification after download (compares actual size with expected size
 *   from GitHubReleaseAsset.size)
 * - Retry logic with configurable max retries and interval
 *
 * Requirements: 3.1, 3.2, 5.2, 5.3, 5.4, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7
 */

import * as FileSystem from 'expo-file-system';
import { DownloadState } from './types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const APK_SUBPATH = 'update/app-update.apk';
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RETRY_INTERVAL_MS = 5_000;

// ---------------------------------------------------------------------------
// Public helpers
// ---------------------------------------------------------------------------

/**
 * Returns the local URI where the APK will be saved.
 * Uses expo-file-system's cacheDirectory as the base.
 */
export function getApkDestinationUri(): string {
  const base = FileSystem.cacheDirectory ?? 'file:///cache/';
  // Ensure base ends with a slash
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  return `${normalizedBase}${APK_SUBPATH}`;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Ensure the parent directory of the destination URI exists. */
async function ensureDirectoryExists(destinationUri: string): Promise<void> {
  // Extract directory path from URI (everything up to the last '/')
  const lastSlash = destinationUri.lastIndexOf('/');
  if (lastSlash <= 0) return;
  const dirUri = destinationUri.substring(0, lastSlash);
  await FileSystem.makeDirectoryAsync(dirUri, { intermediates: true });
}

/** Sleep for the given number of milliseconds. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Main download function
// ---------------------------------------------------------------------------

/**
 * Download an APK from `apkUrl` to the device's cache directory.
 *
 * - Destination: FileSystem.cacheDirectory + 'update/app-update.apk'
 * - Resume: if a partial file already exists, deletes it and restarts (safe fallback)
 * - Progress: emits DownloadState of type 'progress' during download
 * - Size validation: compares actual file size with `expectedSize` from
 *   GitHubReleaseAsset.size; on mismatch deletes file and emits
 *   { type: 'failed', reason: 'checksum_mismatch', retriesLeft: 0 }
 * - Network errors: retries up to maxRetries times with retryIntervalMs delay
 * - Success: emits { type: 'success', filePath: destinationUri }
 *
 * @param apkUrl       - HTTPS URL of the APK from the GitHub Release asset
 * @param expectedSize - Expected file size in bytes from GitHubReleaseAsset.size
 * @param onState      - Callback invoked with each DownloadState update
 * @param maxRetries   - Maximum number of retry attempts (default: 3)
 * @param retryIntervalMs - Milliseconds to wait between retries (default: 5000)
 */
export async function downloadApk(
  apkUrl: string,
  expectedSize: number,
  onState: (state: DownloadState) => void,
  maxRetries: number = DEFAULT_MAX_RETRIES,
  retryIntervalMs: number = DEFAULT_RETRY_INTERVAL_MS,
): Promise<void> {
  const destinationUri = getApkDestinationUri();

  // Ensure the destination directory exists
  try {
    await ensureDirectoryExists(destinationUri);
  } catch {
    // Non-fatal: expo-file-system will create it during download if needed
  }

  let retriesLeft = maxRetries;

  while (true) {
    try {
      // Check if a partial file already exists for resume support (Requirement 5.3)
      let resumeData: string | undefined;
      let existingSize = 0;

      const fileInfo = await FileSystem.getInfoAsync(destinationUri);
      if (fileInfo.exists && fileInfo.size !== undefined && fileInfo.size > 0) {
        existingSize = fileInfo.size;
        // expo-file-system resume data is stored separately; we pass undefined
        // here and rely on the Range header being set via resumeData from a
        // previous DownloadResumable if available. For a fresh resume after
        // app restart, we recreate the resumable without saved state — the
        // server will respond from byte 0 but we handle partial files by
        // checking size. expo-file-system handles Range headers internally
        // when resumeData is provided from a prior pauseAsync() call.
        // Since we don't persist resumeData across sessions, we delete the
        // partial file and restart (safe fallback per Requirement 5.4).
        await FileSystem.deleteAsync(destinationUri, { idempotent: true });
        existingSize = 0;
      }

      // Build the progress callback
      const progressCallback = (
        downloadProgress: FileSystem.DownloadProgressData,
      ) => {
        const total =
          downloadProgress.totalBytesExpectedToWrite > 0
            ? downloadProgress.totalBytesExpectedToWrite
            : expectedSize;
        const percentage =
          total > 0
            ? Math.min(
                100,
                Math.round(
                  (downloadProgress.totalBytesWritten / total) * 100,
                ),
              )
            : 0;

        onState({
          type: 'progress',
          downloadedBytes: downloadProgress.totalBytesWritten,
          totalBytes: total,
          percentage,
        });
      };

      // Create the download resumable
      const downloadResumable = FileSystem.createDownloadResumable(
        apkUrl,
        destinationUri,
        {},
        progressCallback,
        resumeData,
      );

      // Start (or resume) the download
      const result = await downloadResumable.downloadAsync();

      if (!result) {
        // downloadAsync() returned undefined — treat as network error
        throw new Error('Download returned no result');
      }

      // Verify file size matches expected size (Requirements 6.4)
      const downloadedFileInfo = await FileSystem.getInfoAsync(result.uri);
      const actualSize = downloadedFileInfo.size ?? 0;

      if (actualSize !== expectedSize) {
        // Delete corrupted/incomplete file and report failure
        await FileSystem.deleteAsync(result.uri, { idempotent: true });
        onState({
          type: 'failed',
          reason: 'checksum_mismatch',
          retriesLeft: 0,
        });
        return;
      }

      // Success
      onState({ type: 'success', filePath: result.uri });
      return;
    } catch (err: unknown) {
      // Network or I/O error
      if (retriesLeft > 0) {
        retriesLeft -= 1;
        onState({
          type: 'failed',
          reason: 'network_error',
          retriesLeft,
        });
        await sleep(retryIntervalMs);
        // Continue loop to retry
      } else {
        // All retries exhausted
        onState({
          type: 'failed',
          reason: 'network_error',
          retriesLeft: 0,
        });
        return;
      }
    }
  }
}
