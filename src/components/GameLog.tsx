import { useEffect, useRef } from 'react';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';

interface GameLogProps {
  log: string[];
}

export default function GameLog({ log }: GameLogProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [log.length]);

  return (
    <Paper elevation={1} sx={{ maxHeight: 400, overflowY: 'auto', p: 1.5, borderRadius: 2 }}>
      {log.map((entry, i) => (
        <Box key={i}>
          <Box
            sx={{
              py: 0.3,
              px: 0.5,
              borderRadius: 0.5,
              bgcolor: i >= log.length - 2 ? 'rgba(240,192,64,0.08)' : 'transparent',
            }}
          >
            <Typography variant="body2">{entry}</Typography>
          </Box>
          {i < log.length - 1 && <Divider sx={{ opacity: 0.15 }} />}
        </Box>
      ))}
      <div ref={endRef} />
    </Paper>
  );
}
