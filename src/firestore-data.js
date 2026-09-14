/**
 * Firestore hands back class instances that JSON.stringify would flatten badly.
 * The classes are injected so this stays testable without a live Firestore.
 */
function createConverter({Timestamp, DocumentReference}) {
	return function convert(data) {
		if (data === null || data === undefined) {
			return data;
		}

		if (data instanceof Timestamp) {
			return {_seconds: data.seconds, _nanoseconds: data.nanoseconds};
		}

		if (data instanceof DocumentReference) {
			return data.path;
		}

		if (Array.isArray(data)) {
			return data.map((item) => convert(item));
		}

		if (typeof data === "object") {
			const result = {};
			for (const [key, value] of Object.entries(data)) {
				result[key] = convert(value);
			}
			return result;
		}

		return data;
	};
}

module.exports = {createConverter};
