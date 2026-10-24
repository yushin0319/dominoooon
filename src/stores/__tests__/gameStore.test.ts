// @vitest-environment node
import { beforeEach, describe, expect, it } from 'vitest';
import { createCardInstance, getCardDef } from '../../domain/card';
import { Phase } from '../../types';
import {
  selectAITurnStep,
  selectUndoableBuy,
  useGameStore,
} from '../gameStore';

const kingdom = [
  getCardDef('Village'),
  getCardDef('Smithy'),
  getCardDef('Market'),
  getCardDef('Festival'),
  getCardDef('Laboratory'),
  getCardDef('Cellar'),
  getCardDef('Moat'),
  getCardDef('Militia'),
  getCardDef('Mine'),
  getCardDef('Witch'),
];

beforeEach(() => {
  // Reset store to initial state
  useGameStore.setState({
    page: 'title',
    gameState: null,
    lastBuy: null,
    aiTurn: null,
    aiStrategy: 'bigMoney',
    shuffleFn: useGameStore.getState().shuffleFn,
  });
});

/** 人間（0 番）の手札・山札・フェーズなどを差し替える */
function setHuman(opts: {
  hand: string[];
  deck?: string[];
  phase?: Phase;
  actions?: number;
  buys?: number;
  coins?: number;
}) {
  const gs = useGameStore.getState().gameState!;
  const mk = (names: string[]) =>
    names.map((n) => createCardInstance(getCardDef(n)));
  const human = {
    ...gs.players[0],
    hand: mk(opts.hand),
    deck: opts.deck ? mk(opts.deck) : gs.players[0].deck,
    playArea: [],
  };
  useGameStore.setState({
    gameState: {
      ...gs,
      players: [human, gs.players[1]],
      currentPlayerIndex: 0,
      phase: opts.phase ?? Phase.Action,
      turnState: {
        actions: opts.actions ?? 1,
        buys: opts.buys ?? 1,
        coins: opts.coins ?? 0,
      },
      pendingEffect: null,
    },
  });
}

function instanceIdOf(name: string): string {
  const card = useGameStore
    .getState()
    .gameState!.players[0].hand.find((c) => c.def.name === name);
  if (!card) throw new Error(`hand has no ${name}`);
  return card.instanceId;
}

describe('initial state', () => {
  it('starts with page=title and gameState=null', () => {
    const state = useGameStore.getState();
    expect(state.page).toBe('title');
    expect(state.gameState).toBeNull();
  });
});

describe('page navigation', () => {
  it('goToSetup changes page to setup', () => {
    useGameStore.getState().goToSetup();
    expect(useGameStore.getState().page).toBe('setup');
  });

  it('goToTitle changes page to title', () => {
    useGameStore.getState().goToSetup();
    useGameStore.getState().goToTitle();
    expect(useGameStore.getState().page).toBe('title');
  });
});

describe('startGame', () => {
  it('creates game and sets page to game', () => {
    useGameStore.getState().startGame(kingdom, 'bigMoney');
    const state = useGameStore.getState();
    expect(state.page).toBe('game');
    expect(state.gameState).not.toBeNull();
    expect(state.aiStrategy).toBe('bigMoney');
    expect(state.gameState!.players).toHaveLength(2);
    expect(state.gameState!.players[0].name).toBe('あなた');
    expect(state.gameState!.players[1].name).toBe('AI');
  });

  it('starts with player 0. 初期手札（銅貨・屋敷）にはアクションカードが無いので、購入フェーズから始まる', () => {
    useGameStore.getState().startGame(kingdom, 'bigMoneySmithy');
    const gs = useGameStore.getState().gameState!;
    expect(gs.currentPlayerIndex).toBe(0);
    expect(gs.phase).toBe(Phase.Buy);
    // 財宝は自動で場に出ている（手札の銅貨の枚数ぶんのコイン）
    expect(gs.players[0].hand.some((c) => c.def.name === 'Copper')).toBe(false);
    expect(gs.turnState.coins).toBe(
      gs.players[0].playArea.filter((c) => c.def.name === 'Copper').length,
    );
  });
});

