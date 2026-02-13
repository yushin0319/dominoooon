import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import type { TurnState, Phase } from '../types';

interface TurnInfoProps {
  turnState: TurnState;
  phase: Phase;
  turnNumber: number;
  currentPlayer: string;
}

function phaseColor(phase: Phase): 'default' | 'warning' | 'success' {
  switch (phase) {
    case 'Buy':
      return 'warning';
    case 'Cleanup':
      return 'success';
    default:
      return 'default';
  }
}

export default function TurnInfo({ turnState, phase, turnNumber, currentPlayer }: TurnInfoProps) {
  return (
    <Paper elevation={1} sx={{ p: 1.5, borderRadius: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography variant="caption" sx={{ opacity: 0.7 }}>
            Turn {turnNumber}
          </Typography>
          <Typography variant="subtitle1" fontWeight="bold">
            {currentPlayer}
          </Typography>
        </Box>

        <Chip label={phase} color={phaseColor(phase)} size="small" />

        <Box sx={{ display: 'flex', gap: 2, ml: 'auto' }}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="caption" sx={{ opacity: 0.7 }}>Actions</Typography>
            <Typography variant="h6" fontWeight="bold">{turnState.actions}</Typography>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="caption" sx={{ opacity: 0.7 }}>Buys</Typography>
            <Typography variant="h6" fontWeight="bold">{turnState.buys}</Typography>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="caption" sx={{ opacity: 0.7 }}>Coins</Typography>
            <Typography variant="h6" fontWeight="bold" color="warning.main">{turnState.coins}</Typography>
          </Box>
        </Box>
      </Box>
    </Paper>
  );
}
