import { Container, Box, Typography, Button, Paper, Fade } from '@mui/material';
import { useGameStore } from '../stores/gameStore';
import { getGameResults } from '../domain/game';

export default function ResultPage() {
  const gameState = useGameStore((s) => s.gameState);
  const goToTitle = useGameStore((s) => s.goToTitle);

  if (!gameState) return null;

  const results = getGameResults(gameState);

  return (
    <Fade in timeout={600}>
      <Container maxWidth="sm">
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
            gap: 2,
            py: 4,
          }}
        >
          <Typography variant="h4" gutterBottom>
            ゲーム結果
          </Typography>

          <Box sx={{ width: '100%' }}>
            {results.map((r, i) => (
              <Paper
                key={r.playerId}
                elevation={i === 0 ? 4 : 1}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  p: 2,
                  mb: 1,
                  ...(i === 0 && {
                    borderLeft: '4px solid',
                    borderColor: 'primary.main',
                  }),
                }}
              >
                <Typography fontWeight="bold">{i + 1}位</Typography>
                <Typography sx={{ flex: 1, ml: 2 }}>{r.name}</Typography>
                <Typography fontWeight="bold" color="success.main">
                  {r.vp} VP
                </Typography>
              </Paper>
            ))}
          </Box>

          <Typography variant="body2" color="text.secondary">
            ターン数: {gameState.turnNumber}
          </Typography>

          <Button variant="contained" onClick={goToTitle}>
            タイトルに戻る
          </Button>
        </Box>
      </Container>
    </Fade>
  );
}
