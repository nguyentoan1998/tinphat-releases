/**
 * Downloader — wrapper around downloadApk from apk-download-repository.
 *
 * Delegates all retry logic, progress tracking, and file size verification
 * to the underlying repository implementation.
 *
 * Requirements: 3.1, 3.2, 3.5, 3.6, 5.2, 5.3, 5.4
 */

import { DownloadState, UpdateConfig } from './types';
import { downloadApk } from './apk-download-repository';

/**
 * Start downloading the APK.
 * Delegates to downloadApk() which handles retry, progress, and file size validation.
 *
 * @param apkUrl       - HTTPS URL of the APK to download
 * @param expectedSize - Expected file size in bytes from GitHubReleaseAsset.size
 * @param onState      - Callback invoked with each DownloadState update
 * @param config       - Optional config overrides for maxRetries and retryIntervalMs
 */
export async function startDownload(
  apkUrl: string,
  expectedSize: number,
  onState: (state: DownloadState) => void,
  config?: Pick<UpdateConfig, 'maxRetries' | 'retryIntervalMs'>,
): Promise<void> {
  await downloadApk(
    apkUrl,
    expectedSize,
    onState,
    config?.maxRetries,
    config?.retryIntervalMs,
  );
}
