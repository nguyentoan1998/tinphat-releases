/**
 * Types and interfaces for the GitHub Release Auto Update feature.
 * Requirements: 3.3, 4.6, 8.2, 8.5
 */

import { GitHubApiConfig } from './github-types';

// ---------------------------------------------------------------------------
// SemanticVersion — structured representation for semver comparison
// ---------------------------------------------------------------------------

/**
 * Decomposed semantic version triple.
 * Use SemanticVersion helpers (parse / compare) in the domain layer.
 */
export type SemanticVersion = {
  major: number;
  minor: number;
  patch: number;
};

// ---------------------------------------------------------------------------
// UpdateConfig — runtime configuration for the update feature
// ---------------------------------------------------------------------------

/**
 * Configuration passed to UpdateChecker and Downloader at initialisation time.
 */
export interface UpdateConfig {
  /** GitHub repository configuration (owner, repo, optional token) */
  github: GitHubApiConfig;
  /** HTTP connect timeout in milliseconds (default: 10 000) */
  connectTimeoutMs?: number;
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Delay between retry attempts in milliseconds (default: 5 000) */
  retryIntervalMs?: number;
}

// ---------------------------------------------------------------------------
// UpdateSession — in-memory session state to avoid repeated dialogs
// ---------------------------------------------------------------------------

/**
 * Tracks which version the user has dismissed in the current app session.
 * Persisted only in memory — resets on app restart.
 */
export interface UpdateSession {
  /** The Remote_Version string the user dismissed; undefined if none dismissed yet */
  dismissedVersion?: string;
}

// ---------------------------------------------------------------------------
// Error enums
// ---------------------------------------------------------------------------

/**
 * Reasons why an update check can fail.
 * Requirements: 3.4, 3.5, 8.5
 */
export type UpdateCheckError =
  | 'no_network'
  | 'no_releases'       // 404 — no releases found
  | 'rate_limited'      // 403 — rate limited with no cache available
  | 'no_apk_asset'      // Release exists but has no APK asset
  | 'fetch_failed'
  | 'malformed_version';

/**
 * Reasons why a download can fail.
 * Requirements: 6.5
 */
export type DownloadError =
  | 'network_error'
  | 'checksum_mismatch'
  | 'disk_full'
  | 'unknown';

// ---------------------------------------------------------------------------
// UpdateCheckResult — discriminated union returned by UpdateChecker
// ---------------------------------------------------------------------------

/**
 * Result of a single update check cycle.
 * Requirements: 3.3, 4.3, 4.4
 */
export type UpdateCheckResult =
  | { type: 'no_update' }
  | {
      type: 'update_available';
      remoteVersion: string;
      apkUrl: string;
      /** Release notes from GitHubRelease.body (markdown) */
      releaseNotes: string;
      /** APK file size in bytes from GitHubReleaseAsset.size */
      apkSize: number;
    }
  | { type: 'error'; reason: UpdateCheckError };

// ---------------------------------------------------------------------------
// DownloadState — discriminated union emitted by Downloader
// ---------------------------------------------------------------------------

/**
 * Represents the current state of an APK download.
 * Requirements: 6.2, 6.5, 6.7
 */
export type DownloadState =
  | {
      type: 'progress';
      downloadedBytes: number;
      totalBytes: number;
      /** Integer percentage 0–100 */
      percentage: number;
    }
  | { type: 'success'; filePath: string }
  | { type: 'failed'; reason: DownloadError; retriesLeft: number }
  | { type: 'paused' };

// ---------------------------------------------------------------------------
// InstallResult — discriminated union returned by Installer
// ---------------------------------------------------------------------------

/**
 * Result of attempting to launch the Android package installer.
 * Requirements: 7.1, 7.5
 */
export type InstallResult =
  | { type: 'launched' }
  | { type: 'failed'; reason: string };

// ---------------------------------------------------------------------------
// UpdateUiState — discriminated union driving the UI layer
// ---------------------------------------------------------------------------

/**
 * All possible states of the update UI, consumed by UpdateViewModel observers.
 * Requirements: 5.1, 5.2, 6.2, 6.7, 7.1
 */
export type UpdateUiState =
  | 'idle'
  | 'checking'
  | {
      type: 'update_available';
      version: string;
      apkUrl: string;
      /** Release notes from GitHub Release body (markdown) */
      releaseNotes: string;
      /** APK file size in bytes */
      apkSize: number;
    }
  | { type: 'downloading'; progress: number }
  | { type: 'ready_to_install'; filePath: string }
  | { type: 'error'; message: string; canRetry: boolean }
  | 'no_update';
