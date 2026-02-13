import { Container, Box, Typography, Button, Fade } from '@mui/material';
import { useGameStore } from '../stores/gameStore';

export default function TitlePage() {
  const goToSetup = useGameStore((s) => s.goToSetup);

  return (
    <Fade in timeout={1000}>
      <Container maxWidth="sm">
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            gap: 3,
          }}
        >
          <Typography variant="h2" fontWeight="bold" color="primary.main">
            Dominoooon
          </Typography>
          <Typography variant="h6" color="text.secondary">
            ドミニオン風カードゲーム
          </Typography>
          <Button variant="contained" size="large" onClick={goToSetup}>
            ゲーム開始
          </Button>
        </Box>
      </Container>
    </Fade>
  );
}
