import { useEffect, useId, useRef, useState } from 'react';
import { getEffectTitle } from '../constants/effectLabels';
import { getCardDef } from '../domain/card';
import type { PendingEffectChoice } from '../domain/effect';
import { useDialogKeyboard } from '../hooks/useDialogKeyboard';
import { useViewportWidth } from '../hooks/useViewportWidth';
import { getTabbable } from '../lib/focus';
import type { CardInstance, PendingEffect, SupplyPile } from '../types';
import { CardType } from '../types';
import CardView from './CardView';

interface PendingEffectUIProps {
  pendingEffect: PendingEffect;
  hand: CardInstance[];
  /** 先触れ（捨て札から選ぶ）・家臣（めくって捨てたカードを見せる）で使う */
  discard: CardInstance[];
  supply: SupplyPile[];
  onResolve: (choice: PendingEffectChoice) => void;
}

const PRIMARY_BUTTON =
  'min-h-11 px-4 py-2 rounded font-medium text-white bg-purple-600 hover:bg-purple-700 transition-colors disabled:bg-slate-600 disabled:text-slate-300 disabled:cursor-not-allowed';
const SECONDARY_BUTTON =
  'min-h-11 px-4 py-2 rounded font-medium text-slate-300 border border-slate-500 hover:bg-slate-700 transition-colors';
// 確定の行。中身が画面より高いときも画面の下に貼り付いて押せるようにする。
// スマホ幅では 案内の 1 行 → 横いっぱいのボタン の縦並びにして、案内の長さで高さが変わらないようにする
const FOOTER =
  'sticky bottom-0 z-10 py-3 bg-slate-800 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3';

// 狭い画面（スマホ）では小さいカードで並べる
const NARROW_MAX_WIDTH = 640;
function useIsNarrow(): boolean {
  return useViewportWidth() < NARROW_MAX_WIDTH;
}

// 選択待ちが新しくなったら（玉座の間の 2 回目のように同じ種類が続いても）選択状態を作り直すための番号。
// ストアは選択待ちを解決するたびに新しいオブジェクトを作るので、オブジェクトごとに番号を振る
const pendingKeys = new WeakMap<PendingEffect, number>();
let nextPendingKey = 0;
function getPendingKey(pending: PendingEffect): number {
  let key = pendingKeys.get(pending);
  if (key === undefined) {
    nextPendingKey += 1;
    key = nextPendingKey;
    pendingKeys.set(pending, key);
  }
  return key;
}

function nameOf(card: CardInstance): string {
  return card.def.nameJa ?? card.def.name;
}

// ===== 手札・捨て札からカードを選ぶ =====

function CardPicker({
  cards,
  min,
  max,
  confirmLabel,
  onConfirm,
  emptyMessage = '手札がありません',
}: {
  cards: CardInstance[];
  /** これより少ないと確定できない */
  min: number;
  /** 選べる上限（無ければ何枚でも） */
  max?: number;
  confirmLabel: (chosen: CardInstance[]) => string;
  onConfirm: (instanceIds: string[]) => void;
  emptyMessage?: string;
}) {
  const narrow = useIsNarrow();
  const [selected, setSelected] = useState<string[]>([]);
  const [limitHit, setLimitHit] = useState(false);

  function toggle(id: string) {
    setLimitHit(false);
    if (selected.includes(id)) {
      setSelected(selected.filter((x) => x !== id));
    } else if (max === 1) {
      // 1 枚だけ選ぶときは、別のカードを押したら選び直しにする
      setSelected([id]);
    } else if (max !== undefined && selected.length >= max) {
      setLimitHit(true);
    } else {
      setSelected([...selected, id]);
    }
  }

  if (cards.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-slate-400 text-sm mb-3">{emptyMessage}</p>
        <button
          type="button"
          className={PRIMARY_BUTTON}
          onClick={() => onConfirm([])}
        >
          スキップ
        </button>
      </div>
    );
  }

  const chosen = selected
    .map((id) => cards.find((c) => c.instanceId === id))
    .filter((c): c is CardInstance => c !== undefined);
  const short = min - chosen.length;

  return (
    <div>
      <div className="flex flex-wrap gap-2 pb-4">
        {cards.map((c) => (
          <CardView
            key={c.instanceId}
            card={c}
            small={narrow}
            selected={selected.includes(c.instanceId)}
            onClick={() => toggle(c.instanceId)}
            detailOnTap
            toggle
            label={nameOf(c)}
          />
        ))}
      </div>
      <div className={FOOTER}>
        <p className="text-sm text-slate-400" aria-live="polite">
          <span className="font-semibold text-slate-200">
            {max !== undefined
              ? `${chosen.length}/${max}枚`
              : `${chosen.length}枚選択中`}
          </span>
          {limitHit ? (
            <span className="ml-2 text-amber-300">
              {max}枚までです（外すにはもう一度押す）
            </span>
          ) : (
            short > 0 && (
              <span className="ml-2 text-amber-300">
                あと{short}枚選んでください
              </span>
            )
          )}
        </p>
        <button
          type="button"
          className={PRIMARY_BUTTON}
          disabled={short > 0}
          onClick={() => onConfirm(chosen.map((c) => c.instanceId))}
        >
          {confirmLabel(chosen)}
        </button>
      </div>
    </div>
  );
}

