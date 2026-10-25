import { Check, Shuffle } from 'lucide-react';
import { Fragment, useEffect, useId, useMemo, useState } from 'react';
import CardArt from '../components/CardArt';
import { CARD_DEFS } from '../domain/card';
import { getTextColor, typeNameJa } from '../lib/cardType';
import {
  AI_STRATEGIES,
  getStrategyNote,
  KINGDOM_SIZE,
  toggleKingdomCard,
} from '../lib/setup';
import { cn, getEffectText } from '../lib/utils';
import { useGameStore } from '../stores/gameStore';
import type { AIStrategy, CardDef } from '../types';
import { CardType } from '../types';

const KINGDOM_CARDS: CardDef[] = Object.values(CARD_DEFS).filter(
  (c) =>
    c.types.includes(CardType.Action) ||
    (c.types.includes(CardType.Victory) && c.name === 'Gardens'),
);

/** 10 枚選んだあとに別のカードを押したときの知らせを出しておく時間 */
const FULL_NOTICE_MS = 3000;

function randomKingdom(): CardDef[] {
  const shuffled = [...KINGDOM_CARDS];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, KINGDOM_SIZE);
}

/** タイルの左端の色（ゲーム中のカードの枠の色に合わせる: アタック = 赤 / リアクション = 青 / 勝利点 = 緑） */
function typeBorderLeft(def: CardDef): string {
  if (def.types.includes(CardType.Attack)) return 'border-l-red-500';
  if (def.types.includes(CardType.Reaction)) return 'border-l-blue-500';
  if (def.types.includes(CardType.Victory)) return 'border-l-green-400';
  return 'border-l-slate-400';
}

/**
 * キングダムのカード 1 枚。名前・コスト・種類・効果の文を出し、押すと選ぶ / 外す（aria-pressed）。
 * 選んでいないカードも読める明るさのまま（以前は名前だけで、選んでいないカードは不透明度 40% だった）
 */
function KingdomCardTile({
  def,
  selected,
  refused,
  onToggle,
}: {
  def: CardDef;
  selected: boolean;
  /** 10 枚選んだあとに押されて、選べなかった（押した場所でも分かるよう枠を黄色にする） */
  refused: boolean;
  onToggle: (name: string) => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      data-card={def.name}
      onClick={() => onToggle(def.name)}
      className={cn(
        'relative w-full min-h-[76px] p-2 pl-2.5 text-left rounded-lg border-2 border-l-4 transition-colors',
        selected
          ? 'bg-purple-500/20 border-purple-400 shadow-lg shadow-purple-900/40'
          : 'bg-slate-800/70 border-slate-700 hover:bg-slate-700/70',
        // 左端の色は種類の色（枠の色より後に書く。前に書くと枠の色で上書きされる）
        typeBorderLeft(def),
        refused && 'ring-2 ring-amber-400',
      )}
    >
      <div className="flex items-start gap-2 pr-6">
        {/* 絵の左下にコストの丸を重ねる（対戦画面のカードと同じ並び） */}
        <div className="relative shrink-0">
          <CardArt def={def} lazy className="w-12 h-12" />
          <span className="absolute -bottom-1 -left-1 w-6 h-6 rounded-full border-2 border-slate-400 bg-slate-900 text-xs font-bold text-white flex items-center justify-center">
            {def.cost}
          </span>
        </div>
        <div className="min-w-0">
          <div className="text-sm font-bold leading-tight text-white">
            {def.nameJa}
          </div>
          {/* 種類の名前の途中では折り返さない（「アタッ / ク」と切れていた） */}
          <div className={cn('text-xs leading-tight', getTextColor(def.types))}>
            {def.types.map((t, i) => (
              <Fragment key={t}>
                {i > 0 && ' / '}
                <span className="whitespace-nowrap">{typeNameJa(t)}</span>
              </Fragment>
            ))}
          </div>
        </div>
      </div>
      <p className="mt-1 text-xs leading-snug text-slate-300">
        {getEffectText(def)}
      </p>
      {/* 選んだ印（色だけに頼らない） */}
      <span
        aria-hidden="true"
        className={cn(
          'absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center',
          selected
            ? 'bg-purple-500 text-white'
            : 'border border-slate-500 text-transparent',
        )}
      >
        <Check className="w-3.5 h-3.5" strokeWidth={3} />
      </span>
    </button>
  );
}