describe('isHumanTurn / isAITurn', () => {
  it('isHumanTurn returns true when currentPlayerIndex=0', () => {
    useGameStore.getState().startGame(kingdom, 'bigMoney');
    const gs = useGameStore.getState().gameState;
    expect(gs?.currentPlayerIndex === 0).toBe(true);
    expect(gs?.currentPlayerIndex === 1).toBe(false);
  });
});

describe('skipAction', () => {
  it('advances from Action to Buy phase', () => {
    useGameStore.getState().startGame(kingdom, 'bigMoney');
    // 自動で購入フェーズに進まないよう、プレイできるアクションカードを持たせる
    setHuman({ hand: ['Village', 'Copper'], phase: Phase.Action });

    useGameStore.getState().skipAction();
    expect(useGameStore.getState().gameState!.phase).toBe(Phase.Buy);
  });

  it('アクションフェーズ以外では何もしない（購入フェーズで押してもクリーンアップに進まない）', () => {
    useGameStore.getState().startGame(kingdom, 'bigMoney');
    setHuman({ hand: ['Copper'], phase: Phase.Buy });
    const before = useGameStore.getState().gameState;

    useGameStore.getState().skipAction();
    expect(useGameStore.getState().gameState).toBe(before);
  });
});

describe('playAction', () => {
  it('plays an action card', () => {
    useGameStore.getState().startGame(kingdom, 'bigMoney');
    const gs = useGameStore.getState().gameState!;
    const player = gs.players[0];

    // Give player a Village in hand for testing
    const village = createCardInstance(getCardDef('Village'));
    const deck = Array(3)
      .fill(null)
      .map(() => createCardInstance(getCardDef('Copper')));
    const modifiedPlayer = {
      ...player,
      hand: [village, ...player.hand],
      deck: [...deck, ...player.deck],
    };
    const modifiedState = {
      ...gs,
      players: [modifiedPlayer, gs.players[1]],
    };
    useGameStore.setState({ gameState: modifiedState });

    useGameStore.getState().playAction(village.instanceId);
    const after = useGameStore.getState().gameState!;
    expect(
      after.players[0].playArea.some(
        (c) => c.instanceId === village.instanceId,
      ),
    ).toBe(true);
    expect(after.turnState.actions).toBe(2); // 1 - 1 + 2 (Village)
  });
});

describe('buyCard', () => {
  it('buys a card and reduces coins/buys', () => {
    useGameStore.getState().startGame(kingdom, 'bigMoney');
    // Set up Buy phase with enough coins
    const gs = useGameStore.getState().gameState!;
    useGameStore.setState({
      gameState: {
        ...gs,
        phase: Phase.Buy,
        turnState: { actions: 0, buys: 1, coins: 5 },
      },
    });

    useGameStore.getState().buyCard('Market');
    const after = useGameStore.getState().gameState!;
    expect(after.players[0].discard.some((c) => c.def.name === 'Market')).toBe(
      true,
    );
    expect(after.turnState.coins).toBe(0);
    expect(after.turnState.buys).toBe(0);
  });
});

describe('skipBuy', () => {
  it('ends turn and moves to next player', () => {
    useGameStore.getState().startGame(kingdom, 'bigMoney');
    // 初期手札にアクションカードは無いので、もう購入フェーズにいる
    expect(useGameStore.getState().gameState!.phase).toBe(Phase.Buy);

    useGameStore.getState().skipBuy();
    const after = useGameStore.getState().gameState!;
    // After skipBuy: endTurn is called, next player
    expect(after.currentPlayerIndex).toBe(1);
    expect(after.phase).toBe(Phase.Action);
    expect(after.turnNumber).toBe(2);
  });
});

