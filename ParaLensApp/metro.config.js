const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const exclusionList = require('metro-config/src/defaults/exclusionList');

const config = getDefaultConfig(__dirname);

// react-native-worklets (shared by Reanimated 4 and VisionCamera 5) needs
// inlineRequires enabled, otherwise its module init pipeline breaks with
// "TurboModule method installTurboModule called with 0 arguments". Expo disables
// inlineRequires by default, so turn it back on here.
config.transformer = {
  ...config.transformer,
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: true,
    },
  }),
};

// Configure resolver to handle xlsx properly
config.resolver = {
  ...config.resolver,
  sourceExts: [...(config.resolver?.sourceExts || []), 'cjs'],
  // Don't watch native build output — it spawns thousands of file watchers
  // and trips the inotify limit (ENOSPC) on Linux.
  blockList: exclusionList([
    /\/android\/build\/.*/,
    /\/android\/\.gradle\/.*/,
    /\/android\/app\/build\/.*/,
    /\/android\/[^/]+\/build\/.*/,
    /\/ios\/build\/.*/,
    /\/ios\/Pods\/.*/,
  ]),
};

module.exports = withNativeWind(config, { input: './global.css' });
