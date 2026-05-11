/**
 * Installer — launches the Android package installer for APK installation.
 *
 * Uses expo-intent-launcher to fire the ACTION_VIEW intent with the correct
 * MIME type, which opens the system package installer directly (not share sheet).
 *
 * Requirements: 4.1, 4.2, 4.3, 5.1
 */

import { Platform } from 'react-native';
import * as IntentLauncher from 'expo-intent-launcher';
import * as FileSystem from 'expo-file-system/legacy';
import { InstallResult } from './types';

/**
 * Check if the app can install packages.
 * On iOS: always false. On Android: always true (system handles permission prompt).
 */
export function canInstallApk(): boolean {
  return Platform.OS === 'android';
}

/**
 * Install APK from the given file URI using Android package installer.
 *
 * Converts the file:// URI to a content:// URI via expo-file-system
 * (required for Android 7+), then fires ACTION_VIEW with APK MIME type.
 *
 * @param fileUri - Local file URI (e.g. "file:///data/.../cache/update/app-update.apk")
 */
export async function installApk(fileUri: string): Promise<InstallResult> {
  if (Platform.OS === 'ios') {
    return { type: 'failed', reason: 'APK installation not supported on iOS' };
  }

  try {
    // Convert file:// URI to content:// URI for Android 7+ compatibility
    const contentUri = await FileSystem.getContentUriAsync(fileUri);

    await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
      data: contentUri,
      flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
      type: 'application/vnd.android.package-archive',
    });

    return { type: 'launched' };
  } catch (err: unknown) {
    const reason =
      err instanceof Error
        ? err.message
        : `Không thể mở trình cài đặt: ${String(err)}`;
    return { type: 'failed', reason };
  }
}
