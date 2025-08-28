// React Native shim for react-dom
export function flushSync(cb) {
	if (typeof cb === 'function') {
		return cb();
	}
	return undefined;
}

export default { flushSync };

