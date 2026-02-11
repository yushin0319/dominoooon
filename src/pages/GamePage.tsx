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
    <div className="game-page">
      <div className="game-top">
        <SupplyArea
          supply={gameState.supply}
          onBuy={canBuyCards ? buyCard : undefined}
          canBuy={canBuyCards}
          maxCost={canBuyCards ? gameState.turnState.coins : undefined}
        />
      </div>

      <div className="game-middle">
        <div className="game-middle-left">
          <PlayArea cards={currentPlayer.playArea} />
          <TurnInfo
            turnState={gameState.turnState}
            phase={gameState.phase}
            turnNumber={gameState.turnNumber}
            currentPlayer={currentPlayer.name}
          />
          <div className="action-buttons">
            {humanTurn && gameState.phase === Phase.Action && !gameState.pendingEffect && (
              <button className="btn" onClick={skipAction}>
                アクションスキップ
              </button>
            )}
            {humanTurn && gameState.phase === Phase.Buy && !gameState.pendingEffect && (
              <button className="btn" onClick={skipBuy}>
                購入スキップ
              </button>
            )}
            {aiTurn && (
              <button className="btn btn-primary" onClick={executeAITurn}>
                AIターン実行
              </button>
            )}
          </div>
        </div>

        <div className="game-middle-right">
          <GameLog log={gameState.log} />
        </div>
      </div>

      <div className="game-bottom">
        <Hand
          hand={humanPlayer.hand}
          onPlay={canPlayActions ? handlePlayCard : undefined}
          canPlay={canPlayActions}
        />
      </div>

      {gameState.pendingEffect && humanTurn && (
        <div className="pending-overlay">
          <PendingEffectUI
            pendingEffect={gameState.pendingEffect}
            hand={humanPlayer.hand}
            supply={gameState.supply}
            onResolve={resolvePending}
          />
        </div>
      )}
    </div>
  );
}
