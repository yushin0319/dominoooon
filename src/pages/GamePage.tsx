import { useEffect, useState } from 'react';
import {
  Box, Grid, Divider, Button, Typography,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import { useGameStore } from '../stores/gameStore';
import { Phase, CardType } from '../types';
import { getCurrentPlayer } from '../domain/game';
import { getCardDef } from '../domain/card';
import SupplyArea from '../components/SupplyArea';
import Hand from '../components/Hand';
import PlayArea from '../components/PlayArea';
import TurnInfo from '../components/TurnInfo';
import GameLog from '../components/GameLog';
import PendingEffectUI from '../components/PendingEffectUI';
import CardView from '../components/CardView';

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

  const [buyTarget, setBuyTarget] = useState<string | null>(null);
  const [playTarget, setPlayTarget] = useState<string | null>(null);

  // AI自動実行
  useEffect(() => {
    if (!gameState || gameState.gameOver || gameState.pendingEffect) return;
    if (!isAITurn()) return;

    const timer = setTimeout(() => {
      executeAITurn();
    }, 800);

    return () => clearTimeout(timer);
  }, [gameState, executeAITurn, isAITurn]);

  // AI対象のpendingEffect自動解決（民兵等の攻撃カード）
  useEffect(() => {
    if (!gameState || !gameState.pendingEffect) return;
    const humanId = gameState.players[0].id;
    if (gameState.pendingEffect.playerId === humanId) return; // 人間対象なら手動解決

    const timer = setTimeout(() => {
      const targetPlayer = gameState.players.find(
        (p) => p.id === gameState.pendingEffect!.playerId,
      );
      if (!targetPlayer) return;

      // 民兵: 手札が3枚以下になるまで末尾から捨てる
      if (gameState.pendingEffect!.type === 'militia') {
        const excess = targetPlayer.hand.length - 3;
        const toDiscard = targetPlayer.hand.slice(-excess).map((c) => c.instanceId);
        resolvePending({ selectedCards: toDiscard });
      } else {
        // その他のpendingEffect: 空選択で解決
        resolvePending({ selectedCards: [] });
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [gameState, resolvePending]);

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
    setPlayTarget(instanceId);
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', p: { xs: 1, md: 2 } }}>
      <SupplyArea
        supply={gameState.supply}
        onBuy={canBuyCards ? (cardName: string) => setBuyTarget(cardName) : undefined}
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
              <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
                AIが考えています...
              </Typography>
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

      {gameState.pendingEffect && gameState.pendingEffect.playerId === humanPlayer.id && (
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

      {buyTarget && (() => {
        const cardDef = getCardDef(buyTarget);
        return (
          <Dialog open onClose={() => setBuyTarget(null)}>
            <DialogTitle>{cardDef.nameJa ?? cardDef.name}</DialogTitle>
            <DialogContent>
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                <CardView card={cardDef} />
              </Box>
              <Typography variant="body2" color="text.secondary">
                コスト: {cardDef.cost} コイン
              </Typography>
              <Typography variant="body2" color="text.secondary">
                種別: {cardDef.types.join(' / ')}
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setBuyTarget(null)}>やめる</Button>
              <Button variant="contained" onClick={() => { buyCard(buyTarget); setBuyTarget(null); }}>
                購入する
              </Button>
            </DialogActions>
          </Dialog>
        );
      })()}

      {playTarget && (() => {
        const card = humanPlayer.hand.find((c) => c.instanceId === playTarget);
        if (!card) return null;
        return (
          <Dialog open onClose={() => setPlayTarget(null)}>
            <DialogTitle>{card.def.nameJa ?? card.def.name}</DialogTitle>
            <DialogContent>
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                <CardView card={card} />
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setPlayTarget(null)}>やめる</Button>
              <Button variant="contained" onClick={() => { playAction(playTarget); setPlayTarget(null); }}>
                プレイする
              </Button>
            </DialogActions>
          </Dialog>
        );
      })()}
    </Box>
  );
}
