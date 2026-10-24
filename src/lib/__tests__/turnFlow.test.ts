// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { createCardInstance, getCardDef } from '../../domain/card';
import { createGame } from '../../domain/game';
import type { GameState, PendingEffect } from '../../types';
import { Phase } from '../../types';
import {
  BUY_PHASE_NOTICE,
  getTurnGuide,
  getTurnNotice,
  needsConfirmToEndTurn,
  shouldAutoSkipActionPhase,
  TURN_ACTION_CONFIRM,
  TURN_START_NOTICE,
} from '../turnFlow';

const kingdom = [
  'Cellar',
  'Chapel',
  'Village',
  'Workshop',
  'Smithy',
  'Remodel',
  'Militia',
  'Market',
  'Mine',
  'Witch',
].map(getCardDef);

const noShuffle = <T>(a: T[]) => [...a];

function cards(names: string[]) {
  return names.map((n) => createCardInstance(getCardDef(n)));
}

/** 人間（0 番）の番の場面を作る */
function scene(
  opts: {
    hand?: string[];
    phase?: Phase;
    actions?: number;
    buys?: number;
    coins?: number;
    current?: number;
    pending?: PendingEffect | null;
    gameOver?: boolean;
    counts?: Record<string, number>;
  } = {},
): GameState {
  const g = createGame(['あなた', 'AI'], kingdom, noShuffle);
  const counts = opts.counts ?? {};
  return {
    ...g,
    players: [
      { ...g.players[0], hand: cards(opts.hand ?? ['Copper', 'Estate']) },
      g.players[1],
    ],
    supply: g.supply.map((p) =>
      p.card.name in counts ? { ...p, count: counts[p.card.name] } : p,
    ),
    currentPlayerIndex: opts.current ?? 0,
    phase: opts.phase ?? Phase.Action,
    turnState: {
      actions: opts.actions ?? 1,
      buys: opts.buys ?? 1,
      coins: opts.coins ?? 0,
    },
    pendingEffect: opts.pending ?? null,
    gameOver: opts.gameOver ?? false,
  };
}

const chapelPending: PendingEffect = {
  type: 'chapel',
  sourceCard: getCardDef('Chapel'),
  playerId: '0',
};

describe('shouldAutoSkipActionPhase: 使えるアクションが無ければ購入フェーズへ自動で進める', () => {
  it('手札にアクションカードが無ければ進める', () => {
    expect(
      shouldAutoSkipActionPhase(scene({ hand: ['Copper', 'Estate'] })),
    ).toBe(true);
  });

  it('アクションが 0 なら、アクションカードを持っていても進める', () => {
    expect(
      shouldAutoSkipActionPhase(scene({ hand: ['Smithy'], actions: 0 })),
    ).toBe(true);
  });

  it('アクションが残っていてアクションカードがあれば止まる', () => {
    expect(
      shouldAutoSkipActionPhase(scene({ hand: ['Smithy', 'Copper'] })),
    ).toBe(false);
  });

  it('選択待ちの間は進めない', () => {
    expect(
      shouldAutoSkipActionPhase(scene({ hand: [], pending: chapelPending })),
    ).toBe(false);
  });

  it('AI の番・購入フェーズ・ゲーム終了後は進めない', () => {
    expect(shouldAutoSkipActionPhase(scene({ current: 1 }))).toBe(false);
    expect(shouldAutoSkipActionPhase(scene({ phase: Phase.Buy }))).toBe(false);
    expect(shouldAutoSkipActionPhase(scene({ gameOver: true }))).toBe(false);
  });
});

describe('「購入へ進む」の確認: アクションが使えるのに購入へ進むときだけ確認する', () => {
  const needsConfirm = TURN_ACTION_CONFIRM['end-actions'].needsConfirm;

  it('プレイできるアクションカードが残っていれば確認する', () => {
    expect(needsConfirm(scene({ hand: ['Workshop'] }))).toBe(true);
  });

  it('アクションが 0、またはアクションカードが無ければ確認しない', () => {
    expect(needsConfirm(scene({ hand: ['Workshop'], actions: 0 }))).toBe(false);
    expect(needsConfirm(scene({ hand: ['Copper'] }))).toBe(false);
  });
});

