/**
 * Expo Config Plugin — đổi tên APK output thành "tinphatapp.apk"
 *
 * Inject applicationVariants vào đúng vị trí trong block android { }
 * của android/app/build.gradle.
 */
const { withAppBuildGradle } = require('@expo/config-plugins');

const RENAME_BLOCK = `
    // Rename APK output to tinphatapp.apk
    android.applicationVariants.all { variant ->
        variant.outputs.all { output ->
            if (outputFileName.endsWith('.apk')) {
                outputFileName = "tinphatapp.apk"
            }
        }
    }
`;

const withRenameApk = (config) => {
  return withAppBuildGradle(config, (mod) => {
    const contents = mod.modResults.contents;

    // Tránh inject trùng
    if (contents.includes('tinphatapp.apk')) {
      return mod;
    }

    // Thêm vào cuối file (sau tất cả các block)
    mod.modResults.contents = contents.trimEnd() + '\n' + RENAME_BLOCK + '\n';

    return mod;
  });
};

module.exports = withRenameApk;
