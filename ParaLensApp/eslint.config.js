// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const importPlugin = require('eslint-plugin-import');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: {
      import: importPlugin,
    },
    rules: {
      'import/no-restricted-paths': [
        'error',
        {
          zones: [
            // enforce unidirectional architecture: features must not depend on app
            {
              target: './features',
              from: './app',
            },
            // shared modules can be used by app/features but not depend on them
            {
              target: [
                './components',
                './hooks',
                './lib',
                './libs',
                './types',
                './utils',
              ],
              from: ['./features', './app'],
            },
          ],
        },
      ],
    },
  },
]);
