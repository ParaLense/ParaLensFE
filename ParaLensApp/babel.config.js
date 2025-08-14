module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'react-native-worklets-core/plugin',
      {
        enableAutoStaticWorklet: true,
      },
    ],
    '@babel/plugin-proposal-optional-chaining',
    '@babel/plugin-proposal-nullish-coalescing-operator',
    [
      'module-resolver',
      {
        root: ['./src'],
        alias: {
          '@root': './',
          '@': './src',
          '@components': './src/components',
          '@hooks': './src/hooks',
          '@app': './src/app',
          '@features': './src/features',
          '@types': './src/types',
          '@utils': './src/utils',
          '@config': './src/config',
          '@lib': './src/lib',
          '@constants': './src/constants',
          '@screens': './src/screens',
          '@navigation': './src/navigation',
        },
      },
    ],
    'react-native-reanimated/plugin', // MUSS das letzte Plugin sein!
  ],
};
