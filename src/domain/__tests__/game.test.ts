// @vitest-environment node
import { describe, it, expect } from "vitest";
import {
  createGame,
  getCurrentPlayer,
  endTurn,
  checkGameOver,
  getGameResults,
  addLog,
  updatePlayer,
  updateCurrentPlayer,
} from "../game";
import { CARD_DEFS } from "../card";
import { createShuffleFn } from "../shuffle";
import type { GameState, PlayerState } from "../../types";
import { Phase } from "../../types";

const kingdom = [
  CARD_DEFS.Village,
  CARD_DEFS.Smithy,
  CARD_DEFS.Market,
  CARD_DEFS.Laboratory,
  CARD_DEFS.Festival,
  CARD_DEFS.Moat,
  CARD_DEFS.Cellar,
  CARD_DEFS.Workshop,
  CARD_DEFS.Militia,
  CARD_DEFS.Mine,
];

const shuffleFn = createShuffleFn(() => 0.5);

function makeGame(): GameState {
  return createGame(["Alice", "Bob"], kingdom, shuffleFn);
}

describe("createGame", () => {
  const game = makeGame();

  it("creates the correct number of players", () => {
    expect(game.players).toHaveLength(2);
  });

  it("each player has 5 cards in hand", () => {
    for (const player of game.players) {
      expect(player.hand).toHaveLength(5);
    }
  });

  it("each player has 5 cards in deck", () => {
    for (const player of game.players) {
      expect(player.deck).toHaveLength(5);
    }
  });

  it("each player has 10 total cards (7 Copper + 3 Estate)", () => {
    for (const player of game.players) {
      const all = [
        ...player.deck,
        ...player.hand,
        ...player.discard,
        ...player.playArea,
      ];
      expect(all).toHaveLength(10);
    }
  });

  it("initializes supply correctly", () => {
    expect(game.supply.length).toBeGreaterThan(0);
    const copper = game.supply.find((p) => p.card.name === "Copper");
    // 60 - 7*2 = 46
    expect(copper?.count).toBe(46);
  });

  it("starts with empty trash", () => {
    expect(game.trash).toEqual([]);
  });

  it("starts with currentPlayerIndex 0", () => {
    expect(game.currentPlayerIndex).toBe(0);
  });

  it("starts in Action phase", () => {
    expect(game.phase).toBe(Phase.Action);
  });

  it("starts at turn 1", () => {
    expect(game.turnNumber).toBe(1);
  });

  it("starts with gameOver false", () => {
    expect(game.gameOver).toBe(false);
  });

  it("has initial turnState (1 action, 1 buy, 0 coins)", () => {
    expect(game.turnState).toEqual({ actions: 1, buys: 1, coins: 0 });
  });

  it("has no pendingEffect", () => {
    expect(game.pendingEffect).toBeNull();
  });

  it("has initial log entry", () => {
    expect(game.log).toContain("Game started");
  });

  it("assigns player names correctly", () => {
    expect(game.players[0].name).toBe("Alice");
    expect(game.players[1].name).toBe("Bob");
  });
});

describe("getCurrentPlayer", () => {
  it("returns the current player by index", () => {
    const game = makeGame();
    const player = getCurrentPlayer(game);
    expect(player.name).toBe("Alice");
    expect(player).toBe(game.players[0]);
  });

  it("returns second player when index is 1", () => {
    const game = { ...makeGame(), currentPlayerIndex: 1 };
    const player = getCurrentPlayer(game);
    expect(player.name).toBe("Bob");
  });
});

describe("endTurn", () => {
  it("advances to the next player", () => {
    const game = makeGame();
    const next = endTurn(game, shuffleFn);
    expect(next.currentPlayerIndex).toBe(1);
  });

  it("wraps around to player 0 after last player", () => {
    const game = { ...makeGame(), currentPlayerIndex: 1 };
    const next = endTurn(game, shuffleFn);
    expect(next.currentPlayerIndex).toBe(0);
  });

  it("increments turnNumber", () => {
    const game = makeGame();
    const next = endTurn(game, shuffleFn);
    expect(next.turnNumber).toBe(2);
  });

  it("resets phase to Action", () => {
    const game = { ...makeGame(), phase: Phase.Buy };
    const next = endTurn(game, shuffleFn);
    expect(next.phase).toBe(Phase.Action);
  });

  it("resets turnState", () => {
    const game = {
      ...makeGame(),
      turnState: { actions: 0, buys: 0, coins: 5 },
    };
    const next = endTurn(game, shuffleFn);
    expect(next.turnState).toEqual({ actions: 1, buys: 1, coins: 0 });
  });

  it("performs cleanup and draw (player gets 5 new hand cards)", () => {
    const game = makeGame();
    const next = endTurn(game, shuffleFn);
    // After endTurn, the previous current player should have 5 hand cards
    // (cleanup discards hand+playArea, then draws 5)
    expect(next.players[0].hand).toHaveLength(5);
    expect(next.players[0].playArea).toHaveLength(0);
  });

  it("does not mutate the original state", () => {
    const game = makeGame();
    const originalIndex = game.currentPlayerIndex;
    const originalTurn = game.turnNumber;
    endTurn(game, shuffleFn);
    expect(game.currentPlayerIndex).toBe(originalIndex);
    expect(game.turnNumber).toBe(originalTurn);
  });

  it("sets gameOver when Province is empty", () => {
    const game = makeGame();
    const modified = {
      ...game,
      supply: game.supply.map((p) =>
        p.card.name === "Province" ? { ...p, count: 0 } : p,
      ),
    };
    const next = endTurn(modified, shuffleFn);
    expect(next.gameOver).toBe(true);
  });
});

