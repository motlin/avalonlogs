const fs = require("node:fs");
const path = require("node:path");

const LOGS_DIR = "logs";
const COLLECTION = "logs";
const AVALON_SERVER_DIR = path.join(process.env.HOME || "", "projects/avalon-online/server");

/**
 * `georgyo-avalon` is the upstream avalongame.online deployment; `avalon-cool` is our own.
 * Each keeps its games in its own Firestore project, so each gets its own credentials and
 * its own logs subdirectory.
 */
const SOURCES = {
	"georgyo-avalon": {
		projectId: "georgyo-avalon",
		collection: COLLECTION,
		credentialEnvVar: "AVALON_CREDENTIALS_GEORGYO_AVALON",
		credentialPaths: [
			path.join(AVALON_SERVER_DIR, "georgyo-avalon-firebase-adminsdk-uewf3-bf74e6c4c1.json"),
			"./firebase-credentials-georgyo-avalon.json",
		],
	},
	"avalon-cool": {
		projectId: "avalon-cool",
		collection: COLLECTION,
		credentialEnvVar: "AVALON_CREDENTIALS_AVALON_COOL",
		credentialPaths: [path.join(AVALON_SERVER_DIR, "firebase-key.json"), "./firebase-credentials-avalon-cool.json"],
	},
};

function listSourceNames() {
	return Object.keys(SOURCES);
}

function getSource(name) {
	const source = SOURCES[name];
	if (!source) {
		throw new Error(`Unknown source "${name}". Known sources: ${listSourceNames().join(", ")}`);
	}
	return {name, ...source};
}

function logsDirFor(name) {
	return path.join(LOGS_DIR, name);
}

function parseArgs(argv) {
	const sources = [];
	let dryRun = false;
	let limit = null;

	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === "--dry-run") {
			dryRun = true;
		} else if (arg === "--source") {
			const value = argv[++i];
			if (!value) {
				throw new Error("--source requires a value");
			}
			getSource(value);
			sources.push(value);
		} else if (arg === "--limit") {
			const value = argv[++i];
			limit = Number(value);
			if (!Number.isInteger(limit) || limit < 1) {
				throw new Error("--limit requires a positive integer");
			}
		} else {
			throw new Error(`Unknown argument "${arg}"`);
		}
	}

	return {sources: sources.length > 0 ? sources : listSourceNames(), dryRun, limit};
}

/**
 * Credentials are looked up per source: an explicit env var first, then the well-known
 * paths. `GOOGLE_APPLICATION_CREDENTIALS` is deliberately not consulted -- it names a
 * single file and we talk to two projects.
 */
function credentialCandidates(source) {
	return [process.env[source.credentialEnvVar], ...source.credentialPaths];
}

function selectCredentialPath(candidates, exists = (p) => fs.existsSync(p)) {
	for (const candidate of candidates) {
		if (candidate && exists(path.resolve(candidate))) {
			return candidate;
		}
	}
	return null;
}

/**
 * A key for the wrong project would silently file one server's games under the other's
 * directory, so treat a mismatch as fatal.
 */
function assertProjectMatches(serviceAccount, expectedProjectId, credentialPath) {
	if (serviceAccount.project_id !== expectedProjectId) {
		throw new Error(
			`Credentials at ${credentialPath} are for project "${serviceAccount.project_id}", but source "${expectedProjectId}" was requested.`,
		);
	}
}

module.exports = {
	LOGS_DIR,
	SOURCES,
	listSourceNames,
	getSource,
	logsDirFor,
	parseArgs,
	credentialCandidates,
	selectCredentialPath,
	assertProjectMatches,
};
