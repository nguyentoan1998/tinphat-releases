/**
 * GitHub_API_Client — fetches the latest GitHub Release via the GitHub Releases API.
 *
 * Requirements: 3.1, 3.2, 3.4, 3.5, 3.6, 3.7, 8.4
 */

import axios from 'axios';

import {
  GitHubApiConfig,
  GitHubRelease,
  GitHubReleaseAsset,
  FetchReleaseResult,
} from './github-types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GITHUB_API_BASE = 'https://api.github.com';
const DEFAULT_CONNECT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_RETRIES = 3;

/** Exponential backoff delays in ms: attempt 1 → 1000ms, 2 → 2000ms, 3 → 4000ms */
const RETRY_DELAYS_MS = [1_000, 2_000, 4_000];

// ---------------------------------------------------------------------------
// fetchLatestRelease
// ---------------------------------------------------------------------------

/**
 * Fetches the latest GitHub Release for the given repository.
 *
 * - Validates config: returns `config_error` immediately if `owner` or `repo` is missing.
 * - Adds `Authorization` header if `config.token` is provided.
 * - Retries on network errors up to `maxRetries` times with exponential backoff.
 * - Returns `not_found` on 404, `rate_limited` on 403, `network_error` after exhausted retries.
 */
export async function fetchLatestRelease(
  config: GitHubApiConfig,
  options?: { connectTimeoutMs?: number; maxRetries?: number },
): Promise<FetchReleaseResult> {
  // Validate required config fields
  if (!config.owner) {
    return { success: false, error: 'config_error', missingField: 'owner' };
  }
  if (!config.repo) {
    return { success: false, error: 'config_error', missingField: 'repo' };
  }

  const connectTimeoutMs = options?.connectTimeoutMs ?? DEFAULT_CONNECT_TIMEOUT_MS;
  const maxRetries = options?.maxRetries ?? DEFAULT_MAX_RETRIES;

  const url = `${GITHUB_API_BASE}/repos/${config.owner}/${config.repo}/releases/latest`;

  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
  };

  if (config.token) {
    headers['Authorization'] = `token ${config.token}`;
  }

  let lastNetworkError: unknown = null;

  // Initial attempt + up to maxRetries retries
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    // Apply exponential backoff delay before retry attempts (not before the first attempt)
    if (attempt > 0) {
      const delayMs = RETRY_DELAYS_MS[attempt - 1] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1];
      await sleep(delayMs);
    }

    try {
      const response = await axios.get<GitHubRelease>(url, {
        timeout: connectTimeoutMs,
        headers,
        // Don't throw on non-2xx so we can handle status codes ourselves
        validateStatus: () => true,
      });

      const { status, data } = response;

      if (status === 200) {
        return { success: true, data, fromCache: false };
      }

      if (status === 404) {
        return { success: false, error: 'not_found' };
      }

      if (status === 403) {
        return { success: false, error: 'rate_limited' };
      }

      // 5xx or other unexpected status — treat as network error and retry
      lastNetworkError = new Error(`Unexpected HTTP status: ${status}`);
    } catch (err: unknown) {
      // Network-level errors (timeout, ENOTFOUND, etc.) — retry
      lastNetworkError = err;
    }
  }

  // All attempts exhausted
  return { success: false, error: 'network_error' };
}

// ---------------------------------------------------------------------------
// extractApkAsset
// ---------------------------------------------------------------------------

/**
 * Finds the first APK asset in a GitHub Release that is fully uploaded.
 *
 * An asset qualifies if:
 *   - `state === 'uploaded'`  AND
 *   - `name.endsWith('.apk')` OR `content_type === 'application/vnd.android.package-archive'`
 *
 * Returns `null` if no qualifying asset is found.
 *
 * Requirements: 3.6
 */
export function extractApkAsset(release: GitHubRelease): GitHubReleaseAsset | null {
  for (const asset of release.assets) {
    if (
      asset.state === 'uploaded' &&
      (asset.name.endsWith('.apk') ||
        asset.content_type === 'application/vnd.android.package-archive')
    ) {
      return asset;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
