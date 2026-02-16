import { useState } from 'react';
import type { PendingEffect, CardInstance, SupplyPile } from '../types';
import type { PendingEffectChoice } from '../domain/effect';
import CardView from './CardView';

interface PendingEffectUIProps {
  pendingEffect: PendingEffect;
  hand: CardInstance[];
  supply: SupplyPile[];
  onResolve: (choice: PendingEffectChoice) => void;
}

function effectLabel(type: string): string {
  const labels: Record<string, string> = {
    cellar: '地下貯蔵庫: 好きな枚数を捨て、同数ドローする。',
    chapel: '礼拝堂: 手札から最大4枚を廃棄する。',
    workshop: '工房: コスト4以下のカードを1枚獲得する。',
    remodel: '改築: カードを選んでください。',
    mine: '鉱山: 廃棄する財宝カードを選んでください。',
    artisan: '職人: カードを選んでください。',
    militia: '民兵: 手札が3枚になるまで捨てる。',
    throneRoom: '玉座の間: 2回プレイするアクションを選ぶ。',
    poacher: '密猟者: カードを捨てる。',
    harbinger: '先触れ: 捨て札からデッキの上に置くカードを選ぶ。',
    vassal: '家臣: めくったアクションカードをプレイしますか？',
    sentry: '歩哨: 廃棄するカードを選ぶ。',
  };
  return labels[type] ?? `解決: ${type}`;
}

function CardSelectUI({
  hand,
  multi: _multi,
  maxSelect,
  onResolve,
}: {
  hand: CardInstance[];
  multi: boolean;
  maxSelect?: number;
  onResolve: (choice: PendingEffectChoice) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (maxSelect && next.size >= maxSelect) return prev;
        next.add(id);
      }
      return next;
    });
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        {hand.map((c) => (
          <CardView
            key={c.instanceId}
            card={c}
            selected={selected.has(c.instanceId)}
            onClick={() => toggle(c.instanceId)}
          />
        ))}
      </div>
      <button
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium transition-colors"
        onClick={() => onResolve({ type: '', selectedCards: [...selected] })}
      >
        確定
      </button>
    </div>
  );
}

function SupplySelectUI({
  supply,
  maxCost,
  onResolve,
}: {
  supply: SupplyPile[];
  maxCost?: number;
  onResolve: (choice: PendingEffectChoice) => void;
}) {
  const available = supply.filter(
    (p) => p.count > 0 && (maxCost === undefined || p.card.cost <= maxCost),
  );

  return (
    <div className="flex flex-wrap gap-2">
      {available.map((p) => (
        <CardView
          key={p.card.name}
          card={p.card}
          small
          onClick={() => onResolve({ type: '', selectedCardName: p.card.name })}
        />
      ))}
    </div>
  );
}

function ConfirmUI({ onResolve }: { onResolve: (choice: PendingEffectChoice) => void }) {
  return (
    <div className="flex gap-4">
      <button
        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-medium transition-colors"
        onClick={() => onResolve({ type: '', confirmed: true })}
      >
        はい
      </button>
      <button
        className="border border-gray-400 hover:bg-gray-100 text-gray-700 px-6 py-2 rounded font-medium transition-colors"
        onClick={() => onResolve({ type: '', confirmed: false })}
      >
        いいえ
      </button>
    </div>
  );
}

export default function PendingEffectUI({
  pendingEffect,
  hand,
  supply,
  onResolve,
}: PendingEffectUIProps) {
  const { type, data } = pendingEffect;

  function renderBody() {
    switch (type) {
      case 'cellar':
        return <CardSelectUI hand={hand} multi onResolve={onResolve} />;
      case 'chapel':
        return <CardSelectUI hand={hand} multi maxSelect={4} onResolve={onResolve} />;
      case 'militia':
      case 'poacher':
        return <CardSelectUI hand={hand} multi onResolve={onResolve} />;
      case 'throneRoom':
        return (
          <CardSelectUI
            hand={hand.filter((c) => c.def.types.includes('Action' as never))}
            multi={false}
            maxSelect={1}
            onResolve={onResolve}
          />
        );
      case 'harbinger':
        return <CardSelectUI hand={hand} multi={false} maxSelect={1} onResolve={onResolve} />;
      case 'sentry':
        return <CardSelectUI hand={hand} multi onResolve={onResolve} />;
      case 'workshop':
        return <SupplySelectUI supply={supply} maxCost={4} onResolve={onResolve} />;
      case 'remodel':
        if ((data as Record<string, unknown>)?.phase === 'trash') {
          return <CardSelectUI hand={hand} multi={false} maxSelect={1} onResolve={onResolve} />;
        }
        return (
          <SupplySelectUI
            supply={supply}
            maxCost={((data as Record<string, unknown>)?.trashedCost as number ?? 0) + 2}
            onResolve={onResolve}
          />
        );
      case 'mine':
        if ((data as Record<string, unknown>)?.phase === 'trash') {
          return (
            <CardSelectUI
              hand={hand.filter((c) => c.def.types.includes('Treasure' as never))}
              multi={false}
              maxSelect={1}
              onResolve={onResolve}
            />
          );
        }
        return (
          <SupplySelectUI
            supply={supply.filter((p) => p.card.types.includes('Treasure' as never))}
            maxCost={((data as Record<string, unknown>)?.trashedCost as number ?? 0) + 3}
            onResolve={onResolve}
          />
        );
      case 'artisan':
        if ((data as Record<string, unknown>)?.phase === 'gain') {
          return <SupplySelectUI supply={supply} maxCost={5} onResolve={onResolve} />;
        }
        return <CardSelectUI hand={hand} multi={false} maxSelect={1} onResolve={onResolve} />;
      case 'vassal':
        return <ConfirmUI onResolve={onResolve} />;
      default:
        return <ConfirmUI onResolve={onResolve} />;
    }
  }

  return (
    <div className="bg-white shadow-2xl rounded-2xl p-6 border-2 border-blue-600 max-w-2xl">
      <h2 className="text-xl font-bold mb-4">{effectLabel(type)}</h2>
      {renderBody()}
    </div>
  );
}
