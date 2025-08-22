// Minimal shim for React Native to satisfy libraries importing react-dom APIs
// Only export the members actually referenced in dependencies.

export function flushSync<T>(fn?: () => T): T | void {
	// In React Native, there's no DOM; run the callback immediately if provided.
	if (typeof fn === 'function') {
		return fn();
	}
	return undefined;
}

export default {
	flushSync,
};


