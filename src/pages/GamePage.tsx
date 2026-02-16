import { useEffect, useState } from 'react';
import { useGameStore } from '../stores/gameStore';
import { Phase, CardType, GameState } from '../types';
import { getCurrentPlayer } from '../domain/game';
import { getCardDef } from '../domain/card';
import SupplyArea from '../components/SupplyArea';
import Hand from '../components/Hand';
import PlayArea from '../components/PlayArea';
import TurnInfo from '../components/TurnInfo';
import GameLog from '../components/GameLog';
import PendingEffectUI from '../components/PendingEffectUI';
import CardView from '../components/CardView';

// Timing constants
const AI_TURN_DELAY_MS = 400;
const EFFECT_RESOLVE_DELAY_MS = 400;

// Game flow state machine
type GameFlowState = 'player-turn' | 'ai-turn' | 'pending-effect' | 'game-over' | 'idle';

function getGameFlowState(gameState: GameState | null, isAITurn: () => boolean): GameFlowState {
  if (!gameState) return 'idle';
  if (gameState.gameOver) return 'game-over';
  if (gameState.pendingEffect) return 'pending-effect';
  if (isAITurn()) return 'ai-turn';
  return 'player-turn';
}

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

  // Unified game flow state machine
  useEffect(() => {
    const flowState = getGameFlowState(gameState, isAITurn);

    switch (flowState) {
      case 'ai-turn': {
        const timer = setTimeout(() => {
          executeAITurn();
        }, AI_TURN_DELAY_MS);
        return () => clearTimeout(timer);
      }

      case 'pending-effect': {
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
            resolvePending({ type: gameState.pendingEffect!.type, selectedCards: toDiscard });
          } else {
            // その他のpendingEffect: 空選択で解決
            resolvePending({ type: gameState.pendingEffect!.type, selectedCards: [] });
          }
        }, EFFECT_RESOLVE_DELAY_MS);
        return () => clearTimeout(timer);
      }

      case 'game-over': {
        goToResult();
        return;
      }

      case 'player-turn':
      case 'idle':
      default:
        return;
    }
  }, [gameState, executeAITurn, isAITurn, resolvePending, goToResult]);

  if (!gameState) return null;

  if (gameState.gameOver) {
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
    <div className="relative w-full h-screen overflow-hidden flex flex-col bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800">
      {/* Dark overlay for depth */}
      <div className="absolute inset-0 bg-slate-950/40 z-0" />

      {/* Content */}
      <div className="relative z-10 flex flex-col h-full">
        {/* Main area */}
        <div className="flex-1 relative flex">
          {/* Supply and Play Area (center) */}
          <div className="flex-1 flex flex-col items-center justify-center p-4 overflow-y-auto">
            <div className="w-full max-w-5xl space-y-6">
              <SupplyArea
                supply={gameState.supply}
                onBuy={canBuyCards ? (cardName: string) => setBuyTarget(cardName) : undefined}
                canBuy={canBuyCards}
                maxCost={canBuyCards ? gameState.turnState.coins : undefined}
              />

              <PlayArea cards={currentPlayer.playArea} />

              {/* Action buttons */}
              <div className="flex gap-2 justify-center">
                {humanTurn && gameState.phase === Phase.Action && !gameState.pendingEffect && (
                  <button
                    onClick={skipAction}
                    className="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-800/80 border border-slate-600 rounded hover:bg-slate-700/80 transition-colors"
                  >
                    アクションスキップ
                  </button>
                )}
                {humanTurn && gameState.phase === Phase.Buy && !gameState.pendingEffect && (
                  <button
                    onClick={skipBuy}
                    className="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-800/80 border border-slate-600 rounded hover:bg-slate-700/80 transition-colors"
                  >
                    購入スキップ
                  </button>
                )}
                {aiTurn && (
                  <p className="text-sm text-slate-400 py-2">
                    AIが考えています...
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* TurnInfo - フローティング（コンポーネント内で absolute 配置） */}
          <TurnInfo
            turnState={gameState.turnState}
            phase={gameState.phase}
            turnNumber={gameState.turnNumber}
            currentPlayer={currentPlayer.name}
          />

          {/* GameLog - フローティング（コンポーネント内で absolute 配置） */}
          <GameLog log={gameState.log} />
        </div>

        {/* Player hand - bottom */}
        <div className="relative z-20">
          <Hand
            hand={humanPlayer.hand}
            onPlay={canPlayActions ? handlePlayCard : undefined}
            canPlay={canPlayActions}
          />
        </div>
      </div>

      {/* PendingEffect オーバーレイ（人間プレイヤー対象） */}
      {gameState.pendingEffect && gameState.pendingEffect.playerId === humanPlayer.id && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <PendingEffectUI
            pendingEffect={gameState.pendingEffect}
            hand={humanPlayer.hand}
            supply={gameState.supply}
            onResolve={resolvePending}
          />
        </div>
      )}

      {/* 購入確認ダイアログ */}
      {buyTarget && (() => {
        const cardDef = getCardDef(buyTarget);
        return (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setBuyTarget(null)}>
            <div className="bg-slate-800 border border-slate-600 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-2xl font-bold text-slate-100 mb-4">
                {cardDef.nameJa ?? cardDef.name}
              </h2>
              <div className="flex justify-center mb-4">
                <CardView card={cardDef} />
              </div>
              <div className="space-y-1 mb-6">
                <p className="text-sm text-slate-300">
                  コスト: {cardDef.cost} コイン
                </p>
                <p className="text-sm text-slate-300">
                  種別: {cardDef.types.join(' / ')}
                </p>
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setBuyTarget(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-700 border border-slate-600 rounded hover:bg-slate-600 transition-colors"
                >
                  やめる
                </button>
                <button
                  onClick={() => { buyCard(buyTarget); setBuyTarget(null); }}
                  className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded hover:bg-purple-700 transition-colors"
                >
                  購入する
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* プレイ確認ダイアログ */}
      {playTarget && (() => {
        const card = humanPlayer.hand.find((c) => c.instanceId === playTarget);
        if (!card) return null;
        return (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setPlayTarget(null)}>
            <div className="bg-slate-800 border border-slate-600 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-2xl font-bold text-slate-100 mb-4">
                {card.def.nameJa ?? card.def.name}
              </h2>
              <div className="flex justify-center mb-6">
                <CardView card={card} />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setPlayTarget(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-700 border border-slate-600 rounded hover:bg-slate-600 transition-colors"
                >
                  やめる
                </button>
                <button
                  onClick={() => { playAction(playTarget); setPlayTarget(null); }}
                  className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded hover:bg-purple-700 transition-colors"
                >
                  プレイする
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
