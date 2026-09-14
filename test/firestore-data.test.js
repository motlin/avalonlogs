import {describe, expect, it} from "vitest";
import {createConverter} from "../src/firestore-data.js";

class FakeTimestamp {
	constructor(seconds, nanoseconds) {
		this.seconds = seconds;
		this.nanoseconds = nanoseconds;
	}
}

class FakeDocumentReference {
	constructor(path) {
		this.path = path;
	}
}

const convert = createConverter({Timestamp: FakeTimestamp, DocumentReference: FakeDocumentReference});

describe("createConverter", () => {
	it("renders a timestamp as the seconds/nanoseconds pair the log format uses", () => {
		expect(convert(new FakeTimestamp(1787905828, 510000000))).toEqual({
			_seconds: 1787905828,
			_nanoseconds: 510000000,
		});
	});

	it("renders a document reference as its path", () => {
		expect(convert(new FakeDocumentReference("logs/abc"))).toBe("logs/abc");
	});

	it("leaves primitives alone", () => {
		expect(convert("EVIL_WIN")).toBe("EVIL_WIN");
		expect(convert(3)).toBe(3);
		expect(convert(false)).toBe(false);
		expect(convert(null)).toBeNull();
		expect(convert(undefined)).toBeUndefined();
	});

	it("converts through arrays and nested objects", () => {
		const input = {
			players: [{name: "LAY"}, {name: "AMBER"}],
			timeCreated: new FakeTimestamp(1787905828, 510000000),
			nested: {deeper: {at: new FakeTimestamp(1, 2)}},
		};
		expect(convert(input)).toEqual({
			players: [{name: "LAY"}, {name: "AMBER"}],
			timeCreated: {_seconds: 1787905828, _nanoseconds: 510000000},
			nested: {deeper: {at: {_seconds: 1, _nanoseconds: 2}}},
		});
	});

	it("does not mistake ordinary game data for a reference", () => {
		expect(convert({path: "not a reference"})).toEqual({path: "not a reference"});
	});
});