// ===== サプライから獲得するカードを選ぶ（選ぶ → 確定の 2 段） =====

function SupplyPicker({
  supply,
  maxCost,
  onlyTreasure = false,
  toHand = false,
  onResolve,
}: {
  supply: SupplyPile[];
  maxCost: number;
  onlyTreasure?: boolean;
  toHand?: boolean;
  onResolve: (choice: PendingEffectChoice) => void;
}) {
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const available = supply.filter(
    (p) =>
      p.count > 0 &&
      p.card.cost <= maxCost &&
      (!onlyTreasure || p.card.types.includes(CardType.Treasure)),
  );
  const where = toHand ? '手札に' : '';

  if (available.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-slate-400 text-sm mb-3">
          獲得できるカードがありません
        </p>
        <button
          type="button"
          className={PRIMARY_BUTTON}
          onClick={() => onResolve({})}
        >
          獲得せずに終える
        </button>
      </div>
    );
  }

  const selectedPile = available.find((p) => p.card.name === selectedName);
  const selectedNameJa = selectedPile
    ? (selectedPile.card.nameJa ?? selectedPile.card.name)
    : null;

  return (
    <div>
      <div className="flex flex-wrap gap-2 pb-4">
        {available.map((p) => (
          <CardView
            key={p.card.name}
            card={p.card}
            small
            selected={p.card.name === selectedName}
            onClick={() =>
              setSelectedName((prev) =>
                prev === p.card.name ? null : p.card.name,
              )
            }
            detailOnTap
            toggle
            label={`${p.card.nameJa ?? p.card.name}（コスト ${p.card.cost}）`}
          />
        ))}
      </div>
      <div className={FOOTER}>
        <p className="text-sm text-slate-400" aria-live="polite">
          {selectedNameJa ? (
            <span className="font-semibold text-slate-200">
              {selectedNameJa}を選択中
            </span>
          ) : (
            <span className="text-amber-300">
              獲得するカードを1枚選んでください
            </span>
          )}
        </p>
        <button
          type="button"
          className={PRIMARY_BUTTON}
          disabled={!selectedPile}
          onClick={() =>
            selectedPile &&
            onResolve({ selectedCardName: selectedPile.card.name })
          }
        >
          {selectedNameJa
            ? `${selectedNameJa}を${where}獲得する`
            : `${where}獲得する`}
        </button>
      </div>
    </div>
  );
}

// ===== 歩哨: めくった 1 枚ずつ 廃棄 / 捨てる / 戻す を選ぶ =====

type SentryDest = 'trash' | 'discard' | 'keep';
const SENTRY_OPTIONS: { value: SentryDest; label: string }[] = [
  { value: 'trash', label: '廃棄' },
  { value: 'discard', label: '捨てる' },
  { value: 'keep', label: '戻す' },
];

