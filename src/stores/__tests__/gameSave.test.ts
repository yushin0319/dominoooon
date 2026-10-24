// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CARD_DEFS, getCardDef } from '../../domain/card';
import { createGame } from '../../domain/game';
import { calculateVP } from '../../domain/player';
import { createShuffleFn } from '../../domain/shuffle';
import type { GameState } from '../../types';
import {
  createSaveStorage,
  parseSave,
  SAVE_KEY,
  SAVE_VERSION,
  type SavedGame,
  serializeSave,
} from '../gameSave';

const kingdom = [
  'Village',
  'Smithy',
  'Market',
  'Festival',
  'Laboratory',
  'Cellar',
  'Moat',
  'Militia',
  'Gardens',
  'Throne Room',
].map(getCardDef);

function game(): GameState {
  return createGame(['あなた', 'AI'], kingdom, createShuffleFn());
}

function saved(over: Partial<SavedGame> = {}): SavedGame {
  return {
    page: 'game',
    gameState: game(),
    undo: null,
    aiStrategy: 'bigMoney',
    lastSetup: { kingdom: kingdom.map((c) => c.name), aiStrategy: 'bigMoney' },
    ...over,
  };
}

/** localStorage の代わり（Storage の一部だけ） */
function memoryStorage() {
  const items = new Map<string, string>();
  return {
    getItem: (k: string) => items.get(k) ?? null,
    setItem: (k: string, v: string) => {
      items.set(k, v);
    },
    removeItem: (k: string) => {
      items.delete(k);
    },
    items,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('serializeSave / parseSave: 途中のゲームを文字列にして戻す', () => {
  it('カードの定義は名前だけで書き、関数（庭園の点の数え方）は保存しない', () => {
    const text = serializeSave({ state: saved(), version: SAVE_VERSION });
    const raw = JSON.parse(text);
    expect(raw.version).toBe(SAVE_VERSION);
    // 山札のカードは { instanceId, def: { $card: 'Copper' } } の形
    expect(raw.state.gameState.players[0].deck[0].def).toEqual({
      $card: expect.any(String),
    });
    expect(text).not.toContain('vpCalculator');
    expect(text).not.toContain('nameJa');
  });

  it('戻すとカードの定義は元の定義そのもの（庭園の点も数えられる）', () => {
    const original = saved();
    const gs = original.gameState as GameState;
    const withGardens: GameState = {
      ...gs,
      players: [
        {
          ...gs.players[0],
          discard: [{ instanceId: 'g1', def: CARD_DEFS.Gardens }],
        },
        gs.players[1],
      ],
    };
    const back = parseSave(
      serializeSave({
        state: { ...original, gameState: withGardens },
        version: SAVE_VERSION,
      }),
    );
    const restored = back?.state.gameState as GameState;
    expect(restored.players[0].discard[0].def).toBe(CARD_DEFS.Gardens);
    expect(restored.supply.map((p) => p.card)).toEqual(
      withGardens.supply.map((p) => p.card),
    );
    expect(restored.supply[0].card).toBe(withGardens.supply[0].card);
    expect(calculateVP(restored.players[0])).toBe(
      calculateVP(withGardens.players[0]),
    );
    expect(restored).toEqual(withGardens);
  });

  it('選択待ち（玉座の間の残りの使用も）を戻せる', () => {
    const gs = game();
    const workshop = { instanceId: 'w1', def: CARD_DEFS.Workshop };
    const pending: GameState = {
      ...gs,
      pendingEffect: {
        type: 'workshop',
        sourceCard: CARD_DEFS.Workshop,
        playerId: '0',
        continuation: [{ card: workshop, remaining: 1 }],
      },
    };
    const back = parseSave(
      serializeSave({
        state: saved({ gameState: pending }),
        version: SAVE_VERSION,
      }),
    );
    const restored = back?.state.gameState as GameState;
    expect(restored.pendingEffect?.sourceCard).toBe(CARD_DEFS.Workshop);
    expect(restored.pendingEffect?.continuation?.[0].card.def).toBe(
      CARD_DEFS.Workshop,
    );
    expect(restored).toEqual(pending);
  });

  it('壊れた文字列・知らないカード・形の違うデータは null（タイトルから始める）', () => {
    expect(parseSave('{not json')).toBeNull();
    expect(parseSave('null')).toBeNull();
    expect(parseSave(JSON.stringify({ state: {}, version: 1 }))).toBeNull();
    const text = serializeSave({ state: saved(), version: SAVE_VERSION });
    expect(parseSave(text.replace(/"Copper"/g, '"NoSuchCard"'))).toBeNull();
    const broken = JSON.parse(text);
    broken.state.gameState.players = 'x';
    expect(parseSave(JSON.stringify(broken))).toBeNull();
    const badPage = JSON.parse(text);
    badPage.state.page = 'nowhere';
    expect(parseSave(JSON.stringify(badPage))).toBeNull();
  });

  it('ゲーム中・結果画面なのにゲームが無いデータは null', () => {
    const text = serializeSave({
      state: saved({ page: 'result', gameState: null }),
      version: SAVE_VERSION,
    });
    expect(parseSave(text)).toBeNull();
  });

  it('版が違うデータは中身を確かめずに版ごと返す（移し替えは persist の migrate が決める）', () => {
    const back = parseSave(
      JSON.stringify({ state: { old: true }, version: 0 }),
    );
    expect(back).toEqual({ state: { old: true }, version: 0 });
  });
});

describe('createSaveStorage: localStorage への読み書き', () => {
  it('書いた値を読み戻せる', () => {
    const mem = memoryStorage();
    const storage = createSaveStorage(() => mem);
    const value = { state: saved(), version: SAVE_VERSION };
    storage.setItem(SAVE_KEY, value);
    expect(mem.items.has(SAVE_KEY)).toBe(true);
    expect(storage.getItem(SAVE_KEY)).toEqual(value);
  });

  it('壊れた保存データは読んだときに消す', () => {
    const mem = memoryStorage();
    mem.setItem(SAVE_KEY, '{broken');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const storage = createSaveStorage(() => mem);
    expect(storage.getItem(SAVE_KEY)).toBeNull();
    expect(mem.items.has(SAVE_KEY)).toBe(false);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('localStorage が使えない環境（無い・書き込みで例外）でも止まらない', () => {
    const none = createSaveStorage(() => undefined);
    expect(none.getItem(SAVE_KEY)).toBeNull();
    expect(() =>
      none.setItem(SAVE_KEY, { state: saved(), version: SAVE_VERSION }),
    ).not.toThrow();

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const full = createSaveStorage(() => ({
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
      removeItem: () => {},
    }));
    expect(() =>
      full.setItem(SAVE_KEY, { state: saved(), version: SAVE_VERSION }),
    ).not.toThrow();
    // 毎回の更新で警告を積まないよう、1 回だけ知らせる
    full.setItem(SAVE_KEY, { state: saved(), version: SAVE_VERSION });
    expect(warn).toHaveBeenCalledTimes(1);
  });
});
