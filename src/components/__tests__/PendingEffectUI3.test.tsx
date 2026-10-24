// @vitest-environment jsdom

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { getCardDef } from '../../domain/card';
import type {
  CardDef,
  CardInstance,
  PendingEffect,
  SupplyPile,
} from '../../types';
import { CardType } from '../../types';
import PendingEffectUI from '../PendingEffectUI';

// framer-motion をモック（jsdomで動かないため）
vi.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      className,
      onClick,
      ...rest
    }: Record<string, unknown>) => {
      const props: Record<string, unknown> = {};
      if (className) props.className = className;
      if (onClick) props.onClick = onClick;
      if (rest['data-testid']) props['data-testid'] = rest['data-testid'];
      return <div {...props}>{children as React.ReactNode}</div>;
    },
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

function makeCardDef(
  name: string,
  cost: number,
  types: CardType[] = [CardType.Action],
): CardDef {
  return { name, nameJa: name, cost, types, effects: {} };
}

let seq = 0;
function makeCard(
  name: string,
  cost = 0,
  types: CardType[] = [CardType.Action],
): CardInstance {
  seq += 1;
  return {
    instanceId: `inst-${name}-${seq}`,
    def: makeCardDef(name, cost, types),
  };
}

function makePending(
  type: PendingEffect['type'],
  data?: Record<string, unknown>,
): PendingEffect {
  return { type, sourceCard: makeCardDef(type, 0), playerId: 'p1', data };
}

function pile(
  name: string,
  cost: number,
  types: CardType[] = [CardType.Action],
): SupplyPile {
  return { card: makeCardDef(name, cost, types), count: 10 };
}

// CardView はツールチップ(0)とカードの見出し(1)で名前を 2 回出す。押すのは見出し
async function pickCard(
  user: ReturnType<typeof userEvent.setup>,
  name: string,
  nth = 0,
) {
  // カードの名前の欄（ツールチップの見出しは除く）
  const heads = screen
    .getAllByText(name)
    .filter((el) => !el.closest('[role="tooltip"]'));
  await user.click(heads[nth]);
}

function renderUI(
  pendingEffect: PendingEffect,
  opts: {
    hand?: CardInstance[];
    discard?: CardInstance[];
    supply?: SupplyPile[];
  } = {},
) {
  const onResolve = vi.fn();
  const utils = render(
    <PendingEffectUI
      pendingEffect={pendingEffect}
      hand={opts.hand ?? []}
      discard={opts.discard ?? []}
      supply={opts.supply ?? []}
      onResolve={onResolve}
    />,
  );
  return { onResolve, ...utils };
}

describe('先触れ: 捨て札から選ぶ', () => {
  it('手札ではなく捨て札のカードが出る', () => {
    renderUI(makePending('harbinger'), {
      hand: [makeCard('Copper', 0, [CardType.Treasure])],
      discard: [makeCard('Gold', 6, [CardType.Treasure])],
    });
    expect(screen.getAllByText('Gold').length).toBeGreaterThan(0);
    expect(screen.queryByText('Copper')).not.toBeInTheDocument();
  });

  it('選んだ捨て札のカードをデッキの上に置く', async () => {
    const user = userEvent.setup();
    const gold = makeCard('Gold', 6, [CardType.Treasure]);
    const { onResolve } = renderUI(makePending('harbinger'), {
      discard: [gold],
    });
    await pickCard(user, 'Gold');
    await user.click(
      screen.getByRole('button', { name: 'Goldをデッキの上に置く' }),
    );
    expect(onResolve).toHaveBeenCalledWith({
      selectedCards: [gold.instanceId],
    });
  });

  it('選ばずに終えることもできる', async () => {
    const user = userEvent.setup();
    const { onResolve } = renderUI(makePending('harbinger'), {
      discard: [makeCard('Gold', 6, [CardType.Treasure])],
    });
    await user.click(screen.getByRole('button', { name: '置かずに終える' }));
    expect(onResolve).toHaveBeenCalledWith({ selectedCards: [] });
  });
});

