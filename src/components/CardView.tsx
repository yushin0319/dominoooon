import { Paper, Typography, Box } from '@mui/material';
import type { CardInstance, CardDef, CardType } from '../types';

interface CardViewProps {
  card: CardInstance | CardDef;
  onClick?: () => void;
  selected?: boolean;
  small?: boolean;
}

function getDef(card: CardInstance | CardDef): CardDef {
  return 'def' in card ? card.def : card;
}

function getBorderColor(types: CardType[]): string {
  if (types.includes('Attack' as CardType)) return '#f44336';
  if (types.includes('Reaction' as CardType)) return '#2196f3';
  if (types.includes('Treasure' as CardType)) return '#ffd700';
  if (types.includes('Victory' as CardType)) return '#4caf50';
  if (types.includes('Curse' as CardType)) return '#9c27b0';
  return '#bdbdbd';
}

function effectText(def: CardDef): string {
  const parts: string[] = [];
  const e = def.effects;
  if (e.cards) parts.push(`+${e.cards} Card${e.cards > 1 ? 's' : ''}`);
  if (e.actions) parts.push(`+${e.actions} Action${e.actions > 1 ? 's' : ''}`);
  if (e.buys) parts.push(`+${e.buys} Buy${e.buys > 1 ? 's' : ''}`);
  if (e.coins) parts.push(`+${e.coins} Coin${e.coins > 1 ? 's' : ''}`);
  if (def.vpValue !== undefined) parts.push(`${def.vpValue} VP`);
  return parts.join(', ');
}

export default function CardView({ card, onClick, selected, small }: CardViewProps) {
  const def = getDef(card);
  const borderColor = getBorderColor(def.types);
  const effects = effectText(def);

  return (
    <Paper
      elevation={selected ? 6 : 2}
      onClick={onClick}
      sx={{
        width: small ? 80 : 120,
        minHeight: small ? 40 : 140,
        p: small ? 0.5 : 1,
        borderLeft: `4px solid ${borderColor}`,
        cursor: onClick ? 'pointer' : 'default',
        position: 'relative',
        transition: 'all 0.3s ease',
        border: selected ? `2px solid #f0c040` : undefined,
        boxShadow: selected ? '0 0 12px rgba(240, 192, 64, 0.5)' : undefined,
        '&:hover': onClick
          ? {
              transform: 'scale(1.02)',
              boxShadow: `0 4px 16px rgba(240, 192, 64, 0.3)`,
            }
          : undefined,
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography
          variant={small ? 'caption' : 'body2'}
          sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}
        >
          {def.name}
        </Typography>
        <Box
          sx={{
            width: small ? 18 : 24,
            height: small ? 18 : 24,
            borderRadius: '50%',
            bgcolor: 'rgba(255,255,255,0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            ml: 0.5,
          }}
        >
          <Typography variant="caption" sx={{ fontWeight: 700, fontSize: small ? '0.6rem' : '0.75rem' }}>
            {def.cost}
          </Typography>
        </Box>
      </Box>
      {!small && (
        <>
          <Typography variant="caption" sx={{ color: borderColor, display: 'block', mt: 0.5 }}>
            {def.types.join(' / ')}
          </Typography>
          {effects && (
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
              {effects}
            </Typography>
          )}
        </>
      )}
    </Paper>
  );
}
