// @vitest-environment node
import { describe, it, expect } from "vitest";
import {
  bigMoneySmithyAction,
  bigMoneySmithyBuy,
  bigMoneySmithyTurn,
  bigMoneySmithyDecision,
  countCardInDeck,
} from "../bigMoneySmithy";
import { createGame, getCurrentPlayer } from "../../domain/game";
import { createShuffleFn } from "../../domain/shuffle";
import { CARD_DEFS, getCardDef, createCardInstance } from "../../domain/card";
import { createPlayer } from "../../domain/player";
import { initializeSupply } from "../../domain/supply";
import { createInitialTurnState } from "../../domain/turn";
import { Phase } from "../../types";
import type { GameState, PlayerState } from "../../types";

const shuffle = createShuffleFn(() => 0.5);

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

function makeGame(): GameState {
  return createGame(["Alice", "Bob"], kingdom, shuffle);
}

function makeGameWithHand(hand: ReturnType<typeof createCardInstance>[]): GameState {
  const game = makeGame();
  const player = { ...game.players[0], hand };
  return {
    ...game,
    players: game.players.map((p, i) => (i === 0 ? player : p)),
  };
}

describe("countCardInDeck", () => {
  it("counts cards across all zones", () => {
    const copper = createCardInstance(getCardDef("Copper"));
    const copper2 = createCardInstance(getCardDef("Copper"));
    const smithy = createCardInstance(getCardDef("Smithy"));
    const player: PlayerState = {
      id: "p1",
      name: "Test",
      hand: [copper],
      deck: [copper2],
      discard: [smithy],
      playArea: [],
    };
    expect(countCardInDeck(player, "Copper")).toBe(2);
    expect(countCardInDeck(player, "Smithy")).toBe(1);
    expect(countCardInDeck(player, "Gold")).toBe(0);
  });
});

describe("bigMoneySmithyAction", () => {
  it("plays Smithy from hand and draws 3 cards", () => {
    const smithy = createCardInstance(getCardDef("Smithy"));
    const deckCards = Array.from({ length: 5 }, () =>
      createCardInstance(getCardDef("Copper")),
    );
    const game = makeGame();
    const player = {
      ...game.players[0],
      hand: [smithy],
      deck: deckCards,
      playArea: [],
    };
    const state: GameState = {
      ...game,
      players: game.players.map((p, i) => (i === 0 ? player : p)),
      phase: Phase.Action,
      turnState: { actions: 1, buys: 1, coins: 0 },
    };

    const after = bigMoneySmithyAction(state, shuffle);
    // Smithy played: draws 3 cards
    // After action phase, should advance to Buy phase
    expect(after.phase).toBe(Phase.Buy);
    // Smithy should be in playArea
    const p = after.players[0];
    expect(p.playArea.some((c) => c.def.name === "Smithy")).toBe(true);
  });

  it("skips action and advances to Buy when no Smithy in hand", () => {
    const copper = createCardInstance(getCardDef("Copper"));
    const game = makeGame();
    const player = {
      ...game.players[0],
      hand: [copper],
      deck: [],
      playArea: [],
    };
    const state: GameState = {
      ...game,
      players: game.players.map((p, i) => (i === 0 ? player : p)),
      phase: Phase.Action,
      turnState: { actions: 1, buys: 1, coins: 0 },
    };

    const after = bigMoneySmithyAction(state, shuffle);
    expect(after.phase).toBe(Phase.Buy);
  });
});