describe('needsConfirmToEndTurn: 買えるのにターンを終えるときだけ確認する', () => {
  it('購入が残っていて、コインで買えるカード（コスト 1 以上）があれば確認する', () => {
    expect(
      needsConfirmToEndTurn(scene({ phase: Phase.Buy, coins: 2, buys: 1 })),
    ).toBe(true);
  });

  it('購入が 0 なら確認しない', () => {
    expect(
      needsConfirmToEndTurn(scene({ phase: Phase.Buy, coins: 8, buys: 0 })),
    ).toBe(false);
  });

  it('コイン 0〜1 で買えるのが銅貨・呪い（コスト 0）だけなら確認しない（毎ターン確認が出ないように）', () => {
    expect(
      needsConfirmToEndTurn(scene({ phase: Phase.Buy, coins: 0, buys: 1 })),
    ).toBe(false);
    expect(
      needsConfirmToEndTurn(scene({ phase: Phase.Buy, coins: 1, buys: 1 })),
    ).toBe(false);
  });

  it('買える値段のカードが売り切れなら確認しない', () => {
    expect(
      needsConfirmToEndTurn(
        scene({
          phase: Phase.Buy,
          coins: 2,
          buys: 1,
          counts: { Cellar: 0, Chapel: 0, Estate: 0 },
        }),
      ),
    ).toBe(false);
  });
});

describe('getTurnNotice: ターン・フェーズが変わったときのお知らせ', () => {
  const human = (turnNumber: number, phase: Phase) => ({
    turnNumber,
    isHumanTurn: true,
    phase,
  });
  const ai = (turnNumber: number) => ({
    turnNumber,
    isHumanTurn: false,
    phase: Phase.Action,
  });

  it('ゲーム開始時（前の状態なし）に自分の番なら「あなたのターン」', () => {
    expect(getTurnNotice(null, human(1, Phase.Buy))).toBe(TURN_START_NOTICE);
  });

  it('AI の番から自分の番に替わったら「あなたのターン」（自動で購入フェーズに進んでいても）', () => {
    expect(getTurnNotice(ai(2), human(3, Phase.Action))).toBe(
      TURN_START_NOTICE,
    );
    expect(getTurnNotice(ai(2), human(3, Phase.Buy))).toBe(TURN_START_NOTICE);
  });

  it('自分の番の中でアクション → 購入に進んだら「購入フェーズ」', () => {
    expect(getTurnNotice(human(3, Phase.Action), human(3, Phase.Buy))).toBe(
      BUY_PHASE_NOTICE,
    );
  });

  it('AI の番・変化なしのときは出さない', () => {
    expect(getTurnNotice(human(3, Phase.Buy), ai(4))).toBeNull();
    expect(getTurnNotice(human(3, Phase.Buy), human(3, Phase.Buy))).toBeNull();
  });
});

describe('getTurnGuide: 次に何をすればよいかの一言と主ボタン', () => {
  it('アクションフェーズ: カードをプレイするか「購入へ進む」', () => {
    const g = getTurnGuide(scene({ hand: ['Workshop'] }));
    expect(g.message).toBe('光っているカードをプレイするか「購入へ進む」');
    expect(g.action).toBe('end-actions');
    expect(g.busy).toBe(false);
  });

  it('購入フェーズで購入が残っている: カードを買うか「ターン終了」', () => {
    const g = getTurnGuide(scene({ phase: Phase.Buy, coins: 3 }));
    expect(g.message).toBe('光っているカードを買うか「ターン終了」');
    expect(g.action).toBe('end-turn');
  });

  it('購入を使い切った: 「ターン終了」を案内する', () => {
    const g = getTurnGuide(scene({ phase: Phase.Buy, buys: 0 }));
    expect(g.message).toBe('購入はここまで。「ターン終了」へ');
    expect(g.action).toBe('end-turn');
  });

  it('属州が無くなった購入フェーズ: ターンを終えるとゲーム終了だと予告する', () => {
    const g = getTurnGuide(
      scene({ phase: Phase.Buy, buys: 0, counts: { Province: 0 } }),
    );
    expect(g.message).toBe(
      '属州の山がなくなりました。ターンを終えるとゲーム終了です',
    );
    expect(g.action).toBe('end-turn');
  });

  it('自分の選択待ち: 効果を選ぶよう案内し、ボタンは出さない', () => {
    const g = getTurnGuide(scene({ hand: [], pending: chapelPending }));
    expect(g.message).toBe('効果を選んでください');
    expect(g.action).toBeNull();
  });

  it('AI の番・AI の選択待ち: 考え中（ボタンなし）', () => {
    const g = getTurnGuide(scene({ current: 1 }));
    expect(g.message).toBe('AIが考えています...');
    expect(g.busy).toBe(true);
    expect(g.action).toBeNull();
    const militia = getTurnGuide(
      scene({
        hand: [],
        pending: {
          type: 'militia',
          sourceCard: getCardDef('Militia'),
          playerId: '1',
        },
      }),
    );
    expect(militia.busy).toBe(true);
    expect(militia.action).toBeNull();
  });

  it('ゲーム終了後: ボタンなし', () => {
    const g = getTurnGuide(scene({ gameOver: true, current: 1 }));
    expect(g.message).toBe('ゲーム終了');
    expect(g.action).toBeNull();
    expect(g.busy).toBe(false);
  });
});
