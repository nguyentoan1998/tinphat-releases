// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Force Hermes-compatible transforms for ALL code (including dev mode)
config.transformer = {
    ...config.transformer,
    unstable_allowRequireContext: true,
    // This ensures Metro applies Hermes-compatible transforms in dev mode
    // Without this, some ES2020+ syntax (optional chaining calls, etc.)
    // may not be transformed and Hermes on-device parser can fail
    getTransformOptions: async () => ({
        transform: {
            experimentalImportSupport: false,
            inlineRequires: true,
        },
    }),
};

module.exports = config;
