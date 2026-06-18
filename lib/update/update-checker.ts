/**
 * Update_Checker — checks for app updates via GitHub Releases API.
 *
 * Requirements: 3.3, 3.4, 3.5, 3.6, 4.1–4.6, 10.1–10.3
 */

import Constants from 'expo-constants';
import * as Application from 'expo-application';

import { fetchLatestRelease, extractApkAsset } from './github-api-client';
import { getCachedRelease, setCachedRelease, isCacheValid } from './release-cache';
import { stripVersionPrefix, parseVersion, isNewerVersion, versionToString } from './semantic-version';
import { UpdateCheckResult, UpdateConfig } from './types';

export async function checkForUpdate(config: UpdateConfig): Promise<UpdateCheckResult> {
  try {
    // Step 1: Validate config
    if (!config.github?.owner || !config.github?.repo) {
      console.error('[UpdateChecker] Invalid config: github.owner and github.repo are required');
      return { type: 'error', reason: 'fetch_failed' };
    }

    // Step 2: Log current version for diagnostics
    // Sử dụng Application.nativeApplicationVersion (đọc từ Android versionName) làm nguồn chính
    // vì Constants.expoConfig.version trong production build có thể trả về version từ EAS Update
    // manifest thay vì native APK version, gây ra bug hiển thị update sai sau khi cài APK mới.
    const currentVersionString = Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? '0.0.0';
    console.log(`[UpdateChecker] Current app version: ${currentVersionString}, GitHub config: ${config.github.owner}/${config.github.repo}`);

    // Step 3: Check cache
    let release = null;
    const cacheEntry = await getCachedRelease();
    if (cacheEntry !== null && isCacheValid(cacheEntry)) {
      // Cache hit — use cached data, skip API call
      release = cacheEntry.data;
      console.log('[UpdateChecker] Using cached release data');
    } else {
      // Step 4: Fetch from GitHub API
      console.log('[UpdateChecker] Fetching latest release from GitHub API...');
      const fetchResult = await fetchLatestRelease(config.github, {
        connectTimeoutMs: config.connectTimeoutMs,
        maxRetries: config.maxRetries,
      });

      // Step 5: Handle fetch errors
      if (!fetchResult.success) {
        console.error(`[UpdateChecker] GitHub API fetch failed: ${fetchResult.error}${fetchResult.missingField ? ` (missing: ${fetchResult.missingField})` : ''}`);
        switch (fetchResult.error) {
          case 'not_found':
            return { type: 'error', reason: 'no_releases' };

          case 'rate_limited':
            // Try stale cache even if expired
            if (cacheEntry !== null) {
              release = cacheEntry.data;
              console.log('[UpdateChecker] Using stale cache due to rate limit');
            } else {
              return { type: 'error', reason: 'rate_limited' };
            }
            break;

          case 'network_error':
            return { type: 'error', reason: 'no_network' };

          case 'config_error':
            return { type: 'error', reason: 'fetch_failed' };

          case 'parse_error':
            return { type: 'error', reason: 'fetch_failed' };

          default:
            return { type: 'error', reason: 'fetch_failed' };
        }
      } else {
        release = fetchResult.data;
        console.log(`[UpdateChecker] GitHub API success — tag: ${release.tag_name}, assets: ${release.assets.length}`);
        // Step 6: Update cache on successful fetch
        await setCachedRelease(release);
      }
    }

    // Step 7: Extract APK asset
    const apkAsset = extractApkAsset(release);
    if (apkAsset === null) {
      console.error('[UpdateChecker] No APK asset found in release');
      return { type: 'error', reason: 'no_apk_asset' };
    }
    console.log(`[UpdateChecker] Found APK asset: ${apkAsset.name} (${(apkAsset.size / (1024 * 1024)).toFixed(1)} MB)`);

    // Step 8: Parse versions
    const remoteVersion = parseVersion(stripVersionPrefix(release.tag_name));
    const currentVersion = parseVersion(currentVersionString);

    // Step 9: Handle parse failures
    if (remoteVersion === null) {
      console.error(`[UpdateChecker] Failed to parse remote version: ${release.tag_name}`);
      return { type: 'error', reason: 'malformed_version' };
    }
    if (currentVersion === null) {
      console.error(`[UpdateChecker] Failed to parse current version: ${currentVersionString}`);
      return { type: 'error', reason: 'malformed_version' };
    }

    console.log(`[UpdateChecker] Remote: ${versionToString(remoteVersion)}, Current: ${versionToString(currentVersion)}`);

    // Step 10: Compare versions
    if (isNewerVersion(currentVersion, remoteVersion)) {
      console.log('[UpdateChecker] Update available!');
      return {
        type: 'update_available',
        remoteVersion: versionToString(remoteVersion),
        apkUrl: apkAsset.browser_download_url,
        releaseNotes: release.body ?? '',
        apkSize: apkAsset.size,
      };
    }

    // Step 11: No update available
    console.log('[UpdateChecker] No update available — app is up to date');
    return { type: 'no_update' };
  } catch (err) {
    console.error('[UpdateChecker] Unexpected error:', err);
    return { type: 'error', reason: 'fetch_failed' };
  }
}
