/**
 * GitHub Releases API types for the auto-update feature.
 * Requirements: 3.3, 4.6, 8.2, 8.5
 */

// ---------------------------------------------------------------------------
// GitHubApiConfig — configuration for GitHub API access
// ---------------------------------------------------------------------------

export interface GitHubApiConfig {
  /** GitHub username or organization name */
  owner: string;
  /** Repository name */
  repo: string;
  /** Optional GitHub Personal Access Token for private repos */
  token?: string;
}

// ---------------------------------------------------------------------------
// GitHubReleaseAsset — a single asset attached to a GitHub Release
// ---------------------------------------------------------------------------

export interface GitHubReleaseAsset {
  id: number;
  /** Filename, e.g. "app-v1.2.3-release.apk" */
  name: string;
  /** MIME type, e.g. "application/vnd.android.package-archive" */
  content_type: string;
  /** File size in bytes */
  size: number;
  /** Direct download URL */
  browser_download_url: string;
  /** Upload state — "uploaded" when complete */
  state: string;
}

// ---------------------------------------------------------------------------
// GitHubRelease — a GitHub Release object from the API
// ---------------------------------------------------------------------------

export interface GitHubRelease {
  id: number;
  /** Version tag, e.g. "v1.2.3" */
  tag_name: string;
  /** Release title */
  name: string;
  /** Release notes in markdown */
  body: string;
  /** True if this is a draft release */
  draft: boolean;
  /** True if this is a pre-release */
  prerelease: boolean;
  /** ISO 8601 publish timestamp */
  published_at: string;
  assets: GitHubReleaseAsset[];
}

// ---------------------------------------------------------------------------
// ReleaseCacheEntry — AsyncStorage cache entry
// ---------------------------------------------------------------------------

export interface ReleaseCacheEntry {
  data: GitHubRelease;
  /** Date.now() at time of caching */
  timestamp: number;
}

// ---------------------------------------------------------------------------
// FetchReleaseResult — discriminated union returned by GitHub_API_Client
// ---------------------------------------------------------------------------

export type FetchReleaseResult =
  | { success: true; data: GitHubRelease; fromCache: boolean }
  | {
      success: false;
      error: 'not_found' | 'rate_limited' | 'network_error' | 'parse_error' | 'config_error';
      /** Name of the missing required field, if applicable */
      missingField?: string;
    };
