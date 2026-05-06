/**
 * Semantic versioning utilities for the In-App Auto Update feature.
 * Functional style — no classes.
 *
 * Requirements: 2.3, 2.4
 */

import { SemanticVersion } from './types';

/**
 * Parse a version string "major.minor.patch" into a SemanticVersion object.
 * Returns null for any invalid input:
 * - wrong number of segments (not exactly 3)
 * - non-numeric parts
 * - negative numbers
 * - empty string or whitespace-only
 */
export function parseVersion(version: string): SemanticVersion | null {
  if (!version || !version.trim()) return null;

  const parts = version.trim().split('.');
  if (parts.length !== 3) return null;

  const nums = parts.map((p) => {
    // Reject empty segments, leading-zero ambiguity is fine for semver,
    // but non-numeric characters must be rejected.
    if (p === '') return null;
    const n = Number(p);
    // Number('') === 0 but we already guard above; Number('1e2') === 100 which
    // we want to reject — ensure the string is a plain integer.
    if (!Number.isInteger(n)) return null;
    if (n < 0) return null;
    // Reject strings that contain non-digit characters (e.g. "1a", "+1").
    if (!/^\d+$/.test(p)) return null;
    return n;
  });

  if (nums.some((n) => n === null)) return null;

  return {
    major: nums[0] as number,
    minor: nums[1] as number,
    patch: nums[2] as number,
  };
}

/**
 * Compare two SemanticVersion objects.
 * Returns: negative if a < b, 0 if a === b, positive if a > b
 * Priority: major > minor > patch
 */
export function compareVersions(a: SemanticVersion, b: SemanticVersion): number {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  return a.patch - b.patch;
}

/**
 * Returns true if remote is strictly newer than current.
 */
export function isNewerVersion(
  current: SemanticVersion,
  remote: SemanticVersion,
): boolean {
  return compareVersions(remote, current) > 0;
}

/**
 * Convert SemanticVersion back to string "major.minor.patch"
 */
export function versionToString(v: SemanticVersion): string {
  return `${v.major}.${v.minor}.${v.patch}`;
}

/**
 * Strip a leading "v" or "V" prefix from a version string before parsing.
 * If no such prefix is present, the string is returned unchanged.
 *
 * Examples:
 *   "v1.2.3" → "1.2.3"
 *   "V1.2.3" → "1.2.3"
 *   "1.2.3"  → "1.2.3"
 *
 * Requirements: 4.6
 */
export function stripVersionPrefix(version: string): string {
  if (version.startsWith('v') || version.startsWith('V')) {
    return version.slice(1);
  }
  return version;
}
