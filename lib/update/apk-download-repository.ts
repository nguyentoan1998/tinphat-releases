/**
 * ApkDownloadRepository — downloads an APK from a GitHub Release.
 *
 * Uses expo-file-system/legacy API for compatibility with Expo 54.
 * Adds required headers for GitHub Release asset download.
 *
 * Requirements: 3.1, 3.2, 5.2, 5.3, 5.4, 6.1–6.7
 */

import * as FileSystem from 'expo-file-system/legacy';
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
 */
export function getApkDestinationUri(): string {
  const base = FileSystem.cacheDirectory ?? 'file:///cache/';
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  return `${normalizedBase}${APK_SUBPATH}`;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function ensureDirectoryExists(destinationUri: string): Promise<void> {
  const lastSlash = destinationUri.lastIndexOf('/');
  if (lastSlash <= 0) return;
  const dirUri = destinationUri.substring(0, lastSlash);
  await FileSystem.makeDirectoryAsync(dirUri, { intermediates: true });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Main download function
// ---------------------------------------------------------------------------

export async function downloadApk(
  apkUrl: string,
  expectedSize: number,
  onState: (state: DownloadState) => void,
  maxRetries: number = DEFAULT_MAX_RETRIES,
  retryIntervalMs: number = DEFAULT_RETRY_INTERVAL_MS,
): Promise<void> {
  const destinationUri = getApkDestinationUri();

  try {
    await ensureDirectoryExists(destinationUri);
  } catch {
    // Non-fatal
  }

  let retriesLeft = maxRetries;

  while (true) {
    try {
      // Delete any partial file from previous attempt
      const fileInfo = await FileSystem.getInfoAsync(destinationUri);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(destinationUri, { idempotent: true });
      }

      // Progress callback
      const progressCallback = (downloadProgress: FileSystem.DownloadProgressData) => {
        const total =
          downloadProgress.totalBytesExpectedToWrite > 0
            ? downloadProgress.totalBytesExpectedToWrite
            : expectedSize;
        const percentage =
          total > 0
            ? Math.min(100, Math.round((downloadProgress.totalBytesWritten / total) * 100))
            : 0;

        onState({
          type: 'progress',
          downloadedBytes: downloadProgress.totalBytesWritten,
          totalBytes: total,
          percentage,
        });
      };

      // GitHub Release assets require these headers to avoid redirect issues
      const headers: Record<string, string> = {
        Accept: 'application/octet-stream',
        'User-Agent': 'TinPhatApp/1.0',
      };

      const downloadResumable = FileSystem.createDownloadResumable(
        apkUrl,
        destinationUri,
        { headers },
        progressCallback,
      );

      const result = await downloadResumable.downloadAsync();

      if (!result) {
        throw new Error('Download returned no result');
      }

      // Verify HTTP status — GitHub may return 302 redirect page as HTML on bad headers
      if (result.status && result.status !== 200) {
        throw new Error(`Unexpected HTTP status: ${result.status}`);
      }

      // Verify file size
      const downloadedFileInfo = await FileSystem.getInfoAsync(result.uri);
      const actualSize = (downloadedFileInfo as any).size ?? 0;

      // Allow ±1KB tolerance for size mismatch (some servers report slightly different sizes)
      if (expectedSize > 0 && Math.abs(actualSize - expectedSize) > 1024) {
        await FileSystem.deleteAsync(result.uri, { idempotent: true });
        onState({ type: 'failed', reason: 'checksum_mismatch', retriesLeft: 0 });
        return;
      }

      onState({ type: 'success', filePath: result.uri });
      return;
    } catch (err: unknown) {
      if (retriesLeft > 0) {
        retriesLeft -= 1;
        onState({ type: 'failed', reason: 'network_error', retriesLeft });
        await sleep(retryIntervalMs);
      } else {
        onState({ type: 'failed', reason: 'network_error', retriesLeft: 0 });
        return;
      }
    }
  }
}
