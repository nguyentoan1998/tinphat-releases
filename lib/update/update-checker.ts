/**
 * Update_Checker — checks for app updates via GitHub Releases API.
 *
 * Requirements: 3.3, 3.4, 3.5, 3.6, 4.1–4.6, 10.1–10.3
 */

import Constants from 'expo-constants';

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

    // Step 2: Check cache
    let release = null;
    const cacheEntry = await getCachedRelease();
    if (cacheEntry !== null && isCacheValid(cacheEntry)) {
      // Cache hit — use cached data, skip API call
      release = cacheEntry.data;
    } else {
      // Step 3: Fetch from GitHub API
      const fetchResult = await fetchLatestRelease(config.github, {
        connectTimeoutMs: config.connectTimeoutMs,
        maxRetries: config.maxRetries,
      });

      // Step 4: Handle fetch errors
      if (!fetchResult.success) {
        switch (fetchResult.error) {
          case 'not_found':
            return { type: 'error', reason: 'no_releases' };

          case 'rate_limited':
            // Try stale cache even if expired
            if (cacheEntry !== null) {
              release = cacheEntry.data;
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
        // Step 5: Update cache on successful fetch
        await setCachedRelease(release);
      }
    }

    // Step 6: Extract APK asset
    const apkAsset = extractApkAsset(release);
    if (apkAsset === null) {
      return { type: 'error', reason: 'no_apk_asset' };
    }

    // Step 7: Get current app version
    const currentVersionString = Constants.expoConfig?.version ?? '0.0.0';

    // Step 8: Parse versions
    const remoteVersion = parseVersion(stripVersionPrefix(release.tag_name));
    const currentVersion = parseVersion(currentVersionString);

    // Step 9: Handle parse failures
    if (remoteVersion === null || currentVersion === null) {
      return { type: 'error', reason: 'malformed_version' };
    }

    // Step 10: Compare versions
    if (isNewerVersion(currentVersion, remoteVersion)) {
      return {
        type: 'update_available',
        remoteVersion: versionToString(remoteVersion),
        apkUrl: apkAsset.browser_download_url,
        releaseNotes: release.body ?? '',
        apkSize: apkAsset.size,
      };
    }

    // Step 11: No update available
    return { type: 'no_update' };
  } catch {
    return { type: 'error', reason: 'fetch_failed' };
  }
}
