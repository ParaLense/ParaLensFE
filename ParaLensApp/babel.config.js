module.exports = function (api) {
  api.cache(true);

  return {
    presets: [['babel-preset-expo'], 'nativewind/babel'],

    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],

          alias: {
            '@': './',
            'tailwind.config': './tailwind.config.js',
          },
        },
      ],
      // Single worklet runtime: react-native-worklets (shared by Reanimated 4
      // and VisionCamera 5). Must stay last in the plugin list.
      'react-native-worklets/plugin',
    ],
  };
};
