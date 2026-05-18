/**
 * Barrel file for the in-app auto-update feature module.
 * Re-exports all public types and interfaces so consumers can import from
 * a single entry point: `import { UpdateConfig, checkForUpdate } from '@/lib/update'`
 */

export type {
  SemanticVersion,
  UpdateConfig,
  UpdateSession,
  UpdateCheckError,
  DownloadError,
  UpdateCheckResult,
  DownloadState,
  InstallResult,
  UpdateUiState,
} from './types';

// GitHub API types
export type {
  GitHubApiConfig,
  GitHubRelease,
  GitHubReleaseAsset,
  ReleaseCacheEntry,
  FetchReleaseResult,
} from './github-types';

// Semantic versioning utilities
export {
  parseVersion,
  compareVersions,
  isNewerVersion,
  versionToString,
  stripVersionPrefix,
} from './semantic-version';

// Data layer — GitHub API client
export { fetchLatestRelease, extractApkAsset } from './github-api-client';

// Data layer — Release cache
export { getCachedRelease, setCachedRelease, isCacheValid, clearCache } from './release-cache';

// Data layer — APK download repository
export { downloadApk, getApkDestinationUri } from './apk-download-repository';

// Domain layer — Update checker
export { checkForUpdate } from './update-checker';

// Domain layer — Downloader
export { startDownload } from './downloader';

// Domain layer — Installer
export { canInstallApk, installApk } from './installer';

// React hook — Update flow manager
export { useUpdate } from './use-update';
export type { UseUpdateReturn } from './use-update';

// Default configuration
export { DEFAULT_UPDATE_CONFIG, createUpdateConfig } from './update-config';
