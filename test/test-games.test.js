import {describe, expect, it} from "vitest";
import {isAgentRoster} from "../src/test-games.js";

describe("isAgentRoster", () => {
	it("recognizes the ALICE/BOB/CAROL/DAVE/EVE agent lineup", () => {
		expect(isAgentRoster(["ALICE", "BOB", "CAROL", "DAVE", "EVE"])).toBe(true);
	});

	it("recognizes the lineup after CAROL was renamed to CARL", () => {
		expect(isAgentRoster(["ALICE", "BOB", "CARL", "DAVE", "EVE"])).toBe(true);
	});

	it("recognizes the JIMMY/USERONE lineup", () => {
		expect(isAgentRoster(["JIMMY", "USERONE", "USERTWO", "USERTHREE", "USERFOUR", "USERFIVE"])).toBe(true);
	});

	it("ignores ordering and surrounding whitespace", () => {
		expect(isAgentRoster([" eve ", "alice", "BOB", "Dave", "carol"])).toBe(true);
	});

	it("keeps a real game", () => {
		expect(isAgentRoster(["AMBER", "CATHERINE", "COURTNEY", "KIERON", "LAKSHMI", "LAY", "LIAM", "NATHAN"])).toBe(
			false,
		);
	});

	it("keeps the real game whose player is actually named TEST", () => {
		expect(isAgentRoster(["KEN", "NEKKY", "TAE", "TEST", "TOMJONES"])).toBe(false);
	});

	it("keeps a game where agents sit alongside real players", () => {
		expect(isAgentRoster(["ALICE", "BOB", "CATHERINE", "DAVE", "EVE"])).toBe(false);
	});

	it("does not treat a game with no players as synthetic", () => {
		expect(isAgentRoster([])).toBe(false);
	});
});
