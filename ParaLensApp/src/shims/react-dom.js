// ESM-compatible shim for react-dom in React Native
export function flushSync(cb) {
	if (typeof cb === 'function') {
		return cb();
	}
	return undefined;
}

export default { flushSync };

