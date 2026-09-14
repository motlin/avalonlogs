import {describe, expect, it} from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {buildLogFilename, findLatestLocalGame, parseLogFilename} from "../src/log-files.js";

async function tempLogsDir(filenames) {
	const dir = await fs.mkdtemp(path.join(os.tmpdir(), "avalonlogs-"));
	for (const name of filenames) {
		await fs.writeFile(path.join(dir, name), "{}");
	}
	return dir;
}

describe("parseLogFilename", () => {
	it("splits a well-formed filename into its timestamp and game code", () => {
		expect(parseLogFilename("2026-08-28T08:30:28.510Z_CSG")).toEqual({
			timestamp: new Date("2026-08-28T08:30:28.510Z"),
			gameId: "CSG",
		});
	});

	it("strips trailing whitespace from the game code", () => {
		expect(parseLogFilename("2019-03-13T22:31:15.519Z_WJE  ")).toEqual({
			timestamp: new Date("2019-03-13T22:31:15.519Z"),
			gameId: "WJE",
		});
	});

	it("returns null when there is no separator", () => {
		expect(parseLogFilename("2026-08-28T08:30:28.510Z")).toBeNull();
	});

	it("returns null when the timestamp half is not a date", () => {
		expect(parseLogFilename("not-a-date_CSG")).toBeNull();
	});

	it("returns null when the game code half is empty", () => {
		expect(parseLogFilename("2026-08-28T08:30:28.510Z_")).toBeNull();
	});
});

describe("buildLogFilename", () => {
	it("joins an ISO timestamp to a bare game code", () => {
		expect(buildLogFilename("CSG", new Date("2026-08-28T08:30:28.510Z"))).toBe("2026-08-28T08:30:28.510Z_CSG");
	});

	it("reduces a full Firestore document id to just its game code", () => {
		expect(buildLogFilename("2025-08-27T19:29:11.847Z_FPL", new Date("2026-08-28T08:30:28.510Z"))).toBe(
			"2026-08-28T08:30:28.510Z_FPL",
		);
	});
});

describe("findLatestLocalGame", () => {
	it("reports no game for a directory that does not exist", async () => {
		const dir = path.join(os.tmpdir(), "avalonlogs-does-not-exist-12345");
		expect(await findLatestLocalGame(dir)).toEqual({timestamp: null, gameId: null});
	});

	it("reports no game for an empty directory", async () => {
		const dir = await tempLogsDir([]);
		expect(await findLatestLocalGame(dir)).toEqual({timestamp: null, gameId: null});
	});

	it("returns the newest game by timestamp rather than by name order", async () => {
		const dir = await tempLogsDir([
			"2026-08-28T08:30:28.510Z_CSG",
			"2019-03-13T22:31:15.519Z_WJE",
			"2026-05-25T20:18:13.060Z_YZC",
		]);
		expect(await findLatestLocalGame(dir)).toEqual({
			timestamp: new Date("2026-08-28T08:30:28.510Z"),
			gameId: "CSG",
		});
	});

	it("ignores files that are not named like logs", async () => {
		const dir = await tempLogsDir(["README.md", ".DS_Store", "2019-03-13T22:31:15.519Z_WJE"]);
		expect(await findLatestLocalGame(dir)).toEqual({
			timestamp: new Date("2019-03-13T22:31:15.519Z"),
			gameId: "WJE",
		});
	});

	it("does not descend into per-source sibling directories", async () => {
		const dir = await tempLogsDir(["2019-03-13T22:31:15.519Z_WJE"]);
		await fs.mkdir(path.join(dir, "2026-12-31T00:00:00.000Z_DIR"));
		expect(await findLatestLocalGame(dir)).toEqual({
			timestamp: new Date("2019-03-13T22:31:15.519Z"),
			gameId: "WJE",
		});
	});
});
