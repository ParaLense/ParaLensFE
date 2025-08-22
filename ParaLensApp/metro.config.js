const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const path = require('path');

const config = {
	resolver: {
		alias: {
			'react-dom': path.resolve(__dirname, 'src/shims/react-dom'),
		},
		extraNodeModules: {
			'react-dom': path.resolve(__dirname, 'src/shims/react-dom'),
		},
	},
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