function SentryPicker({
  revealed,
  onResolve,
}: {
  revealed: Array<{ instanceId: string; defName: string }>;
  onResolve: (choice: PendingEffectChoice) => void;
}) {
  const narrow = useIsNarrow();
  const cards: CardInstance[] = revealed.map((r) => ({
    instanceId: r.instanceId,
    def: getCardDef(r.defName),
  }));
  const [dest, setDest] = useState<Record<string, SentryDest>>({});
  // デッキに戻す順（先頭が一番上）。最初はめくった順
  const [order, setOrder] = useState<string[]>(() =>
    cards.map((c) => c.instanceId),
  );
  const destOf = (id: string): SentryDest => dest[id] ?? 'keep';
  const ids = (d: SentryDest) => order.filter((id) => destOf(id) === d);
  const trashIds = ids('trash');
  const discardIds = ids('discard');
  const keepIds = ids('keep');
  const byId = (id: string) => cards.find((c) => c.instanceId === id);

  const summary = [
    trashIds.length > 0 && `廃棄${trashIds.length}枚`,
    discardIds.length > 0 && `捨てる${discardIds.length}枚`,
    keepIds.length > 0 && `戻す${keepIds.length}枚`,
  ]
    .filter(Boolean)
    .join('・');

  return (
    <div>
      <div className="flex flex-col sm:flex-row flex-wrap gap-4 pb-4">
        {cards.map((c) => (
          <div
            key={c.instanceId}
            className="flex sm:flex-col items-center gap-3"
          >
            <CardView card={c} small={narrow} />
            <fieldset className="flex gap-1">
              <legend className="sr-only">{nameOf(c)}をどうするか</legend>
              {SENTRY_OPTIONS.map((o) => {
                const active = destOf(c.instanceId) === o.value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      setDest((prev) => ({ ...prev, [c.instanceId]: o.value }))
                    }
                    className={
                      active
                        ? 'min-h-11 min-w-11 px-3 py-2 rounded text-sm font-medium text-white bg-purple-600 border border-purple-400'
                        : 'min-h-11 min-w-11 px-3 py-2 rounded text-sm font-medium text-slate-300 border border-slate-500 hover:bg-slate-700 transition-colors'
                    }
                  >
                    {o.label}
                  </button>
                );
              })}
            </fieldset>
          </div>
        ))}
      </div>
      {/* 戻す枚数が変わっても高さが変わらないよう、行はいつも出しておく（押した位置がずれないように） */}
      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
        <span>
          {keepIds.length === 0
            ? 'デッキに戻すカードはありません'
            : keepIds.length === 1
              ? `デッキに戻す: ${byId(keepIds[0])?.def.nameJa ?? ''}`
              : `デッキに戻す順（上から）: ${keepIds
                  .map((id, i) => `${i + 1}. ${byId(id)?.def.nameJa ?? ''}`)
                  .join('  ')}`}
        </span>
        <button
          type="button"
          className={`${SECONDARY_BUTTON} ${keepIds.length >= 2 ? '' : 'invisible'}`}
          onClick={() => setOrder((prev) => [...prev].reverse())}
        >
          順番を入れ替える
        </button>
      </div>
      <div className={FOOTER}>
        <p className="text-sm text-slate-400">
          何も押さなければデッキに戻します
        </p>
        <button
          type="button"
          className={PRIMARY_BUTTON}
          onClick={() =>
            onResolve({
              selectedCards: trashIds,
              discardCards: discardIds,
              orderedCards: keepIds,
            })
          }
        >
          {summary}で決定
        </button>
      </div>
    </div>
  );
}

// ===== 家臣: めくって捨てたアクションカードをプレイするか =====

function VassalConfirm({
  card,
  onResolve,
}: {
  card: CardInstance | undefined;
  onResolve: (choice: PendingEffectChoice) => void;
}) {
  const name = card ? nameOf(card) : 'めくったカード';
  return (
    <div>
      {card && (
        <div className="flex justify-center mb-4">
          <CardView card={card} />
        </div>
      )}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className={PRIMARY_BUTTON}
          onClick={() => onResolve({ confirmed: true })}
        >
          {name}をプレイする
        </button>
        <button
          type="button"
          className={SECONDARY_BUTTON}
          onClick={() => onResolve({ confirmed: false })}
        >
          プレイしない
        </button>
      </div>
    </div>
  );
}

// ===== 種類・段階ごとの中身 =====