describe("checkGameOver", () => {
  it("returns gameOver=false when game is in progress", () => {
    const game = makeGame();
    const checked = checkGameOver(game);
    expect(checked.gameOver).toBe(false);
  });

  it("returns gameOver=true when Province is empty", () => {
    const game = makeGame();
    const modified = {
      ...game,
      supply: game.supply.map((p) =>
        p.card.name === "Province" ? { ...p, count: 0 } : p,
      ),
    };
    const checked = checkGameOver(modified);
    expect(checked.gameOver).toBe(true);
  });

  it("returns gameOver=true when 3 piles are empty", () => {
    const game = makeGame();
    let emptyCount = 0;
    const modified = {
      ...game,
      supply: game.supply.map((p) => {
        if (emptyCount < 3 && p.card.name !== "Province") {
          emptyCount++;
          return { ...p, count: 0 };
        }
        return p;
      }),
    };
    const checked = checkGameOver(modified);
    expect(checked.gameOver).toBe(true);
  });

  it("does not mutate the original state", () => {
    const game = makeGame();
    checkGameOver(game);
    expect(game.gameOver).toBe(false);
  });
});

describe("getGameResults", () => {
  it("returns results for all players", () => {
    const game = makeGame();
    const results = getGameResults(game);
    expect(results).toHaveLength(2);
  });

  it("includes playerId, name, and vp", () => {
    const game = makeGame();
    const results = getGameResults(game);
    for (const r of results) {
      expect(r).toHaveProperty("playerId");
      expect(r).toHaveProperty("name");
      expect(r).toHaveProperty("vp");
    }
  });

  it("sorts results by VP descending", () => {
    const game = makeGame();
    const results = getGameResults(game);
    for (let i = 0; i < results.length - 1; i++) {
      expect(results[i].vp).toBeGreaterThanOrEqual(results[i + 1].vp);
    }
  });

  it("calculates VP from Estate cards (3 Estate = 3 VP per player)", () => {
    const game = makeGame();
    const results = getGameResults(game);
    // Each player starts with 3 Estates (vpValue: 1 each) = 3 VP
    for (const r of results) {
      expect(r.vp).toBe(3);
    }
  });
});

describe("addLog", () => {
  it("appends a message to the log", () => {
    const game = makeGame();
    const updated = addLog(game, "Test message");
    expect(updated.log).toContain("Test message");
    expect(updated.log.length).toBe(game.log.length + 1);
  });

  it("does not mutate the original state", () => {
    const game = makeGame();
    const originalLength = game.log.length;
    addLog(game, "Test");
    expect(game.log).toHaveLength(originalLength);
  });
});

describe("updatePlayer", () => {
  it("updates the player at the specified index", () => {
    const game = makeGame();
    const modified: PlayerState = { ...game.players[1], name: "Updated Bob" };
    const updated = updatePlayer(game, 1, modified);
    expect(updated.players[1].name).toBe("Updated Bob");
    expect(updated.players[0].name).toBe("Alice");
  });

  it("does not mutate the original state", () => {
    const game = makeGame();
    const modified: PlayerState = { ...game.players[0], name: "Changed" };
    updatePlayer(game, 0, modified);
    expect(game.players[0].name).toBe("Alice");
  });
});

describe("updateCurrentPlayer", () => {
  it("updates the current player", () => {
    const game = makeGame();
    const modified: PlayerState = {
      ...game.players[0],
      name: "Updated Alice",
    };
    const updated = updateCurrentPlayer(game, modified);
    expect(updated.players[0].name).toBe("Updated Alice");
  });

  it("does not mutate the original state", () => {
    const game = makeGame();
    const modified: PlayerState = { ...game.players[0], name: "Changed" };
    updateCurrentPlayer(game, modified);
    expect(game.players[0].name).toBe("Alice");
  });
});
