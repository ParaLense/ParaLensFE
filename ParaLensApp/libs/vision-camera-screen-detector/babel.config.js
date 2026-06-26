module.exports = {
  overrides: [
    {
      exclude: /\/node_modules\//,
      presets: ['module:react-native-builder-bob/babel-preset'],
      // performScan() is a VisionCamera worklet (runs on the camera worklet
      // thread). Without the worklets plugin transforming this library's source,
      // it stays a plain function and the frame processor throws
      // "Tried to synchronously call a non-worklet function on the UI thread".
      plugins: ['react-native-worklets/plugin'],
    },
    {
      include: /\/node_modules\//,
      presets: ['module:@react-native/babel-preset'],
    },
  ],
};
