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

type SelectionType = 'hand' | 'supply' | 'confirm' | 'custom';

interface PendingEffectConfig {
  title: string;
  selectionType: SelectionType;
  multiSelect?: boolean;
  maxSelect?: number;
  maxCost?: number;
  filterHand?: (card: CardInstance) => boolean;
  filterSupply?: (pile: SupplyPile) => boolean;
  customRenderer?: (
    data: Record<string, unknown>,
    hand: CardInstance[],
    supply: SupplyPile[],
    onResolve: (choice: PendingEffectChoice) => void,
  ) => JSX.Element;
}

const PENDING_EFFECT_CONFIGS: Record<string, PendingEffectConfig> = {
  cellar: {
    title: '地下貯蔵庫: 好きな枚数を捨て、同数ドローする。',
    selectionType: 'hand',
    multiSelect: true,
  },
  chapel: {
    title: '礼拝堂: 手札から最大4枚を廃棄する。',
    selectionType: 'hand',
    multiSelect: true,
    maxSelect: 4,
  },
  workshop: {
    title: '工房: コスト4以下のカードを1枚獲得する。',
    selectionType: 'supply',
    maxCost: 4,
  },
  militia: {
    title: '民兵: 手札が3枚になるまで捨てる。',
    selectionType: 'hand',
    multiSelect: true,
  },
  poacher: {
    title: '密猟者: カードを捨てる。',
    selectionType: 'hand',
    multiSelect: true,
  },
  throneRoom: {
    title: '玉座の間: 2回プレイするアクションを選ぶ。',
    selectionType: 'hand',
    multiSelect: false,
    maxSelect: 1,
    filterHand: (c) => c.def.types.includes('Action' as never),
  },
  harbinger: {
    title: '先触れ: 捨て札からデッキの上に置くカードを選ぶ。',
    selectionType: 'hand',
    multiSelect: false,
    maxSelect: 1,
  },
  sentry: {
    title: '歩哨: 廃棄するカードを選ぶ。',
    selectionType: 'hand',
    multiSelect: true,
  },
  vassal: {
    title: '家臣: めくったアクションカードをプレイしますか？',
    selectionType: 'confirm',
  },
  // Multi-phase effects (require custom rendering)
  remodel: {
    title: '改築: カードを選んでください。',
    selectionType: 'custom',
    customRenderer: (data, hand, supply, onResolve) => {
      const phase = data.phase as string | undefined;
      if (phase === 'trash') {
        return (
          <CardSelectUI
            hand={hand}
            multi={false}
            maxSelect={1}
            onResolve={onResolve}
          />
        );
      }
      const maxCost = ((data.trashedCost as number) ?? 0) + 2;
      return <SupplySelectUI supply={supply} maxCost={maxCost} onResolve={onResolve} />;
    },
  },
  mine: {
    title: '鉱山: 廃棄する財宝カードを選んでください。',
    selectionType: 'custom',
    customRenderer: (data, hand, supply, onResolve) => {
      const phase = data.phase as string | undefined;
      if (phase === 'trash') {
        return (
          <CardSelectUI
            hand={hand.filter((c) => c.def.types.includes('Treasure' as never))}
            multi={false}
            maxSelect={1}
            onResolve={onResolve}
          />
        );
      }
      const maxCost = ((data.trashedCost as number) ?? 0) + 3;
      return (
        <SupplySelectUI
          supply={supply.filter((p) => p.card.types.includes('Treasure' as never))}
          maxCost={maxCost}
          onResolve={onResolve}
        />
      );
    },
  },
  artisan: {
    title: '職人: カードを選んでください。',
    selectionType: 'custom',
    customRenderer: (data, hand, supply, onResolve) => {
      const phase = data.phase as string | undefined;
      if (phase === 'gain') {
        return <SupplySelectUI supply={supply} maxCost={5} onResolve={onResolve} />;
      }
      return <CardSelectUI hand={hand} multi={false} maxSelect={1} onResolve={onResolve} />;
    },
  },
};

function getEffectConfig(type: string): PendingEffectConfig {
  return (
    PENDING_EFFECT_CONFIGS[type] ?? {
      title: `解決: ${type}`,
      selectionType: 'confirm',
    }
  );
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
      <p className="text-slate-300 text-sm mb-3">
        カードをクリックして選択してください
        {maxSelect && ` (最大${maxSelect}枚)`}
      </p>
      <div className="flex flex-wrap gap-2 mb-3">
        {hand.map((c) => (
          <CardView
            key={c.instanceId}
            card={c}
            selected={selected.has(c.instanceId)}
            onClick={() => toggle(c.instanceId)}
          />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-slate-400 text-sm">
          選択中: {selected.size}枚
        </span>
        <button
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded font-medium transition-colors"
          onClick={() => onResolve({ type: '', selectedCards: [...selected] })}
        >
          確定
        </button>
      </div>
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
    <div>
      <p className="text-slate-300 text-sm mb-3">
        獲得するカードをクリックしてください
        {maxCost !== undefined && ` (コスト${maxCost}以下)`}
      </p>
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
    </div>
  );
}

function ConfirmUI({ onResolve }: { onResolve: (choice: PendingEffectChoice) => void }) {
  return (
    <div className="flex gap-4">
      <button
        className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded font-medium transition-colors"
        onClick={() => onResolve({ type: '', confirmed: true })}
      >
        はい
      </button>
      <button
        className="border border-slate-500 hover:bg-slate-700 text-slate-300 px-6 py-2 rounded font-medium transition-colors"
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
  const config = getEffectConfig(type);

  function renderBody() {
    // Custom renderer takes precedence
    if (config.customRenderer) {
      return config.customRenderer(data || {}, hand, supply, onResolve);
    }

    // Config-driven rendering
    switch (config.selectionType) {
      case 'hand': {
        const filteredHand = config.filterHand ? hand.filter(config.filterHand) : hand;
        return (
          <CardSelectUI
            hand={filteredHand}
            multi={config.multiSelect ?? false}
            maxSelect={config.maxSelect}
            onResolve={onResolve}
          />
        );
      }
      case 'supply':
        return (
          <SupplySelectUI
            supply={
              config.filterSupply
                ? supply.filter(config.filterSupply)
                : supply
            }
            maxCost={config.maxCost}
            onResolve={onResolve}
          />
        );
      case 'confirm':
        return <ConfirmUI onResolve={onResolve} />;
      default:
        // Fallback for unknown types
        return <ConfirmUI onResolve={onResolve} />;
    }
  }

  return (
    <div className="bg-slate-800 border-2 border-purple-500 shadow-2xl rounded-2xl p-6 max-w-2xl">
      <h2 className="text-xl font-bold text-white mb-4">{config.title}</h2>
      {renderBody()}
    </div>
  );
}
