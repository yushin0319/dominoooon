import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import type { SupplyPile } from '../types';
import CardView from './CardView';

interface SupplyAreaProps {
  supply: SupplyPile[];
  onBuy?: (cardName: string) => void;
  canBuy?: boolean;
  maxCost?: number;
}

const BASIC_NAMES = new Set(['Copper', 'Silver', 'Gold', 'Estate', 'Duchy', 'Province', 'Curse']);

export default function SupplyArea({ supply, onBuy, canBuy, maxCost }: SupplyAreaProps) {
  const basic = supply.filter((p) => BASIC_NAMES.has(p.card.name));
  const kingdom = supply.filter((p) => !BASIC_NAMES.has(p.card.name));

  function renderPile(pile: SupplyPile) {
    const affordable = canBuy && maxCost !== undefined && pile.card.cost <= maxCost && pile.count > 0;
    const empty = pile.count === 0;

    return (
      <Grid size={{ xs: 6, sm: 4, md: 3 }} key={pile.card.name}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 0.5,
            opacity: empty ? 0.35 : 1,
            pointerEvents: empty ? 'none' : 'auto',
            cursor: affordable ? 'pointer' : 'default',
            transition: 'box-shadow 0.15s, transform 0.15s',
            borderRadius: 1,
            p: 0.5,
            '&:hover': affordable
              ? { boxShadow: 4, transform: 'translateY(-2px)' }
              : {},
          }}
          onClick={affordable && onBuy ? () => onBuy(pile.card.name) : undefined}
        >
          <CardView card={pile.card} small />
          <Chip
            label={`×${pile.count}`}
            size="small"
            variant={empty ? 'outlined' : 'filled'}
            sx={{ fontSize: '0.75rem' }}
          />
        </Box>
      </Grid>
    );
  }

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 0.5, opacity: 0.7 }}>
        基本カード
      </Typography>
      <Grid container spacing={1} sx={{ mb: 1.5 }}>
        {basic.map(renderPile)}
      </Grid>

      <Typography variant="subtitle2" sx={{ mb: 0.5, opacity: 0.7 }}>
        キングダム
      </Typography>
      <Grid container spacing={1}>
        {kingdom.map(renderPile)}
      </Grid>
    </Box>
  );
}