describe('executeAITurn', () => {
  it('executes AI turn with bigMoney strategy', () => {
    useGameStore.getState().startGame(kingdom, 'bigMoney');
    // Skip human turn（初期手札にアクションカードは無いので、もう購入フェーズにいる）
    useGameStore.getState().skipBuy();
    expect(useGameStore.getState().gameState!.currentPlayerIndex).toBe(1);

    useGameStore.getState().executeAITurn();
    const after = useGameStore.getState().gameState!;
    expect(after.currentPlayerIndex).toBe(0); // back to human
    expect(after.turnNumber).toBe(3);
  });

  it('executes AI turn with bigMoneySmithy strategy', () => {
    useGameStore.getState().startGame(kingdom, 'bigMoneySmithy');
    useGameStore.getState().skipBuy();
    expect(useGameStore.getState().gameState!.currentPlayerIndex).toBe(1);

    useGameStore.getState().executeAITurn();
    const after = useGameStore.getState().gameState!;
    expect(after.currentPlayerIndex).toBe(0);
  });
});

describe('game over', () => {
  it('sets gameOver flag when game ends', () => {
    useGameStore.getState().startGame(kingdom, 'bigMoney');
    // Empty Province pile to trigger game over
    const gs = useGameStore.getState().gameState!;
    const supply = gs.supply.map((p) =>
      p.card.name === 'Province' ? { ...p, count: 0 } : p,
    );
    useGameStore.setState({
      gameState: { ...gs, supply, phase: Phase.Buy },
    });

    useGameStore.getState().skipBuy();
    // Store はページ遷移せず、gameOver フラグのみセット（GamePage の useEffect が遷移処理）
    expect(useGameStore.getState().gameState?.gameOver).toBe(true);
    expect(useGameStore.getState().page).toBe('game'); // ページ遷移は GamePage 側で行う
  });
});

describe('resolvePending', () => {
  it('resolves a pending effect', () => {
    useGameStore.getState().startGame(kingdom, 'bigMoney');
    const gs = useGameStore.getState().gameState!;

    // Simulate a chapel pending effect
    const copper = createCardInstance(getCardDef('Copper'));
    const modifiedPlayer = {
      ...gs.players[0],
      hand: [copper],
    };
    useGameStore.setState({
      gameState: {
        ...gs,
        players: [modifiedPlayer, gs.players[1]],
        pendingEffect: {
          type: 'chapel',
          sourceCard: getCardDef('Chapel'),
          playerId: '0',
        },
      },
    });

    useGameStore.getState().resolvePending({
      selectedCards: [copper.instanceId],
    });
    const after = useGameStore.getState().gameState!;
    expect(after.pendingEffect).toBeNull();
    expect(after.trash).toHaveLength(1);
  });
});

describe('自動進行: 使えるアクションが無くなったら購入フェーズへ進む', () => {
  it('最後のアクションを使ったら、そのまま購入フェーズへ進み、財宝が場に出る', () => {
    useGameStore.getState().startGame(kingdom, 'bigMoney');
    setHuman({
      hand: ['Smithy', 'Copper', 'Copper'],
      deck: ['Copper', 'Estate', 'Estate'],
    });

    useGameStore.getState().playAction(instanceIdOf('Smithy'));
    const gs = useGameStore.getState().gameState!;
    expect(gs.phase).toBe(Phase.Buy);
    expect(gs.turnState.coins).toBe(3); // 手札の銅貨 2 + 引いた銅貨 1
  });

  it('まだアクションが残っていて、手札にアクションカードがあれば止まる', () => {
    useGameStore.getState().startGame(kingdom, 'bigMoney');
    setHuman({
      hand: ['Village', 'Smithy', 'Copper'],
      deck: ['Copper', 'Copper', 'Copper'],
    });

    useGameStore.getState().playAction(instanceIdOf('Village'));
    expect(useGameStore.getState().gameState!.phase).toBe(Phase.Action);
  });

  it('選択待ち（工房）の間は止まり、選び終えたら購入フェーズへ進む', () => {
    useGameStore.getState().startGame(kingdom, 'bigMoney');
    setHuman({ hand: ['Workshop', 'Copper'] });

    useGameStore.getState().playAction(instanceIdOf('Workshop'));
    let gs = useGameStore.getState().gameState!;
    expect(gs.phase).toBe(Phase.Action);
    expect(gs.pendingEffect?.type).toBe('workshop');

    useGameStore.getState().resolvePending({ selectedCardName: 'Silver' });
    gs = useGameStore.getState().gameState!;
    expect(gs.pendingEffect).toBeNull();
    expect(gs.phase).toBe(Phase.Buy);
  });

  it('AI の番のあと、自分の手札にアクションカードが無ければ購入フェーズから始まる', () => {
    useGameStore.getState().startGame(kingdom, 'bigMoney');
    // ターン終了で次の手札 5 枚を山札から引く
    setHuman({
      hand: ['Copper'],
      deck: ['Copper', 'Copper', 'Estate', 'Estate', 'Copper'],
      phase: Phase.Buy,
    });
    useGameStore.getState().skipBuy();
    useGameStore.getState().executeAITurn();

    const gs = useGameStore.getState().gameState!;
    expect(gs.currentPlayerIndex).toBe(0);
    expect(gs.phase).toBe(Phase.Buy);
    expect(gs.turnState.coins).toBe(3);
  });

  it('AI の番のあと、自分の手札にアクションカードがあればアクションフェーズで止まる', () => {
    useGameStore.getState().startGame(kingdom, 'bigMoney');
    setHuman({
      hand: ['Copper'],
      deck: ['Village', 'Copper', 'Estate', 'Estate', 'Copper'],
      phase: Phase.Buy,
    });
    useGameStore.getState().skipBuy();
    useGameStore.getState().executeAITurn();

    const gs = useGameStore.getState().gameState!;
    expect(gs.currentPlayerIndex).toBe(0);
    expect(gs.phase).toBe(Phase.Action);
  });
});

