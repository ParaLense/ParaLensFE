module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    'plugin:react/recommended',
    'airbnb',
    'plugin:prettier/recommended',
    'plugin:jest/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 12,
    sourceType: 'module',
  },
  plugins: ['react', '@typescript-eslint', 'prettier', 'jest'],
  rules: {
    '@typescript-eslint/no-shadow': ['error'],
    'no-shadow': 'off',
    'no-undef': 'off',
    'react/require-default-props': 'off',
    'react/jsx-props-no-spreading': 'off',
    'no-return-await': 'off',
    'no-nested-ternary': 'off',
    'no-plusplus': 'off',
    'no-unused-vars': 'off',
    'import/no-unresolved': 'off',
    'prettier/prettier': 'error',
    'no-use-before-define': 'off',
    'react/function-component-definition': [
      2,
      {namedComponents: 'arrow-function'},
    ],
    'react/jsx-filename-extension': [
      'error',
      {extensions: ['.js', '.ts', '.jsx', '.tsx']},
    ],
    'react/prop-types': 'off',
    'import/extensions': [
      'error',
      {extensions: ['.js', '.ts', '.jsx', '.tsx']},
    ],
    'import/prefer-default-export': 'off',
    'jest/expect-expect': [
      'off',
      {assertFunctionNames: ['expect', 'fc.assert']},
    ],
  },
  settings: {
    'import/resolver': {
      node: {
        extensions: ['.js', '.ts', '.jsx', '.tsx'],
      },
    },
  },
};
