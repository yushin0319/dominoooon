import { useState, useMemo } from 'react';
import { useGameStore } from '../stores/gameStore';
import { CARD_DEFS } from '../domain/card';
import { CardType } from '../types';
import type { CardDef } from '../types';
import CardView from '../components/CardView';

const KINGDOM_CARDS: CardDef[] = Object.values(CARD_DEFS).filter(
  (c) =>
    c.types.includes(CardType.Action) ||
    (c.types.includes(CardType.Victory) && c.name === 'Gardens'),
);

function randomKingdom(): CardDef[] {
  const shuffled = [...KINGDOM_CARDS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 10);
}

export default function SetupPage() {
  const goToTitle = useGameStore((s) => s.goToTitle);
  const startGame = useGameStore((s) => s.startGame);
  const [selected, setSelected] = useState<Set<string>>(() => {
    const initial = randomKingdom();
    return new Set(initial.map((c) => c.name));
  });
  const [aiStrategy, setAIStrategy] = useState<'bigMoney' | 'bigMoneySmithy'>('bigMoney');

  const selectedCards = useMemo(
    () => KINGDOM_CARDS.filter((c) => selected.has(c.name)),
    [selected],
  );

  function toggleCard(name: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else if (next.size < 10) {
        next.add(name);
      }
      return next;
    });
  }

  function handleRandom() {
    const cards = randomKingdom();
    setSelected(new Set(cards.map((c) => c.name)));
  }

  function handleStart() {
    if (selectedCards.length !== 10) return;
    startGame(selectedCards, aiStrategy);
  }

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900 mb-6">
          ゲーム設定
        </h1>

        {/* AI戦略選択 */}
        <div className="mb-6 p-4 bg-white rounded-lg shadow">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            AI戦略
          </label>
          <div className="flex gap-4">
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                value="bigMoney"
                checked={aiStrategy === 'bigMoney'}
                onChange={(e) => setAIStrategy(e.target.value as 'bigMoney' | 'bigMoneySmithy')}
                className="mr-2 w-4 h-4 text-purple-600 focus:ring-purple-500"
              />
              <span className="text-slate-700">Big Money</span>
            </label>
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                value="bigMoneySmithy"
                checked={aiStrategy === 'bigMoneySmithy'}
                onChange={(e) => setAIStrategy(e.target.value as 'bigMoney' | 'bigMoneySmithy')}
                className="mr-2 w-4 h-4 text-purple-600 focus:ring-purple-500"
              />
              <span className="text-slate-700">Big Money + Smithy</span>
            </label>
          </div>
        </div>

        {/* キングダムカード選択 */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-semibold text-slate-900">
              キングダムカード ({selected.size}/10)
            </h2>
            <button
              onClick={handleRandom}
              className="px-4 py-2 text-sm font-medium text-purple-700 bg-white border border-purple-300 rounded hover:bg-purple-50 transition-colors"
            >
              ランダム
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {KINGDOM_CARDS.map((card) => {
              const isSelected = selected.has(card.name);
              return (
                <div
                  key={card.name}
                  onClick={() => toggleCard(card.name)}
                  className={`
                    p-2 rounded cursor-pointer transition-all
                    ${isSelected
                      ? 'bg-white shadow-lg border-2 border-purple-500 opacity-100'
                      : 'bg-white/40 border-2 border-transparent opacity-40 hover:opacity-60'
                    }
                  `}
                >
                  <CardView card={card} small selected={isSelected} />
                </div>
              );
            })}
          </div>
        </div>

        {/* ボタン */}
        <div className="flex gap-4 justify-center">
          <button
            onClick={goToTitle}
            className="px-6 py-3 font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            戻る
          </button>
          <button
            onClick={handleStart}
            disabled={selected.size !== 10}
            className={`
              px-6 py-3 font-medium text-white rounded-lg transition-all
              ${selected.size === 10
                ? 'bg-purple-600 hover:bg-purple-700 cursor-pointer'
                : 'bg-slate-400 cursor-not-allowed'
              }
            `}
          >
            対戦開始
          </button>
        </div>
      </div>
    </div>
  );
}
