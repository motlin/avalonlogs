#!/usr/bin/env node

/**
 * Fetch new Avalon game logs from every configured server, newest-first per source.
 * Usage: fetch-new-logs.js [--source <name>] [--dry-run] [--limit <n>]
 */

const {main} = require("./src/fetch");

main()
	.then((code) => process.exit(code))
	.catch((error) => {
		console.error(`\x1b[31mFatal error: ${error.message}\x1b[0m`);
		process.exit(1);
	});
