/**
 * Installer — checks install permission and launches the Android package installer.
 *
 * Note: expo-intent-launcher is not available in this project.
 * Falls back to Linking.openURL() for APK installation on Android.
 *
 * Requirements: 4.1, 4.2, 4.3, 5.1
 */

import { Linking, Platform } from 'react-native';
import { InstallResult } from './types';

/**
 * Check if the app can install packages.
 *
 * On iOS: always returns false — APK installation is not supported.
 * On Android: always returns true — the system will prompt the user to grant
 *   REQUEST_INSTALL_PACKAGES permission if it has not been granted yet.
 */
export function canInstallApk(): boolean {
  if (Platform.OS === 'ios') {
    return false;
  }
  // On Android, we always return true. The system handles the permission
  // prompt automatically when the install intent is launched.
  return true;
}

/**
 * Install APK from the given file URI.
 *
 * On Android:
 *   Uses Linking.openURL() to open the APK file with the system package installer.
 *   The OS will prompt the user for REQUEST_INSTALL_PACKAGES permission if needed.
 *
 * On iOS:
 *   Returns { type: 'failed', reason: 'APK installation not supported on iOS' }
 *
 * @param fileUri - Local file URI of the downloaded APK
 *                  (e.g. "file:///data/user/0/.../cache/update/app-update.apk")
 */
export async function installApk(fileUri: string): Promise<InstallResult> {
  if (Platform.OS === 'ios') {
    return { type: 'failed', reason: 'APK installation not supported on iOS' };
  }

  try {
    // Check if the URL can be opened before attempting
    const canOpen = await Linking.canOpenURL(fileUri);
    if (!canOpen) {
      return {
        type: 'failed',
        reason: `Cannot open APK file URI: ${fileUri}. Ensure the file exists and the app has storage permissions.`,
      };
    }

    await Linking.openURL(fileUri);
    return { type: 'launched' };
  } catch (err: unknown) {
    const reason =
      err instanceof Error
        ? err.message
        : `Failed to launch APK installer: ${String(err)}`;
    return { type: 'failed', reason };
  }
}