function PendingBody({
  pendingEffect,
  hand,
  discard,
  supply,
  onResolve,
}: PendingEffectUIProps) {
  const data = pendingEffect.data ?? {};
  const pickCards = (ids: string[]) => onResolve({ selectedCards: ids });
  const first = (chosen: CardInstance[]) =>
    chosen[0] ? nameOf(chosen[0]) : '';

  switch (pendingEffect.type) {
    case 'cellar':
      return (
        <CardPicker
          cards={hand}
          min={0}
          confirmLabel={(c) =>
            c.length === 0
              ? '捨てずに終える'
              : `${c.length}枚捨てて${c.length}枚引く`
          }
          onConfirm={pickCards}
        />
      );
    case 'chapel':
      return (
        <CardPicker
          cards={hand}
          min={0}
          max={4}
          confirmLabel={(c) =>
            c.length === 0 ? '廃棄せずに終える' : `${c.length}枚廃棄する`
          }
          onConfirm={pickCards}
        />
      );
    case 'militia': {
      const required = Math.max(0, hand.length - 3);
      return (
        <CardPicker
          cards={hand}
          min={required}
          max={required}
          confirmLabel={() => `${required}枚捨てる`}
          onConfirm={pickCards}
        />
      );
    }
    case 'poacher': {
      // 手札が足りないときは持っている分だけ
      const required = Math.min(
        (data.discardCount as number) ?? 0,
        hand.length,
      );
      return (
        <CardPicker
          cards={hand}
          min={required}
          max={required}
          confirmLabel={() => `${required}枚捨てる`}
          onConfirm={pickCards}
        />
      );
    }
    case 'throneRoom':
      return (
        <CardPicker
          cards={hand.filter((c) => c.def.types.includes(CardType.Action))}
          min={0}
          max={1}
          confirmLabel={(c) =>
            c.length === 0 ? '使わずに終える' : `${first(c)}を2回使う`
          }
          onConfirm={pickCards}
        />
      );
    case 'harbinger':
      return (
        <CardPicker
          cards={discard}
          min={0}
          max={1}
          emptyMessage="捨て札がありません"
          confirmLabel={(c) =>
            c.length === 0 ? '置かずに終える' : `${first(c)}をデッキの上に置く`
          }
          onConfirm={pickCards}
        />
      );
    case 'sentry':
      return (
        <SentryPicker
          revealed={
            (data.revealedCards ?? []) as Array<{
              instanceId: string;
              defName: string;
            }>
          }
          onResolve={onResolve}
        />
      );
    case 'vassal':
      return (
        <VassalConfirm
          card={discard.find((c) => c.instanceId === data.revealedCardId)}
          onResolve={onResolve}
        />
      );
    case 'workshop':
      return <SupplyPicker supply={supply} maxCost={4} onResolve={onResolve} />;
    case 'remodel':
      if (data.phase === 'gain') {
        return (
          <SupplyPicker
            supply={supply}
            maxCost={((data.trashedCost as number) ?? 0) + 2}
            onResolve={onResolve}
          />
        );
      }
      return (
        <CardPicker
          cards={hand}
          min={1}
          max={1}
          confirmLabel={(c) =>
            c.length === 0 ? '廃棄する' : `${first(c)}を廃棄する`
          }
          onConfirm={pickCards}
        />
      );
    case 'mine':
      if (data.phase === 'gain') {
        return (
          <SupplyPicker
            supply={supply}
            maxCost={((data.trashedCost as number) ?? 0) + 3}
            onlyTreasure
            toHand
            onResolve={onResolve}
          />
        );
      }
      return (
        <CardPicker
          cards={hand.filter((c) => c.def.types.includes(CardType.Treasure))}
          min={0}
          max={1}
          confirmLabel={(c) =>
            c.length === 0 ? '廃棄せずに終える' : `${first(c)}を廃棄する`
          }
          onConfirm={pickCards}
        />
      );
    case 'artisan':
      if (data.phase === 'putBack') {
        return (
          <CardPicker
            cards={hand}
            min={1}
            max={1}
            confirmLabel={(c) =>
              c.length === 0
                ? 'デッキの上に戻す'
                : `${first(c)}をデッキの上に戻す`
            }
            onConfirm={pickCards}
          />
        );
      }
      return (
        <SupplyPicker
          supply={supply}
          maxCost={5}
          toHand
          onResolve={onResolve}
        />
      );
    default:
      return (
        <button
          type="button"
          className={PRIMARY_BUTTON}
          onClick={() => onResolve({})}
        >
          OK
        </button>
      );
  }
}

// 閉じる手段は無い（Esc で閉じると効果が消えるので、選んで確定するまで出しておく）
const noClose = () => {};

export default function PendingEffectUI(props: PendingEffectUIProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const pendingKey = getPendingKey(props.pendingEffect);
  // キーボード: 開いたら最初のカード（無ければ最初のボタン）へ、Tab は中で回す、Esc では閉じない
  useDialogKeyboard(dialogRef, noClose, {
    initialFocus: 'first',
    closeOnEscape: false,
  });

  // 選択待ちが新しくなったら（玉座の間の 2 回目など、画面は開いたまま中身だけ作り直す）、また最初のカードへ。
  // 押した確定ボタンは作り直しで消え、フォーカスが行き場をなくすため
  useEffect(() => {
    void pendingKey; // 選択待ちが変わったときに動かすための依存（中では使わない）
    const dialog = dialogRef.current;
    if (!dialog || dialog.contains(document.activeElement)) return;
    getTabbable(dialog)[0]?.focus();
  }, [pendingKey]);

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="bg-slate-800 border-2 border-purple-500 shadow-2xl rounded-2xl p-4 sm:p-6 max-w-2xl"
    >
      <h2 id={titleId} className="text-lg sm:text-xl font-bold text-white mb-4">
        {getEffectTitle(props.pendingEffect, props.hand.length)}
      </h2>
      <PendingBody key={pendingKey} {...props} />
    </div>
  );
}
