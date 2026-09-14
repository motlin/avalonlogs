import {describe, expect, it} from "vitest";
import path from "node:path";
import {
	assertProjectMatches,
	getSource,
	listSourceNames,
	logsDirFor,
	parseArgs,
	selectCredentialPath,
} from "../src/sources.js";

describe("source registry", () => {
	it("knows both the upstream site and my own server", () => {
		expect(listSourceNames()).toEqual(["georgyo-avalon", "avalon-cool"]);
	});

	it("maps each source name to its Firestore project", () => {
		expect(getSource("georgyo-avalon").projectId).toBe("georgyo-avalon");
		expect(getSource("avalon-cool").projectId).toBe("avalon-cool");
	});

	it("rejects an unknown source by name", () => {
		expect(() => getSource("nope")).toThrow(/unknown source "nope"/i);
	});

	it("gives every source its own logs subdirectory", () => {
		expect(logsDirFor("georgyo-avalon")).toBe(path.join("logs", "georgyo-avalon"));
		expect(logsDirFor("avalon-cool")).toBe(path.join("logs", "avalon-cool"));
	});
});

describe("parseArgs", () => {
	it("defaults to every known source", () => {
		expect(parseArgs([]).sources).toEqual(["georgyo-avalon", "avalon-cool"]);
	});

	it("defaults to a real fetch with no limit", () => {
		expect(parseArgs([])).toMatchObject({dryRun: false, limit: null});
	});

	it("narrows to a single named source", () => {
		expect(parseArgs(["--source", "avalon-cool"]).sources).toEqual(["avalon-cool"]);
	});

	it("accumulates repeated source flags in the order given", () => {
		expect(parseArgs(["--source", "avalon-cool", "--source", "georgyo-avalon"]).sources).toEqual([
			"avalon-cool",
			"georgyo-avalon",
		]);
	});

	it("rejects a source that is not in the registry", () => {
		expect(() => parseArgs(["--source", "nope"])).toThrow(/unknown source "nope"/i);
	});

	it("rejects a source flag with no value", () => {
		expect(() => parseArgs(["--source"])).toThrow(/--source requires a value/i);
	});

	it("reads the dry-run flag", () => {
		expect(parseArgs(["--dry-run"]).dryRun).toBe(true);
	});

	it("reads a numeric limit", () => {
		expect(parseArgs(["--limit", "25"]).limit).toBe(25);
	});

	it("rejects a limit that is not a positive integer", () => {
		expect(() => parseArgs(["--limit", "lots"])).toThrow(/--limit requires a positive integer/i);
		expect(() => parseArgs(["--limit", "0"])).toThrow(/--limit requires a positive integer/i);
	});

	it("rejects an unrecognized flag instead of ignoring it", () => {
		expect(() => parseArgs(["--dryrun"])).toThrow(/unknown argument "--dryrun"/i);
	});
});

describe("selectCredentialPath", () => {
	it("returns the first candidate that exists", () => {
		const exists = (p) => p === "/b.json";
		expect(selectCredentialPath(["/a.json", "/b.json", "/c.json"], exists)).toBe("/b.json");
	});

	it("skips empty candidates so unset env vars do not count", () => {
		const exists = (p) => p === "/c.json";
		expect(selectCredentialPath([undefined, "", "/c.json"], exists)).toBe("/c.json");
	});

	it("returns null when nothing exists", () => {
		expect(selectCredentialPath(["/a.json"], () => false)).toBeNull();
	});
});

describe("assertProjectMatches", () => {
	it("accepts a service account belonging to the expected project", () => {
		expect(() => assertProjectMatches({project_id: "avalon-cool"}, "avalon-cool", "/k.json")).not.toThrow();
	});

	it("refuses credentials for a different project so sources cannot be crossed", () => {
		expect(() => assertProjectMatches({project_id: "georgyo-avalon"}, "avalon-cool", "/k.json")).toThrow(
			/\/k\.json.*georgyo-avalon.*avalon-cool/s,
		);
	});
});