describe('undoBuy: 直前の 1 回の購入だけ取り消せる', () => {
  it('買う前の状態（コイン・購入回数・サプライの残り・捨て札・ログ）に戻る', () => {
    useGameStore.getState().startGame(kingdom, 'bigMoney');
    setHuman({ hand: [], phase: Phase.Buy, coins: 5 });
    const before = useGameStore.getState().gameState!;

    useGameStore.getState().buyCard('Market');
    expect(selectUndoableBuy(useGameStore.getState())).toBe('Market');

    useGameStore.getState().undoBuy();
    expect(useGameStore.getState().gameState).toEqual(before);
    expect(selectUndoableBuy(useGameStore.getState())).toBeNull();
  });

  it('2 回買ったら、取り消せるのは 2 回目だけ', () => {
    useGameStore.getState().startGame(kingdom, 'bigMoney');
    setHuman({ hand: [], phase: Phase.Buy, coins: 6, buys: 2 });

    useGameStore.getState().buyCard('Silver');
    const afterFirst = useGameStore.getState().gameState!;
    useGameStore.getState().buyCard('Silver');

    useGameStore.getState().undoBuy();
    expect(useGameStore.getState().gameState).toEqual(afterFirst);
    // もう一度押しても、1 回目は取り消さない
    useGameStore.getState().undoBuy();
    expect(useGameStore.getState().gameState).toEqual(afterFirst);
  });

  it('ターンを終えたら取り消せない', () => {
    useGameStore.getState().startGame(kingdom, 'bigMoney');
    setHuman({ hand: [], phase: Phase.Buy, coins: 3 });
    useGameStore.getState().buyCard('Silver');

    useGameStore.getState().skipBuy();
    expect(selectUndoableBuy(useGameStore.getState())).toBeNull();
    const ended = useGameStore.getState().gameState;
    useGameStore.getState().undoBuy();
    expect(useGameStore.getState().gameState).toBe(ended);
  });

  it('新しいゲームを始めたら取り消せない', () => {
    useGameStore.getState().startGame(kingdom, 'bigMoney');
    setHuman({ hand: [], phase: Phase.Buy, coins: 3 });
    useGameStore.getState().buyCard('Silver');

    useGameStore.getState().startGame(kingdom, 'bigMoney');
    expect(selectUndoableBuy(useGameStore.getState())).toBeNull();
  });

  it('買ったあとに状態が変わっていたら取り消さない（古い状態に巻き戻さない）', () => {
    useGameStore.getState().startGame(kingdom, 'bigMoney');
    setHuman({ hand: [], phase: Phase.Buy, coins: 3 });
    useGameStore.getState().buyCard('Silver');
    // 取り消し用の記録を残したまま、ほかの経路で状態が変わった場合
    const changed = {
      ...useGameStore.getState().gameState!,
      turnNumber: 99,
    };
    useGameStore.setState({ gameState: changed });

    expect(selectUndoableBuy(useGameStore.getState())).toBeNull();
    useGameStore.getState().undoBuy();
    expect(useGameStore.getState().gameState).toBe(changed);
  });
});