export default function SetupPage() {
  const goToTitle = useGameStore((s) => s.goToTitle);
  const startGame = useGameStore((s) => s.startGame);
  const [selected, setSelected] = useState<Set<string>>(() => {
    const initial = randomKingdom();
    return new Set(initial.map((c) => c.name));
  });
  const [aiStrategy, setAIStrategy] = useState<AIStrategy>('bigMoney');
  // 10 枚選んだあとに押されたカード（少しの間「外してから選んで」と出す。続けて押したら数え直すようにオブジェクトで持つ）
  const [fullNotice, setFullNotice] = useState<{ name: string } | null>(null);
  const strategyTitleId = useId();

  const selectedCards = useMemo(
    () => KINGDOM_CARDS.filter((c) => selected.has(c.name)),
    [selected],
  );
  const count = selected.size;
  const ready = count === KINGDOM_SIZE;
  const strategyNote = getStrategyNote(aiStrategy, selected);

  useEffect(() => {
    if (!fullNotice) return;
    const timer = setTimeout(() => setFullNotice(null), FULL_NOTICE_MS);
    return () => clearTimeout(timer);
  }, [fullNotice]);

  function toggleCard(name: string) {
    const { next, result } = toggleKingdomCard(selected, name);
    if (result === 'full') {
      setFullNotice({ name });
      return;
    }
    setFullNotice(null);
    setSelected(next);
  }

  function handleRandom() {
    const cards = randomKingdom();
    setFullNotice(null);
    setSelected(new Set(cards.map((c) => c.name)));
  }

  function handleStart() {
    if (!ready) return;
    startGame(selectedCards, aiStrategy);
  }

  // 下の帯の一言と色（上限の知らせ / そろった / あと何枚）
  const status = fullNotice
    ? {
        text: `もう ${KINGDOM_SIZE} 枚です。先にどれかを外してください`,
        color: 'text-amber-300',
      }
    : ready
      ? { text: `${KINGDOM_SIZE} 枚そろいました`, color: 'text-green-400' }
      : {
          text: `あと ${KINGDOM_SIZE - count} 枚選んでください（${count}/${KINGDOM_SIZE}）`,
          color: 'text-orange-300',
        };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800">
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 pt-6 pb-6">
        <h1 className="text-3xl font-bold text-white mb-5">ゲーム設定</h1>

        {/* AI の戦略。選択肢は全体を押せる大きさにする（16px の丸だけだった） */}
        <section className="mb-6">
          <h2
            id={strategyTitleId}
            className="text-lg font-semibold text-white mb-2"
          >
            AI の戦略
          </h2>
          <div
            role="radiogroup"
            aria-labelledby={strategyTitleId}
            className="grid gap-2 sm:grid-cols-2"
          >
            {AI_STRATEGIES.map((s) => {
              const checked = aiStrategy === s.value;
              return (
                <label
                  key={s.value}
                  className={cn(
                    'flex items-start gap-3 min-h-11 p-3 rounded-lg border-2 cursor-pointer transition-colors',
                    checked
                      ? 'border-purple-400 bg-purple-500/20'
                      : 'border-slate-700 bg-slate-800/70 hover:bg-slate-700/70',
                  )}
                >
                  <input
                    type="radio"
                    name="ai-strategy"
                    value={s.value}
                    checked={checked}
                    onChange={() => setAIStrategy(s.value)}
                    className="mt-0.5 w-5 h-5 shrink-0 accent-purple-500"
                  />
                  <span className="min-w-0">
                    <span className="block text-base font-bold text-white">
                      {s.label}
                    </span>
                    <span className="block text-xs leading-snug text-slate-300">
                      {s.description}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
          {strategyNote && (
            <p className="mt-2 text-sm text-amber-300">{strategyNote}</p>
          )}
        </section>

        {/* キングダムカード */}
        <section>
          <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2 mb-3">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-white">
                キングダムカード
                <span className="ml-2 text-base font-bold text-purple-300 tabular-nums">
                  {count}/{KINGDOM_SIZE}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {KINGDOM_SIZE} 枚選びます。押すと選ぶ・外す
              </p>
            </div>
            <button
              type="button"
              onClick={handleRandom}
              className="shrink-0 min-h-11 px-4 inline-flex items-center gap-2 text-sm font-medium text-purple-200 whitespace-nowrap bg-slate-800/80 border border-purple-500/50 rounded-lg hover:bg-purple-500/20 transition-colors"
            >
              <Shuffle aria-hidden="true" className="w-4 h-4" />
              ランダムに選ぶ
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
            {KINGDOM_CARDS.map((card) => (
              <KingdomCardTile
                key={card.name}
                def={card}
                selected={selected.has(card.name)}
                refused={fullNotice?.name === card.name}
                onToggle={toggleCard}
              />
            ))}
          </div>
        </section>
      </main>

      {/* 戻る・選んだ枚数・対戦開始は画面の下に貼り付ける（PC でも下までスクロールしないと対戦開始が見えなかった） */}
      <footer className="sticky bottom-0 z-10 border-t border-slate-700 bg-slate-900/95 backdrop-blur-sm pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-5xl mx-auto px-4 py-2 flex items-center gap-3">
          <button
            type="button"
            onClick={goToTitle}
            className="shrink-0 min-h-11 px-4 font-medium text-slate-300 bg-slate-800/80 border border-slate-600 rounded-lg hover:bg-slate-700/80 transition-colors"
          >
            戻る
          </button>
          <p
            role="status"
            className={cn(
              'flex-1 min-w-0 min-h-10 flex items-center justify-center text-center text-xs sm:text-sm leading-tight font-medium',
              status.color,
            )}
          >
            {status.text}
          </p>
          <button
            type="button"
            onClick={handleStart}
            disabled={!ready}
            className={cn(
              'shrink-0 min-h-11 px-5 font-bold text-white rounded-lg transition-all',
              ready
                ? 'bg-purple-600 hover:bg-purple-700 shadow-lg'
                : 'bg-slate-600 text-slate-300 cursor-not-allowed',
            )}
          >
            対戦開始
          </button>
        </div>
      </footer>
    </div>
  );
}
