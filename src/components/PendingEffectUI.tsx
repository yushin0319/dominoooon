import { useState } from 'react';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
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
    <Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
        {hand.map((c) => (
          <CardView
            key={c.instanceId}
            card={c}
            selected={selected.has(c.instanceId)}
            onClick={() => toggle(c.instanceId)}
          />
        ))}
      </Box>
      <Button
        variant="contained"
        onClick={() => onResolve({ type: '', selectedCards: [...selected] })}
      >
        Confirm
      </Button>
    </Box>
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
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
      {available.map((p) => (
        <CardView
          key={p.card.name}
          card={p.card}
          small
          onClick={() => onResolve({ type: '', selectedCardName: p.card.name })}
        />
      ))}
    </Box>
  );
}

function ConfirmUI({ onResolve }: { onResolve: (choice: PendingEffectChoice) => void }) {
  return (
    <Box sx={{ display: 'flex', gap: 1.5 }}>
      <Button variant="contained" color="primary" onClick={() => onResolve({ type: '', confirmed: true })}>
        Yes
      </Button>
      <Button variant="outlined" onClick={() => onResolve({ type: '', confirmed: false })}>
        No
      </Button>
    </Box>
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
    <Paper
      elevation={8}
      sx={{
        p: 3,
        borderRadius: 3,
        border: '2px solid',
        borderColor: 'primary.main',
        maxWidth: 600,
      }}
    >
      <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
        {effectLabel(type)}
      </Typography>
      {renderBody()}
    </Paper>
  );
}