/** 人間がターンを終えて AI の番にし、AI の手札・山札を差し替える */
function toAITurn(aiHand: string[], aiDeck?: string[]) {
  useGameStore.getState().startGame(kingdom, 'bigMoney');
  setHuman({
    hand: [],
    deck: ['Copper', 'Copper', 'Copper', 'Estate', 'Estate'],
    phase: Phase.Buy,
  });
  useGameStore.getState().skipBuy();
  const gs = useGameStore.getState().gameState!;
  const mk = (names: string[]) =>
    names.map((n) => createCardInstance(getCardDef(n)));
  useGameStore.setState({
    gameState: {
      ...gs,
      players: [
        gs.players[0],
        {
          ...gs.players[1],
          hand: mk(aiHand),
          deck: mk(
            aiDeck ?? ['Copper', 'Copper', 'Copper', 'Estate', 'Estate'],
          ),
          discard: [],
        },
      ],
    },
  });
}

describe('AI のターンを段階ごとに見せる（startAITurn → advanceAITurn）', () => {
  it('始めると、財宝を場に出した段階を見せる（まだ買っていない・番は AI のまま）', () => {
    toAITurn(['Copper', 'Copper', 'Copper', 'Silver', 'Estate']);
    useGameStore.getState().startAITurn();

    const s = useGameStore.getState();
    expect(selectAITurnStep(s)?.kind).toBe('treasure');
    expect(s.gameState!.currentPlayerIndex).toBe(1);
    expect(s.gameState!.players[1].playArea).toHaveLength(4);
    expect(s.gameState!.turnState.coins).toBe(5);
    expect(s.gameState!.players[1].discard).toEqual([]);
  });

  it('進めると購入の段階、もう一度進めると人間の番に戻る', () => {
    toAITurn(['Copper', 'Copper', 'Copper', 'Silver', 'Estate']);
    useGameStore.getState().startAITurn();

    useGameStore.getState().advanceAITurn();
    let s = useGameStore.getState();
    expect(selectAITurnStep(s)?.kind).toBe('buy');
    expect(s.gameState!.players[1].discard.map((c) => c.def.name)).toEqual([
      'Silver',
    ]);
    expect(s.gameState!.log.at(-1)).toBe('AI: 5 コイン → 銀貨を購入');

    useGameStore.getState().advanceAITurn();
    s = useGameStore.getState();
    expect(selectAITurnStep(s)).toBeNull();
    expect(s.aiTurn).toBeNull();
    expect(s.gameState!.currentPlayerIndex).toBe(0);
    // 人間の手札にアクションカードが無いので、購入フェーズから始まる（自動進行）
    expect(s.gameState!.phase).toBe(Phase.Buy);
    expect(s.gameState!.turnState.coins).toBe(3);
  });

  it('途中でスキップ（executeAITurn）すると、最後まで見たときと同じ結果になってすぐ終わる', () => {
    toAITurn(['Copper', 'Copper', 'Copper', 'Silver', 'Estate']);
    useGameStore.getState().startAITurn();
    const planned = useGameStore.getState().aiTurn!.final;

    useGameStore.getState().executeAITurn();
    const s = useGameStore.getState();
    expect(s.aiTurn).toBeNull();
    expect(s.gameState!.currentPlayerIndex).toBe(0);
    expect(s.gameState!.players[1]).toEqual(planned.players[1]);
    expect(s.gameState!.supply).toEqual(planned.supply);
    expect(s.gameState!.log).toEqual(planned.log);
  });

  it('始める前にスキップしても、まとめの 1 行が残る', () => {
    toAITurn(['Copper', 'Copper', 'Estate', 'Estate', 'Estate']);
    useGameStore.getState().executeAITurn();

    const gs = useGameStore.getState().gameState!;
    expect(gs.currentPlayerIndex).toBe(0);
    expect(gs.log.slice(-2)).toEqual([
      '--- ターン2: AIのターン ---',
      'AI: 2 コイン → 購入なし',
    ]);
  });

  it('スキップを 2 回押しても、人間の番を AI が進めない', () => {
    toAITurn(['Copper', 'Copper', 'Copper', 'Silver', 'Estate']);
    useGameStore.getState().startAITurn();
    useGameStore.getState().executeAITurn();
    const afterSkip = useGameStore.getState().gameState;

    useGameStore.getState().executeAITurn();
    useGameStore.getState().advanceAITurn();
    expect(useGameStore.getState().gameState).toBe(afterSkip);
  });

  it('2 回始めても、最初からやり直さない', () => {
    toAITurn(['Copper', 'Copper', 'Copper', 'Silver', 'Estate']);
    useGameStore.getState().startAITurn();
    useGameStore.getState().advanceAITurn();
    const shown = useGameStore.getState().gameState;

    useGameStore.getState().startAITurn();
    expect(useGameStore.getState().gameState).toBe(shown);
    expect(selectAITurnStep(useGameStore.getState())?.kind).toBe('buy');
  });

  it('見せている途中でほかの経路で状態が変わっていたら、古い段階で上書きしない', () => {
    toAITurn(['Copper', 'Copper', 'Copper', 'Silver', 'Estate']);
    useGameStore.getState().startAITurn();
    const changed = {
      ...useGameStore.getState().gameState!,
      turnNumber: 99,
    };
    useGameStore.setState({ gameState: changed });

    useGameStore.getState().advanceAITurn();
    expect(useGameStore.getState().gameState).toBe(changed);
    expect(useGameStore.getState().aiTurn).toBeNull();
  });

  it('人間の番には始めない', () => {
    useGameStore.getState().startGame(kingdom, 'bigMoney');
    const gs = useGameStore.getState().gameState;
    useGameStore.getState().startAITurn();
    expect(useGameStore.getState().gameState).toBe(gs);
    expect(useGameStore.getState().aiTurn).toBeNull();
  });

  it('タイトルへ戻る・新しいゲームを始めると、途中の AI のターンは捨てる', () => {
    toAITurn(['Copper', 'Copper', 'Copper', 'Silver', 'Estate']);
    useGameStore.getState().startAITurn();
    useGameStore.getState().goToTitle();
    expect(useGameStore.getState().aiTurn).toBeNull();

    toAITurn(['Copper', 'Copper', 'Copper', 'Silver', 'Estate']);
    useGameStore.getState().startAITurn();
    useGameStore.getState().startGame(kingdom, 'bigMoney');
    expect(useGameStore.getState().aiTurn).toBeNull();
  });
});

describe('null gameState guards — throw instead of silent return', () => {
  // gameState is null by default (before startGame)
  it('playAction throws when gameState is null', () => {
    expect(() => useGameStore.getState().playAction('some-id')).toThrow();
  });

  it('skipAction throws when gameState is null', () => {
    expect(() => useGameStore.getState().skipAction()).toThrow();
  });

  it('buyCard throws when gameState is null', () => {
    expect(() => useGameStore.getState().buyCard('Copper')).toThrow();
  });

  it('skipBuy throws when gameState is null', () => {
    expect(() => useGameStore.getState().skipBuy()).toThrow();
  });

  it('resolvePending throws when gameState is null', () => {
    expect(() => useGameStore.getState().resolvePending({})).toThrow();
  });

  it('executeAITurn throws when gameState is null', () => {
    expect(() => useGameStore.getState().executeAITurn()).toThrow();
  });

  it('startAITurn throws when gameState is null', () => {
    expect(() => useGameStore.getState().startAITurn()).toThrow();
  });
});
