import { Box } from '@mui/material';
import type { CardInstance } from '../types';
import CardView from './CardView';

interface PlayAreaProps {
  cards: CardInstance[];
}

export default function PlayArea({ cards }: PlayAreaProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 0.5,
        p: 1,
        minHeight: 50,
        borderRadius: 1,
        border: '1px dashed',
        borderColor: 'divider',
      }}
    >
      {cards.map((card) => (
        <CardView key={card.instanceId} card={card} small />
      ))}
    </Box>
  );
}
