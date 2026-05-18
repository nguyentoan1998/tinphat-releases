/**
 * app.config.js — Dynamic Expo config
 *
 * version và runtimeVersion tự động lấy từ package.json.
 * Khi release version mới, chỉ cần cập nhật "version" trong package.json
 * (hoặc dùng `npm version patch/minor/major`) — tất cả sẽ đồng bộ.
 *
 * Quy trình release:
 * 1. npm version patch   → tăng 1.0.0 → 1.0.1
 * 2. git push + push tag → GitHub Actions build APK
 * 3. App tự phát hiện version mới qua GitHub Releases API
 */

const pkg = require('./package.json');
const version = pkg.version;

/** @type {import('expo/config').ExpoConfig} */
module.exports = {
  expo: {
    name: 'Tín Phát Metech',
    slug: 'stockflow',
    version,                    // ← tự động từ package.json
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    scheme: 'stockflow',
    newArchEnabled: true,
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#0A0F1E',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.tinphat.metech',
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSCameraUsageDescription: 'Ứng dụng cần quyền camera để chụp ảnh nhân viên và CCCD.',
        NSPhotoLibraryUsageDescription: 'Ứng dụng cần quyền truy cập thư viện ảnh để chọn ảnh nhân viên và CCCD.',
        NSPhotoLibraryAddUsageDescription: 'Ứng dụng cần quyền lưu ảnh vào thư viện.',
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#F0F8FF',
      },
      package: 'com.tinphat.metech',
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      permissions: [
        'CAMERA',
        'READ_EXTERNAL_STORAGE',
        'WRITE_EXTERNAL_STORAGE',
        'READ_MEDIA_IMAGES',
        'REQUEST_INSTALL_PACKAGES',
      ],
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: [
      'expo-router',
      'expo-secure-store',
      'expo-notifications',
      [
        'expo-image-picker',
        {
          photosPermission: 'Ứng dụng cần quyền truy cập thư viện ảnh để chọn ảnh nhân viên.',
          cameraPermission: 'Ứng dụng cần quyền camera để chụp ảnh nhân viên và CCCD.',
        },
      ],
      './plugins/rename-apk-plugin',
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      router: {},
      eas: {
        projectId: 'c36c74d5-26e8-494e-ad32-fe48e14462b6',
      },
    },
    runtimeVersion: version,    // ← tự động đồng bộ với version
    updates: {
      url: 'https://u.expo.dev/c36c74d5-26e8-494e-ad32-fe48e14462b6',
    },
  },
};