describe('歩哨: めくった 2 枚を 1 枚ずつ 廃棄 / 捨てる / 戻す', () => {
  const revealed = [
    { instanceId: 'r-estate', defName: 'Estate' },
    { instanceId: 'r-curse', defName: 'Curse' },
  ];
  const estateJa = getCardDef('Estate').nameJa;
  const curseJa = getCardDef('Curse').nameJa;

  it('手札ではなくめくったカードが出る', () => {
    renderUI(makePending('sentry', { revealedCards: revealed }), {
      hand: [makeCard('Copper', 0, [CardType.Treasure])],
    });
    expect(screen.getAllByText(estateJa).length).toBeGreaterThan(0);
    expect(screen.getAllByText(curseJa).length).toBeGreaterThan(0);
    expect(screen.queryByText('Copper')).not.toBeInTheDocument();
  });

  it('廃棄・捨てるを選ぶと、それぞれの ID を渡す', async () => {
    const user = userEvent.setup();
    const { onResolve } = renderUI(
      makePending('sentry', { revealedCards: revealed }),
    );
    const estateGroup = screen.getByRole('group', {
      name: `${estateJa}をどうするか`,
    });
    const curseGroup = screen.getByRole('group', {
      name: `${curseJa}をどうするか`,
    });
    await user.click(within(estateGroup).getByRole('button', { name: '廃棄' }));
    await user.click(
      within(curseGroup).getByRole('button', { name: '捨てる' }),
    );
    expect(
      within(estateGroup).getByRole('button', { name: '廃棄' }),
    ).toHaveAttribute('aria-pressed', 'true');

    await user.click(
      screen.getByRole('button', { name: '廃棄1枚・捨てる1枚で決定' }),
    );
    expect(onResolve).toHaveBeenCalledWith({
      selectedCards: ['r-estate'],
      discardCards: ['r-curse'],
      orderedCards: [],
    });
  });

  it('2 枚とも戻すときは順番を入れ替えられる', async () => {
    const user = userEvent.setup();
    const { onResolve } = renderUI(
      makePending('sentry', { revealedCards: revealed }),
    );
    await user.click(screen.getByRole('button', { name: '順番を入れ替える' }));
    await user.click(screen.getByRole('button', { name: '戻す2枚で決定' }));
    expect(onResolve).toHaveBeenCalledWith({
      selectedCards: [],
      discardCards: [],
      orderedCards: ['r-curse', 'r-estate'],
    });
  });
});

describe('家臣: めくったカードを見せる', () => {
  it('捨て札からめくったカードを探して表示し、プレイするか選べる', async () => {
    const user = userEvent.setup();
    const workshop = makeCard('Workshop', 3);
    const { onResolve } = renderUI(
      makePending('vassal', { revealedCardId: workshop.instanceId }),
      { discard: [makeCard('Copper', 0, [CardType.Treasure]), workshop] },
    );
    expect(screen.getAllByText('Workshop').length).toBeGreaterThan(0);
    expect(screen.queryByText('Copper')).not.toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'Workshopをプレイする' }),
    );
    expect(onResolve).toHaveBeenCalledWith({ confirmed: true });
  });

  it('プレイしないも選べる', async () => {
    const user = userEvent.setup();
    const workshop = makeCard('Workshop', 3);
    const { onResolve } = renderUI(
      makePending('vassal', { revealedCardId: workshop.instanceId }),
      { discard: [workshop] },
    );
    await user.click(screen.getByRole('button', { name: 'プレイしない' }));
    expect(onResolve).toHaveBeenCalledWith({ confirmed: false });
  });
});

