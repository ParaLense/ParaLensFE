const path = require('path');

module.exports = {
  presets: ['module:metro-react-native-babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['./src'],
        extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
        alias: {
          '@root': path.resolve(__dirname),
          '@': path.resolve(__dirname, 'src'),
          '@components': path.resolve(__dirname, 'src', 'components'),
          '@hooks': path.resolve(__dirname, 'src', 'hooks'),
          '@app': path.resolve(__dirname, 'src', 'app'),
          '@features': path.resolve(__dirname, 'src', 'features'),
          '@types': path.resolve(__dirname, 'src', 'types'),
          '@utils': path.resolve(__dirname, 'src', 'utils'),
          '@config': path.resolve(__dirname, 'src', 'config'),
          '@lib': path.resolve(__dirname, 'src', 'lib'),
        },
      },
    ],
    [
      'module:react-native-dotenv',
      {
        moduleName: '@env',
        path: './.env',
      },
    ],
  ],
};
