// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CARD_DEFS, createCardInstance, getCardDef } from '../../domain/card';
import { advancePhase } from '../../domain/turn';
import { shouldAutoSkipActionPhase } from '../../lib/turnFlow';
import { Phase } from '../../types';
import { SAVE_KEY, SAVE_VERSION } from '../gameSave';
import { selectUndoableBuy, useGameStore } from '../gameStore';

const kingdom = [
  'Village',
  'Smithy',
  'Market',
  'Festival',
  'Laboratory',
  'Workshop',
  'Throne Room',
  'Militia',
  'Gardens',
  'Witch',
].map(getCardDef);

/** localStorage の代わり */
class MemoryStorage {
  items = new Map<string, string>();
  getItem(k: string) {
    return this.items.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.items.set(k, v);
  }
  removeItem(k: string) {
    this.items.delete(k);
  }
}

let mem: MemoryStorage;
const initial = useGameStore.getState();

beforeEach(() => {
  mem = new MemoryStorage();
  vi.stubGlobal('localStorage', mem);
  useGameStore.setState({
    page: 'title',
    gameState: null,
    lastBuy: null,
    aiTurn: null,
    aiStrategy: 'bigMoney',
    lastSetup: null,
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** 保存されている中身（JSON） */
function savedJson() {
  const text = mem.getItem(SAVE_KEY);
  if (!text) throw new Error('保存されていない');
  return JSON.parse(text);
}

/**
 * ページの再読み込みの代わり: ストアを起動直後（タイトル）に戻し、保存データから読み直す。
 * ストアを戻すと保存データも上書きされるので、読み直す前に元に戻す
 */
async function reload() {
  const text = mem.getItem(SAVE_KEY);
  useGameStore.setState({
    page: 'title',
    gameState: null,
    lastBuy: null,
    aiTurn: null,
    aiStrategy: 'bigMoney',
    lastSetup: null,
  });
  if (text === null) mem.removeItem(SAVE_KEY);
  else mem.setItem(SAVE_KEY, text);
  await useGameStore.persist.rehydrate();
}

/** 人間（0 番）の番の場面 */
function setHuman(opts: {
  hand: string[];
  phase?: Phase;
  actions?: number;
  buys?: number;
  coins?: number;
}) {
  const gs = useGameStore.getState().gameState!;
  useGameStore.setState({
    gameState: {
      ...gs,
      players: [
        {
          ...gs.players[0],
          hand: opts.hand.map((n) => createCardInstance(getCardDef(n))),
          playArea: [],
        },
        gs.players[1],
      ],
      currentPlayerIndex: 0,
      phase: opts.phase ?? Phase.Action,
      turnState: {
        actions: opts.actions ?? 1,
        buys: opts.buys ?? 1,
        coins: opts.coins ?? 0,
      },
      pendingEffect: null,
    },
    lastBuy: null,
    aiTurn: null,
  });
}

describe('途中保存: 何を保存するか', () => {
  it('ゲームを始めたら保存する（版つき。関数・シャッフルは入れない）', () => {
    useGameStore.getState().startGame(kingdom, 'bigMoneySmithy');
    const raw = savedJson();
    expect(raw.version).toBe(SAVE_VERSION);
    expect(raw.state.page).toBe('game');
    expect(raw.state.aiStrategy).toBe('bigMoneySmithy');
    expect(raw.state.lastSetup).toEqual({
      kingdom: kingdom.map((c) => c.name),
      aiStrategy: 'bigMoneySmithy',
    });
    expect(raw.state).not.toHaveProperty('shuffleFn');
    expect(raw.state).not.toHaveProperty('aiTurn');
    expect(mem.getItem(SAVE_KEY)).not.toContain('vpCalculator');
  });

  it('タイトルに戻ったら（やめる）途中のゲームは残さない', () => {
    useGameStore.getState().startGame(kingdom, 'bigMoney');
    useGameStore.getState().goToTitle();
    const raw = savedJson();
    expect(raw.state.page).toBe('title');
    expect(raw.state.gameState).toBeNull();
  });
});

describe('途中保存: 再読み込みしたら続きから', () => {
  it('自分のターンの途中: 同じページ・同じ状態に戻る（カードの定義も元のもの）', async () => {
    useGameStore.getState().startGame(kingdom, 'bigMoney');
    setHuman({ hand: ['Village', 'Copper', 'Gardens'] });
    const before = useGameStore.getState().gameState!;

    await reload();
    const s = useGameStore.getState();
    expect(s.page).toBe('game');
    expect(s.gameState).toEqual(before);
    expect(s.gameState!.players[0].hand[2].def).toBe(CARD_DEFS.Gardens);
    expect(typeof s.shuffleFn).toBe('function');
    // 続けて遊べる
    s.playAction(s.gameState!.players[0].hand[0].instanceId);
    expect(useGameStore.getState().gameState!.players[0].playArea[0].def).toBe(
      CARD_DEFS.Village,
    );
  });

  it('選択待ちの途中（玉座の間 → 工房の 1 回目）: 選択待ちから再開し、2 回目の選択も出る', async () => {
    useGameStore.getState().startGame(kingdom, 'bigMoney');
    setHuman({ hand: ['Throne Room', 'Workshop', 'Copper'] });
    const st = useGameStore.getState();
    st.playAction(st.gameState!.players[0].hand[0].instanceId);
    const workshopId = useGameStore
      .getState()
      .gameState!.players[0].hand.find(
        (c) => c.def.name === 'Workshop',
      )!.instanceId;
    useGameStore.getState().resolvePending({ selectedCards: [workshopId] });
    expect(useGameStore.getState().gameState!.pendingEffect?.type).toBe(
      'workshop',
    );

    await reload();
    const pending = useGameStore.getState().gameState!.pendingEffect;
    expect(pending?.type).toBe('workshop');
    expect(pending?.continuation).toHaveLength(1);

    useGameStore.getState().resolvePending({ selectedCardName: 'Silver' });
    expect(useGameStore.getState().gameState!.pendingEffect?.type).toBe(
      'workshop',
    );
    useGameStore.getState().resolvePending({ selectedCardName: 'Village' });
    const done = useGameStore.getState().gameState!;
    expect(done.pendingEffect).toBeNull();
    expect(done.players[0].discard.map((c) => c.def.name)).toEqual([
      'Silver',
      'Village',
    ]);
  });

  it('AI のターンを見せている途中: AI のターンは最後まで進めた状態（スキップと同じ結果）で再開する', async () => {
    useGameStore.getState().startGame(kingdom, 'bigMoney');
    const gs = useGameStore.getState().gameState!;
    useGameStore.setState({
      gameState: { ...gs, currentPlayerIndex: 1, phase: Phase.Action },
    });
    useGameStore.getState().startAITurn();
    const playing = useGameStore.getState().aiTurn!;
    expect(playing).not.toBeNull();
    const final = playing.final;

    // スキップしたときと同じ: 人間の番で使えるアクションが無ければ購入フェーズから
    const expected = shouldAutoSkipActionPhase(final)
      ? advancePhase(final)
      : final;

    await reload();
    const s = useGameStore.getState();
    expect(s.aiTurn).toBeNull();
    expect(s.gameState).toEqual(expected);
    // 番は人間に戻り、AI が何を買ったかはログに残っている
    expect(s.gameState!.currentPlayerIndex).toBe(0);
    expect(s.gameState!.log.some((l) => l.startsWith('AI: '))).toBe(true);
  });

  it('AI のターンが始まる前（考え中）に保存したら、そのまま AI の番から（最初から見せる）', async () => {
    useGameStore.getState().startGame(kingdom, 'bigMoney');
    const gs = useGameStore.getState().gameState!;
    useGameStore.setState({
      gameState: { ...gs, currentPlayerIndex: 1, phase: Phase.Action },
    });
    const before = useGameStore.getState().gameState!;

    await reload();
    expect(useGameStore.getState().gameState).toEqual(before);
    expect(useGameStore.getState().aiTurn).toBeNull();
  });

  it('買った直後に再読み込みしても、その購入は取り消せる', async () => {
    useGameStore.getState().startGame(kingdom, 'bigMoney');
    setHuman({ hand: ['Copper'], phase: Phase.Buy, coins: 3, buys: 1 });
    const beforeBuy = useGameStore.getState().gameState!;
    useGameStore.getState().buyCard('Silver');

    await reload();
    expect(selectUndoableBuy(useGameStore.getState())).toBe('Silver');
    useGameStore.getState().undoBuy();
    expect(useGameStore.getState().gameState).toEqual(beforeBuy);
  });

  it('結果画面で再読み込みしても結果画面のまま。「同じキングダムでもう一度」も使える', async () => {
    useGameStore.getState().startGame(kingdom, 'bigMoneySmithy');
    const gs = useGameStore.getState().gameState!;
    useGameStore.setState({
      page: 'result',
      gameState: { ...gs, gameOver: true, turnNumber: 25 },
    });

    await reload();
    expect(useGameStore.getState().page).toBe('result');
    expect(useGameStore.getState().gameState!.gameOver).toBe(true);

    useGameStore.getState().restartGame();
    const s = useGameStore.getState();
    expect(s.page).toBe('game');
    expect(s.gameState!.gameOver).toBe(false);
    expect(s.gameState!.turnNumber).toBe(1);
    expect(s.aiStrategy).toBe('bigMoneySmithy');
    expect(s.gameState!.supply.slice(7).map((p) => p.card.name)).toEqual(
      kingdom.map((c) => c.name),
    );
  });

  it('保存データが壊れていたらタイトルから始める（止まらない）', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    mem.setItem(SAVE_KEY, '{"state":{"page":"game","gameState":{}}');
    await useGameStore.persist.rehydrate();
    expect(useGameStore.getState().page).toBe('title');
    expect(useGameStore.getState().gameState).toBeNull();
  });

  it('知らない版の保存データは使わない（タイトルから）', async () => {
    useGameStore.getState().startGame(kingdom, 'bigMoney');
    const raw = savedJson();
    await reload();
    expect(useGameStore.getState().page).toBe('game');

    useGameStore.setState({ page: 'title', gameState: null });
    mem.setItem(
      SAVE_KEY,
      JSON.stringify({ ...raw, version: SAVE_VERSION + 1 }),
    );
    await useGameStore.persist.rehydrate();
    expect(useGameStore.getState().page).toBe('title');
    expect(useGameStore.getState().gameState).toBeNull();
  });
});

describe('同じキングダムでもう一度', () => {
  it('前回の設定（キングダムと AI）で新しいゲームを始める', () => {
    useGameStore.getState().startGame(kingdom, 'bigMoneySmithy');
    useGameStore.setState({ page: 'result' });
    useGameStore.getState().restartGame();
    const s = useGameStore.getState();
    expect(s.page).toBe('game');
    expect(s.aiStrategy).toBe('bigMoneySmithy');
    expect(s.gameState!.turnNumber).toBe(1);
  });

  it('前回の設定が無ければ何もしない', () => {
    useGameStore.getState().restartGame();
    expect(useGameStore.getState().page).toBe('title');
    expect(initial.lastSetup).toBeNull();
  });
});
