import { useState, useMemo } from 'react';
import {
  Container, Box, Typography, Button, Paper, Grid,
  Radio, RadioGroup, FormControlLabel, FormControl, FormLabel,
} from '@mui/material';
import { useGameStore } from '../stores/gameStore';
import { CARD_DEFS } from '../domain/card';
import { CardType } from '../types';
import type { CardDef } from '../types';
import CardView from '../components/CardView';

const KINGDOM_CARDS: CardDef[] = Object.values(CARD_DEFS).filter(
  (c) =>
    c.types.includes(CardType.Action) ||
    (c.types.includes(CardType.Victory) && c.name === 'Gardens'),
);

function randomKingdom(): CardDef[] {
  const shuffled = [...KINGDOM_CARDS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 10);
}

export default function SetupPage() {
  const goToTitle = useGameStore((s) => s.goToTitle);
  const startGame = useGameStore((s) => s.startGame);
  const [selected, setSelected] = useState<Set<string>>(() => {
    const initial = randomKingdom();
    return new Set(initial.map((c) => c.name));
  });
  const [aiStrategy, setAIStrategy] = useState<'bigMoney' | 'bigMoneySmithy'>('bigMoney');

  const selectedCards = useMemo(
    () => KINGDOM_CARDS.filter((c) => selected.has(c.name)),
    [selected],
  );

  function toggleCard(name: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else if (next.size < 10) {
        next.add(name);
      }
      return next;
    });
  }

  function handleRandom() {
    const cards = randomKingdom();
    setSelected(new Set(cards.map((c) => c.name)));
  }

  function handleStart() {
    if (selectedCards.length !== 10) return;
    startGame(selectedCards, aiStrategy);
  }

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      <Typography variant="h4" gutterBottom>
        ゲーム設定
      </Typography>

      <Box sx={{ mb: 3 }}>
        <FormControl>
          <FormLabel>AI戦略</FormLabel>
          <RadioGroup
            row
            value={aiStrategy}
            onChange={(e) => setAIStrategy(e.target.value as 'bigMoney' | 'bigMoneySmithy')}
          >
            <FormControlLabel value="bigMoney" control={<Radio />} label="Big Money" />
            <FormControlLabel value="bigMoneySmithy" control={<Radio />} label="Big Money + Smithy" />
          </RadioGroup>
        </FormControl>
      </Box>

      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Typography variant="h6">
            キングダムカード ({selected.size}/10)
          </Typography>
          <Button variant="outlined" size="small" onClick={handleRandom}>
            ランダム
          </Button>
        </Box>
        <Grid container spacing={1}>
          {KINGDOM_CARDS.map((card) => (
            <Grid size={{ xs: 4, sm: 3, md: 2 }} key={card.name}>
              <Paper
                elevation={selected.has(card.name) ? 4 : 0}
                onClick={() => toggleCard(card.name)}
                sx={{
                  p: 0.5,
                  cursor: 'pointer',
                  opacity: selected.has(card.name) ? 1 : 0.4,
                  border: selected.has(card.name) ? '2px solid' : '2px solid transparent',
                  borderColor: selected.has(card.name) ? 'primary.main' : 'transparent',
                  transition: 'all 0.15s',
                  '&:hover': { opacity: 0.8 },
                }}
              >
                <CardView card={card} small selected={selected.has(card.name)} />
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
        <Button variant="outlined" onClick={goToTitle}>
          戻る
        </Button>
        <Button
          variant="contained"
          onClick={handleStart}
          disabled={selected.size !== 10}
        >
          対戦開始
        </Button>
      </Box>
    </Container>
  );
}
