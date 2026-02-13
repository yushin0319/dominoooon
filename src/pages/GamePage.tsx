import { Box, Grid, Divider, Button } from '@mui/material';
import { useGameStore } from '../stores/gameStore';
import { Phase, CardType } from '../types';
import { getCurrentPlayer } from '../domain/game';
import SupplyArea from '../components/SupplyArea';
import Hand from '../components/Hand';
import PlayArea from '../components/PlayArea';
import TurnInfo from '../components/TurnInfo';
import GameLog from '../components/GameLog';
import PendingEffectUI from '../components/PendingEffectUI';

export default function GamePage() {
  const gameState = useGameStore((s) => s.gameState);
  const playAction = useGameStore((s) => s.playAction);
  const skipAction = useGameStore((s) => s.skipAction);
  const buyCard = useGameStore((s) => s.buyCard);
  const skipBuy = useGameStore((s) => s.skipBuy);
  const resolvePending = useGameStore((s) => s.resolvePending);
  const executeAITurn = useGameStore((s) => s.executeAITurn);
  const isHumanTurn = useGameStore((s) => s.isHumanTurn);
  const isAITurn = useGameStore((s) => s.isAITurn);
  const goToResult = useGameStore((s) => s.goToResult);

  if (!gameState) return null;

  if (gameState.gameOver) {
    goToResult();
    return null;
  }

  const currentPlayer = getCurrentPlayer(gameState);
  const humanPlayer = gameState.players[0];
  const aiTurn = isAITurn();
  const humanTurn = isHumanTurn();

  const canPlayActions =
    humanTurn &&
    gameState.phase === Phase.Action &&
    gameState.turnState.actions > 0 &&
    !gameState.pendingEffect;

  const canBuyCards =
    humanTurn &&
    gameState.phase === Phase.Buy &&
    gameState.turnState.buys > 0 &&
    !gameState.pendingEffect;

  function handlePlayCard(instanceId: string) {
    const card = humanPlayer.hand.find((c) => c.instanceId === instanceId);
    if (!card || !card.def.types.includes(CardType.Action)) return;
    playAction(instanceId);
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', p: { xs: 1, md: 2 } }}>
      <SupplyArea
        supply={gameState.supply}
        onBuy={canBuyCards ? buyCard : undefined}
        canBuy={canBuyCards}
        maxCost={canBuyCards ? gameState.turnState.coins : undefined}
      />

      <Divider sx={{ my: 1 }} />

      <Grid container spacing={1}>
        <Grid size={{ xs: 12, md: 8 }}>
          <PlayArea cards={currentPlayer.playArea} />
          <TurnInfo
            turnState={gameState.turnState}
            phase={gameState.phase}
            turnNumber={gameState.turnNumber}
            currentPlayer={currentPlayer.name}
          />
          <Box sx={{ display: 'flex', gap: 1, py: 1 }}>
            {humanTurn && gameState.phase === Phase.Action && !gameState.pendingEffect && (
              <Button variant="outlined" onClick={skipAction}>
                アクションスキップ
              </Button>
            )}
            {humanTurn && gameState.phase === Phase.Buy && !gameState.pendingEffect && (
              <Button variant="outlined" onClick={skipBuy}>
                購入スキップ
              </Button>
            )}
            {aiTurn && (
              <Button variant="contained" onClick={executeAITurn}>
                AIターン実行
              </Button>
            )}
          </Box>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <GameLog log={gameState.log} />
        </Grid>
      </Grid>

      <Divider sx={{ my: 1 }} />

      <Hand
        hand={humanPlayer.hand}
        onPlay={canPlayActions ? handlePlayCard : undefined}
        canPlay={canPlayActions}
      />

      {gameState.pendingEffect && humanTurn && (
        <Box
          sx={{
            position: 'fixed',
            inset: 0,
            bgcolor: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1300,
          }}
        >
          <PendingEffectUI
            pendingEffect={gameState.pendingEffect}
            hand={humanPlayer.hand}
            supply={gameState.supply}
            onResolve={resolvePending}
          />
        </Box>
      )}
    </Box>
  );
}
