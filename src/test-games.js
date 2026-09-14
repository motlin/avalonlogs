/**
 * The agent test harness plays under fixed display names. It mints a fresh anonymous
 * account for every run, so the player uids are useless for spotting these games --
 * the roster is the only stable signal.
 */
const AGENT_NAMES = new Set([
	"ALICE",
	"BOB",
	"CAROL",
	"CARL",
	"DAVE",
	"EVE",
	"JIMMY",
	"USERONE",
	"USERTWO",
	"USERTHREE",
	"USERFOUR",
	"USERFIVE",
]);

/**
 * Synthetic only when every single player is an agent. A real game once had a player
 * named TEST, and real players could share a first name with an agent, so a game is
 * kept the moment one unrecognized name appears.
 */
function isAgentRoster(playerNames) {
	if (playerNames.length === 0) {
		return false;
	}
	return playerNames.every((name) => AGENT_NAMES.has(name.trim().toUpperCase()));
}

function playerNamesOf(gameData) {
	return (gameData.players || []).map((player) => player.name || "");
}

module.exports = {AGENT_NAMES, isAgentRoster, playerNamesOf};
