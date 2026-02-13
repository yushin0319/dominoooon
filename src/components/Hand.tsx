import { Box } from '@mui/material';
import type { CardInstance } from '../types';
import CardView from './CardView';

interface HandProps {
  hand: CardInstance[];
  onPlay?: (instanceId: string) => void;
  canPlay?: boolean;
  selectedCards?: string[];
}

export default function Hand({ hand, onPlay, canPlay, selectedCards }: HandProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 1,
        justifyContent: 'center',
        p: 1,
        borderRadius: 2,
        bgcolor: 'rgba(255,255,255,0.03)',
      }}
    >
      {hand.map((card) => (
        <CardView
          key={card.instanceId}
          card={card}
          selected={selectedCards?.includes(card.instanceId)}
          onClick={canPlay && onPlay ? () => onPlay(card.instanceId) : undefined}
        />
      ))}
    </Box>
  );
}
