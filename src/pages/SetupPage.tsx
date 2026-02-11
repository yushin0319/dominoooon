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
    <div className="setup-page">
      <h2>ゲーム設定</h2>

      <section className="setup-section">
        <h3>AI戦略</h3>
        <div className="ai-strategy-options">
          <label className={`strategy-option ${aiStrategy === 'bigMoney' ? 'active' : ''}`}>
            <input
              type="radio"
              name="ai"
              value="bigMoney"
              checked={aiStrategy === 'bigMoney'}
              onChange={() => setAIStrategy('bigMoney')}
            />
            Big Money
          </label>
          <label className={`strategy-option ${aiStrategy === 'bigMoneySmithy' ? 'active' : ''}`}>
            <input
              type="radio"
              name="ai"
              value="bigMoneySmithy"
              checked={aiStrategy === 'bigMoneySmithy'}
              onChange={() => setAIStrategy('bigMoneySmithy')}
            />
            Big Money + Smithy
          </label>
        </div>
      </section>

      <section className="setup-section">
        <h3>
          キングダムカード ({selected.size}/10)
          <button className="btn btn-small" onClick={handleRandom}>ランダム</button>
        </h3>
        <div className="kingdom-grid">
          {KINGDOM_CARDS.map((card) => (
            <div
              key={card.name}
              className={`kingdom-pick ${selected.has(card.name) ? 'picked' : ''}`}
              onClick={() => toggleCard(card.name)}
            >
              <CardView card={card} small selected={selected.has(card.name)} />
            </div>
          ))}
        </div>
      </section>

      <div className="setup-actions">
        <button className="btn" onClick={goToTitle}>戻る</button>
        <button
          className="btn btn-primary"
          onClick={handleStart}
          disabled={selected.size !== 10}
        >
          対戦開始
        </button>
      </div>
    </div>
  );
}
