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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 py-6 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-6">
          ゲーム設定
        </h1>

        {/* AI戦略選択 */}
        <div className="mb-6 p-4 bg-slate-800/70 backdrop-blur-sm rounded-lg shadow border border-slate-600">
          <label className="block text-sm font-medium text-slate-300 mb-2">
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
              <span className="text-slate-300">Big Money</span>
            </label>
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                value="bigMoneySmithy"
                checked={aiStrategy === 'bigMoneySmithy'}
                onChange={(e) => setAIStrategy(e.target.value as 'bigMoney' | 'bigMoneySmithy')}
                className="mr-2 w-4 h-4 text-purple-600 focus:ring-purple-500"
              />
              <span className="text-slate-300">Big Money + Smithy</span>
            </label>
          </div>
        </div>

        {/* キングダムカード選択 */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold text-white">
                キングダムカード ({selected.size}/10)
              </h2>
              {selected.size < 10 ? (
                <span className="text-sm text-orange-400 font-medium">
                  あと {10 - selected.size} 枚選んでください
                </span>
              ) : (
                <span className="text-sm text-green-400 font-medium flex items-center gap-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  準備完了
                </span>
              )}
            </div>
            <button
              onClick={handleRandom}
              className="px-4 py-2 text-sm font-medium text-purple-300 bg-slate-800/80 border border-purple-500/50 rounded hover:bg-purple-500/20 transition-colors"
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
                      ? 'bg-slate-800/90 shadow-lg border-2 border-purple-500 opacity-100'
                      : 'bg-slate-800/30 border-2 border-transparent opacity-40 hover:opacity-60'
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
            className="px-6 py-3 font-medium text-slate-300 bg-slate-800/80 border border-slate-600 rounded-lg hover:bg-slate-700/80 transition-colors"
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
                : 'bg-slate-600 cursor-not-allowed'
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
