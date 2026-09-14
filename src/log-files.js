const fs = require("node:fs").promises;
const path = require("node:path");

/**
 * Log files are named `<ISO timestamp>_<game code>`, e.g. `2026-08-28T08:30:28.510Z_CSG`.
 * Returns null for anything that does not fit that shape.
 */
function parseLogFilename(filename) {
	const separator = filename.indexOf("_");
	if (separator === -1) {
		return null;
	}

	const timestampPart = filename.slice(0, separator);
	const gameId = filename.slice(separator + 1).trimEnd();
	if (!gameId) {
		return null;
	}

	const timestamp = new Date(timestampPart);
	if (Number.isNaN(timestamp.getTime())) {
		return null;
	}

	return {timestamp, gameId};
}

/**
 * Firestore document ids are already `<ISO timestamp>_<game code>`, so keep only the code
 * and pair it with the timestamp we recorded for the game.
 */
function buildLogFilename(gameId, timestamp) {
	const code = gameId.includes("_") ? gameId.split("_").pop() : gameId;
	return `${timestamp.toISOString()}_${code}`;
}

/**
 * The high-water mark for one source: the newest game already on disk, used to skip
 * everything Firestore has already handed us.
 */
async function findLatestLocalGame(logsDir) {
	let entries;
	try {
		entries = await fs.readdir(logsDir, {withFileTypes: true});
	} catch (error) {
		if (error.code === "ENOENT") {
			return {timestamp: null, gameId: null};
		}
		throw error;
	}

	let latest = null;
	for (const entry of entries) {
		if (!entry.isFile()) {
			continue;
		}
		const parsed = parseLogFilename(entry.name);
		if (parsed && (latest === null || parsed.timestamp.getTime() > latest.timestamp.getTime())) {
			latest = parsed;
		}
	}

	return latest ?? {timestamp: null, gameId: null};
}

async function saveGameLog(logsDir, gameId, timestamp, data) {
	const filename = buildLogFilename(gameId, timestamp);
	await fs.mkdir(logsDir, {recursive: true});
	await fs.writeFile(path.join(logsDir, filename), `${JSON.stringify(data, null, 2)}\n`);
	return filename;
}

module.exports = {parseLogFilename, buildLogFilename, findLatestLocalGame, saveGameLog};
