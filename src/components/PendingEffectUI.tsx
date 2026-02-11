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
    cellar: 'Cellar: Discard any number of cards, then draw that many.',
    chapel: 'Chapel: Trash up to 4 cards from your hand.',
    workshop: 'Workshop: Gain a card costing up to 4.',
    remodel: 'Remodel: Choose a card.',
    mine: 'Mine: Choose a Treasure to trash.',
    artisan: 'Artisan: Choose a card.',
    militia: 'Militia: Discard down to 3 cards.',
    throneRoom: 'Throne Room: Choose an Action card to play twice.',
    poacher: 'Poacher: Discard cards.',
    harbinger: 'Harbinger: Put a card from discard on top of deck.',
    vassal: 'Vassal: Play the revealed Action card?',
    sentry: 'Sentry: Choose cards to trash.',
  };
  return labels[type] ?? `Resolve: ${type}`;
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
    <div className="pending-select">
      <div className="pending-cards">
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
        className="btn btn-primary"
        onClick={() =>
          onResolve({ type: '', selectedCards: [...selected] })
        }
      >
        Confirm
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
    <div className="pending-supply">
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
    <div className="pending-confirm">
      <button className="btn btn-primary" onClick={() => onResolve({ type: '', confirmed: true })}>
        Yes
      </button>
      <button className="btn btn-secondary" onClick={() => onResolve({ type: '', confirmed: false })}>
        No
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
    <div className="pending-effect">
      <div className="pending-label">{effectLabel(type)}</div>
      {renderBody()}
    </div>
  );
}
