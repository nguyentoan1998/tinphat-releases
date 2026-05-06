/**
 * AsyncStorage caching layer for GitHub Release data.
 * Requirements: 3.5, 10.2, 10.3
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import { GitHubRelease, ReleaseCacheEntry } from './github-types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CACHE_KEY = '@update_cache/latest_release';

/** Cache TTL: 24 hours in milliseconds */
const CACHE_TTL_MS = 86_400_000;

// ---------------------------------------------------------------------------
// getCachedRelease
// ---------------------------------------------------------------------------

/**
 * Reads the cached GitHub Release entry from AsyncStorage.
 * Returns null if no entry exists or if the stored value cannot be parsed.
 */
export async function getCachedRelease(): Promise<ReleaseCacheEntry | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (raw === null) {
      return null;
    }
    const parsed = JSON.parse(raw) as ReleaseCacheEntry;
    return parsed;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// setCachedRelease
// ---------------------------------------------------------------------------

/**
 * Persists a GitHub Release to AsyncStorage with the current timestamp.
 * Silently swallows any storage errors.
 */
export async function setCachedRelease(data: GitHubRelease): Promise<void> {
  try {
    const entry: ReleaseCacheEntry = {
      data,
      timestamp: Date.now(),
    };
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    // Silently swallow errors — caching is best-effort
  }
}

// ---------------------------------------------------------------------------
// isCacheValid
// ---------------------------------------------------------------------------

/**
 * Returns true if the cache entry is still within the 24-hour TTL window.
 *
 * @param entry   - The cache entry to validate.
 * @param nowMs   - Current time in milliseconds (defaults to Date.now()).
 */
export function isCacheValid(entry: ReleaseCacheEntry, nowMs: number = Date.now()): boolean {
  return nowMs - entry.timestamp < CACHE_TTL_MS;
}

// ---------------------------------------------------------------------------
// clearCache
// ---------------------------------------------------------------------------

/**
 * Removes the cached release entry from AsyncStorage.
 * Silently swallows any storage errors.
 */
export async function clearCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CACHE_KEY);
  } catch {
    // Silently swallow errors
  }
}