describe("bigMoneySmithyBuy", () => {
  it("buys Province when coins >= 8", () => {
    const game = makeGame();
    const state: GameState = {
      ...game,
      phase: Phase.Buy,
      turnState: { actions: 0, buys: 1, coins: 8 },
    };

    const after = bigMoneySmithyBuy(state);
    const gained = after.players[0].discard.find((c) => c.def.name === "Province");
    expect(gained).toBeDefined();
  });

  it("buys Gold when coins >= 6 and < 8", () => {
    const game = makeGame();
    const state: GameState = {
      ...game,
      phase: Phase.Buy,
      turnState: { actions: 0, buys: 1, coins: 6 },
    };

    const after = bigMoneySmithyBuy(state);
    const gained = after.players[0].discard.find((c) => c.def.name === "Gold");
    expect(gained).toBeDefined();
  });

  it("buys Smithy when coins >= 4 and Smithy count < 2", () => {
    const game = makeGame();
    // Player starts with 0 Smithy
    const state: GameState = {
      ...game,
      phase: Phase.Buy,
      turnState: { actions: 0, buys: 1, coins: 4 },
    };

    const after = bigMoneySmithyBuy(state);
    const gained = after.players[0].discard.find((c) => c.def.name === "Smithy");
    expect(gained).toBeDefined();
  });

  it("buys Silver instead of Smithy when Smithy count >= 2", () => {
    // Create a player who already has 2 Smithies
    const smithy1 = createCardInstance(getCardDef("Smithy"));
    const smithy2 = createCardInstance(getCardDef("Smithy"));
    const game = makeGame();
    const player = {
      ...game.players[0],
      discard: [...game.players[0].discard, smithy1, smithy2],
    };
    const state: GameState = {
      ...game,
      players: game.players.map((p, i) => (i === 0 ? player : p)),
      phase: Phase.Buy,
      turnState: { actions: 0, buys: 1, coins: 4 },
    };

    const after = bigMoneySmithyBuy(state);
    const gainedSmithy = after.players[0].discard.filter(
      (c) => c.def.name === "Smithy",
    );
    // Should still have exactly 2 Smithies (didn't buy more)
    expect(gainedSmithy).toHaveLength(2);
    // Should have gained a Silver
    const silversBefore = state.players[0].discard.filter(
      (c) => c.def.name === "Silver",
    ).length;
    const silversAfter = after.players[0].discard.filter(
      (c) => c.def.name === "Silver",
    ).length;
    expect(silversAfter).toBe(silversBefore + 1);
  });

  it("buys Silver when coins = 3", () => {
    const game = makeGame();
    const state: GameState = {
      ...game,
      phase: Phase.Buy,
      turnState: { actions: 0, buys: 1, coins: 3 },
    };

    const after = bigMoneySmithyBuy(state);
    const gained = after.players[0].discard.find((c) => c.def.name === "Silver");
    expect(gained).toBeDefined();
  });

  it("buys nothing when coins < 3", () => {
    const game = makeGame();
    const state: GameState = {
      ...game,
      phase: Phase.Buy,
      turnState: { actions: 0, buys: 1, coins: 2 },
    };

    const after = bigMoneySmithyBuy(state);
    expect(after.turnState.buys).toBe(1); // buy not spent
  });
});

describe("bigMoneySmithyTurn", () => {
  it("executes a full turn and advances to next player", () => {
    const game = makeGame();
    const after = bigMoneySmithyTurn(game, shuffle);
    // Should have moved to next player
    expect(after.currentPlayerIndex).toBe(1);
    expect(after.turnNumber).toBe(2);
  });
});

describe("bigMoneySmithyDecision", () => {
  it("returns play action when Smithy in hand during Action phase", () => {
    const smithy = createCardInstance(getCardDef("Smithy"));
    const game = makeGame();
    const player = { ...game.players[0], hand: [smithy] };
    const state: GameState = {
      ...game,
      players: game.players.map((p, i) => (i === 0 ? player : p)),
      phase: Phase.Action,
      turnState: { actions: 1, buys: 1, coins: 0 },
    };

    const decision = bigMoneySmithyDecision(state);
    expect(decision.action).toBe("play");
    expect(decision.cardName).toBe("Smithy");
    expect(decision.instanceId).toBe(smithy.instanceId);
  });

  it("returns skip when no Smithy during Action phase", () => {
    const copper = createCardInstance(getCardDef("Copper"));
    const game = makeGame();
    const player = { ...game.players[0], hand: [copper] };
    const state: GameState = {
      ...game,
      players: game.players.map((p, i) => (i === 0 ? player : p)),
      phase: Phase.Action,
      turnState: { actions: 1, buys: 1, coins: 0 },
    };

    const decision = bigMoneySmithyDecision(state);
    expect(decision.action).toBe("skip");
  });

  it("returns buy with Province when coins >= 8 in Buy phase", () => {
    const game = makeGame();
    const state: GameState = {
      ...game,
      phase: Phase.Buy,
      turnState: { actions: 0, buys: 1, coins: 8 },
    };

    const decision = bigMoneySmithyDecision(state);
    expect(decision.action).toBe("buy");
    expect(decision.cardName).toBe("Province");
  });
});