describe('確定ボタン: 結果を書き、必要な枚数がそろうまで押せない', () => {
  it('改築の廃棄は 1 枚選ぶまで押せない', async () => {
    const user = userEvent.setup();
    const estate = makeCard('Estate', 2, [CardType.Victory]);
    const { onResolve } = renderUI(makePending('remodel', { phase: 'trash' }), {
      hand: [estate],
    });
    expect(screen.getByRole('button', { name: '廃棄する' })).toBeDisabled();
    expect(screen.getByText('あと1枚選んでください')).toBeInTheDocument();

    await pickCard(user, 'Estate');
    await user.click(screen.getByRole('button', { name: 'Estateを廃棄する' }));
    expect(onResolve).toHaveBeenCalledWith({
      selectedCards: [estate.instanceId],
    });
  });

  it('職人の 2 段階目は 1 枚選ぶまで押せず、デッキの上に戻すと書く', async () => {
    const user = userEvent.setup();
    const copper = makeCard('Copper', 0, [CardType.Treasure]);
    const { onResolve } = renderUI(
      makePending('artisan', { phase: 'putBack' }),
      { hand: [copper] },
    );
    expect(
      screen.getByRole('button', { name: 'デッキの上に戻す' }),
    ).toBeDisabled();
    await pickCard(user, 'Copper');
    await user.click(
      screen.getByRole('button', { name: 'Copperをデッキの上に戻す' }),
    );
    expect(onResolve).toHaveBeenCalledWith({
      selectedCards: [copper.instanceId],
    });
  });

  it('鉱山の廃棄は 0 枚でも終えられる（廃棄は任意）', async () => {
    const user = userEvent.setup();
    const { onResolve } = renderUI(makePending('mine', { phase: 'trash' }), {
      hand: [makeCard('Copper', 0, [CardType.Treasure])],
    });
    await user.click(screen.getByRole('button', { name: '廃棄せずに終える' }));
    expect(onResolve).toHaveBeenCalledWith({ selectedCards: [] });
  });

  it('密猟者は捨てる枚数を出し、そろうまで押せない', async () => {
    const user = userEvent.setup();
    const hand = [
      makeCard('Copper', 0, [CardType.Treasure]),
      makeCard('Estate', 2, [CardType.Victory]),
      makeCard('Silver', 3, [CardType.Treasure]),
    ];
    const { onResolve } = renderUI(
      makePending('poacher', { discardCount: 2 }),
      { hand },
    );
    expect(screen.getByText('0/2枚')).toBeInTheDocument();
    const confirm = screen.getByRole('button', { name: '2枚捨てる' });
    expect(confirm).toBeDisabled();

    await pickCard(user, 'Copper');
    expect(screen.getByText('1/2枚')).toBeInTheDocument();
    expect(screen.getByText('あと1枚選んでください')).toBeInTheDocument();
    expect(confirm).toBeDisabled();

    await pickCard(user, 'Estate');
    expect(confirm).toBeEnabled();
    await user.click(confirm);
    expect(onResolve).toHaveBeenCalledWith({
      selectedCards: [hand[0].instanceId, hand[1].instanceId],
    });
  });

  it('密猟者で手札が足りないときは手札の枚数だけでよい', () => {
    renderUI(makePending('poacher', { discardCount: 2 }), {
      hand: [makeCard('Copper', 0, [CardType.Treasure])],
    });
    expect(screen.getByText('0/1枚')).toBeInTheDocument();
  });

  it('民兵は手札が 3 枚になる枚数を選ぶまで押せない', async () => {
    const user = userEvent.setup();
    const hand = ['A', 'B', 'C', 'D', 'E'].map((n) =>
      makeCard(n, 0, [CardType.Treasure]),
    );
    renderUI(makePending('militia'), { hand });
    const confirm = screen.getByRole('button', { name: '2枚捨てる' });
    expect(confirm).toBeDisabled();
    await pickCard(user, 'A');
    await pickCard(user, 'B');
    expect(confirm).toBeEnabled();
  });

  it('礼拝堂は 5 枚目を押すと上限の案内が出る', async () => {
    const user = userEvent.setup();
    const hand = ['A', 'B', 'C', 'D', 'E'].map((n) =>
      makeCard(n, 0, [CardType.Treasure]),
    );
    renderUI(makePending('chapel'), { hand });
    for (const n of ['A', 'B', 'C', 'D', 'E']) {
      await pickCard(user, n);
    }
    expect(screen.getByText('4/4枚')).toBeInTheDocument();
    expect(
      screen.getByText(/4枚までです（外すにはもう一度押す）/),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '4枚廃棄する' })).toBeEnabled();
  });

  it('玉座の間はアクションだけを出し、2 回使うと書く', async () => {
    const user = userEvent.setup();
    const workshop = makeCard('Workshop', 3);
    const { onResolve } = renderUI(makePending('throneRoom'), {
      hand: [workshop, makeCard('Copper', 0, [CardType.Treasure])],
    });
    expect(screen.queryByText('Copper')).not.toBeInTheDocument();
    await pickCard(user, 'Workshop');
    await user.click(screen.getByRole('button', { name: 'Workshopを2回使う' }));
    expect(onResolve).toHaveBeenCalledWith({
      selectedCards: [workshop.instanceId],
    });
  });
});

describe('獲得: 選ぶ → 確定 の 2 段', () => {
  it('カードを押しただけでは獲得せず、確定で獲得する', async () => {
    const user = userEvent.setup();
    const { onResolve } = renderUI(makePending('workshop'), {
      supply: [pile('Village', 3), pile('Smithy', 4)],
    });
    expect(screen.getByRole('button', { name: '獲得する' })).toBeDisabled();

    await pickCard(user, 'Village');
    expect(onResolve).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Villageを獲得する' }));
    expect(onResolve).toHaveBeenCalledWith({ selectedCardName: 'Village' });
  });

  it('職人の獲得は「手札に獲得する」と書く', async () => {
    const user = userEvent.setup();
    renderUI(makePending('artisan', { phase: 'gain' }), {
      supply: [pile('Village', 3)],
    });
    await pickCard(user, 'Village');
    expect(
      screen.getByRole('button', { name: 'Villageを手札に獲得する' }),
    ).toBeEnabled();
  });

  it('獲得できるカードが無いときは終えるボタンを出す', async () => {
    const user = userEvent.setup();
    const { onResolve } = renderUI(makePending('workshop'), {
      supply: [pile('Market', 5)],
    });
    await user.click(screen.getByRole('button', { name: '獲得せずに終える' }));
    expect(onResolve).toHaveBeenCalledWith({});
  });
});

describe('選択待ちが新しくなったら選択をリセットする', () => {
  it('同じ種類の選択待ちが続いても、前の選択は残らない（玉座の間の 2 回目など）', async () => {
    const user = userEvent.setup();
    const hand = [
      makeCard('A', 0, [CardType.Treasure]),
      makeCard('B', 0, [CardType.Treasure]),
    ];
    const { rerender } = renderUI(makePending('chapel'), { hand });
    await pickCard(user, 'A');
    expect(screen.getByText('1/4枚')).toBeInTheDocument();

    rerender(
      <PendingEffectUI
        pendingEffect={makePending('chapel')}
        hand={hand}
        discard={[]}
        supply={[]}
        onResolve={vi.fn()}
      />,
    );
    expect(screen.getByText('0/4枚')).toBeInTheDocument();
  });
});
