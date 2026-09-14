const admin = require("firebase-admin");
const fs = require("node:fs").promises;
const path = require("node:path");
const {createConverter} = require("./firestore-data");
const {findLatestLocalGame, saveGameLog} = require("./log-files");
const {isAgentRoster, playerNamesOf} = require("./test-games");
const {
	assertProjectMatches,
	credentialCandidates,
	getSource,
	logsDirFor,
	parseArgs,
	selectCredentialPath,
} = require("./sources");

const colors = {reset: "\x1b[0m", red: "\x1b[31m", green: "\x1b[32m", blue: "\x1b[34m", yellow: "\x1b[33m"};

function log(message, color = null) {
	console.log(color && colors[color] ? `${colors[color]}${message}${colors.reset}` : message);
}

const convertFirestoreData = createConverter({
	Timestamp: admin.firestore.Timestamp,
	DocumentReference: admin.firestore.DocumentReference,
});

async function connect(source) {
	const credentialPath = selectCredentialPath(credentialCandidates(source));
	if (!credentialPath) {
		throw new Error(
			`No credentials found for source "${source.name}". Set ${source.credentialEnvVar} to a service account key for project "${source.projectId}".`,
		);
	}

	const resolved = path.resolve(credentialPath);
	const serviceAccount = JSON.parse(await fs.readFile(resolved, "utf8"));
	assertProjectMatches(serviceAccount, source.projectId, resolved);
	log(`  credentials: ${resolved}`, "blue");

	// Each source is a separate Firestore project, so each needs its own named app.
	const app = admin.initializeApp(
		{credential: admin.credential.cert(serviceAccount), projectId: source.projectId},
		source.name,
	);
	return app.firestore();
}

async function findNewGames(db, source, latestTimestamp, limit) {
	let query = db.collection(source.collection).orderBy("timeCreated", "asc");

	if (latestTimestamp) {
		query = query.where("timeCreated", ">", latestTimestamp);
	}
	if (limit) {
		query = query.limit(limit);
	}

	const snapshot = await query.select("timeCreated").get();
	const games = [];
	snapshot.forEach((doc) => {
		const timeCreated = doc.data().timeCreated;
		games.push({id: doc.id, timestamp: timeCreated ? timeCreated.toDate() : new Date()});
	});
	return games;
}

async function fetchSource(name, {dryRun, limit}) {
	const source = getSource(name);
	const logsDir = logsDirFor(name);
	log(`\n=== ${name} (${logsDir}) ===`, "blue");

	const {timestamp: latestTimestamp, gameId: latestGameId} = await findLatestLocalGame(logsDir);
	if (latestTimestamp) {
		log(`  latest local game: ${latestGameId} at ${latestTimestamp.toISOString()}`);
	} else {
		log("  no local games yet, fetching everything");
	}

	const db = await connect(source);
	const newGames = await findNewGames(db, source, latestTimestamp, limit);

	if (newGames.length === 0) {
		log("  ✓ no new games", "green");
		return {name, downloaded: 0, failed: 0};
	}

	log(`  found ${newGames.length} new games`, "green");

	if (dryRun) {
		for (const game of newGames.slice(0, 10)) {
			console.log(`    ${game.id} (${game.timestamp.toISOString()})`);
		}
		if (newGames.length > 10) {
			console.log(`    ... and ${newGames.length - 10} more`);
		}
		return {name, downloaded: 0, failed: 0, dryRun: true};
	}

	let downloaded = 0;
	let failed = 0;
	let skipped = 0;
	for (let i = 0; i < newGames.length; i++) {
		const game = newGames[i];
		process.stdout.write(`  [${i + 1}/${newGames.length}] ${game.id}...`);
		try {
			const doc = await db.collection(source.collection).doc(game.id).get();
			if (!doc.exists) {
				console.log(" ✗ no data");
				failed++;
			} else if (isAgentRoster(playerNamesOf(doc.data()))) {
				// The roster is only visible once the document is read, so these are
				// fetched and then dropped rather than excluded by the query.
				console.log(" – skipped, agent test game");
				skipped++;
			} else {
				await saveGameLog(logsDir, game.id, game.timestamp, convertFirestoreData(doc.data()));
				console.log(" ✓");
				downloaded++;
			}
		} catch (error) {
			console.log(` ✗ ${error.message}`);
			failed++;
		}
		// Small delay to be nice to the API
		await new Promise((resolve) => setTimeout(resolve, 50));
	}

	return {name, downloaded, failed, skipped};
}

async function main(argv = process.argv.slice(2)) {
	const options = parseArgs(argv);
	const results = [];
	let sourcesFailed = 0;

	// One unreachable source must not stop the others from syncing.
	for (const name of options.sources) {
		try {
			results.push(await fetchSource(name, options));
		} catch (error) {
			log(`  ✗ ${error.message}`, "red");
			sourcesFailed++;
		}
	}

	console.log(`\n${"=".repeat(50)}`);
	for (const result of results) {
		const parts = [result.dryRun ? "dry run" : `${result.downloaded} downloaded`];
		if (result.skipped > 0) {
			parts.push(`${result.skipped} agent test games skipped`);
		}
		if (result.failed > 0) {
			parts.push(`${result.failed} failed`);
		}
		log(`${result.name}: ${parts.join(", ")}`, "green");
	}
	if (sourcesFailed > 0) {
		log(`${sourcesFailed} source(s) could not be reached`, "yellow");
	}
	console.log("=".repeat(50));

	return sourcesFailed > 0 || results.some((result) => result.failed > 0) ? 1 : 0;
}

module.exports = {main, fetchSource};
