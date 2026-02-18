import { useEffect, useState } from 'react';
import { useGameStore } from '../stores/gameStore';
import { Phase, CardType } from '../types';
import type { PendingEffect, PlayerState } from '../types';
import { getCardDef } from '../domain/card';
import SupplyArea from '../components/SupplyArea';
import Hand from '../components/Hand';
import PlayArea from '../components/PlayArea';
import TurnInfo from '../components/TurnInfo';
import GameLog from '../components/GameLog';
import PendingEffectUI from '../components/PendingEffectUI';
import ConfirmDialog from '../components/ConfirmDialog';
import { resolveAIPendingEffect } from '../ai/aiPendingResolver';

// Timing constants
const AI_TURN_DELAY_MS = 400;
const EFFECT_RESOLVE_DELAY_MS = 400;

// Game flow state machine
type GameFlowState = 'player-turn' | 'ai-turn' | 'pending-effect' | 'game-over' | 'idle';

function getGameFlowState(
  players: PlayerState[] | undefined,
  gameOver: boolean,
  pendingEffect: PendingEffect | null,
  isAITurn: boolean,
): GameFlowState {
  if (!players) return 'idle';
  if (gameOver) return 'game-over';
  if (pendingEffect) return 'pending-effect';
  if (isAITurn) return 'ai-turn';
  return 'player-turn';
}

export default function GamePage() {
  // 粒度の細かいセレクタ（gameState 丸ごとの subscribe を廃止）
  const phase = useGameStore((s) => s.gameState?.phase);
  const turnState = useGameStore((s) => s.gameState?.turnState);
  const supply = useGameStore((s) => s.gameState?.supply);
  const players = useGameStore((s) => s.gameState?.players);
  const log = useGameStore((s) => s.gameState?.log);
  const turnNumber = useGameStore((s) => s.gameState?.turnNumber);
  const gameOver = useGameStore((s) => s.gameState?.gameOver ?? false);
  const pendingEffect = useGameStore((s) => s.gameState?.pendingEffect ?? null);
  const currentPlayerIndex = useGameStore((s) => s.gameState?.currentPlayerIndex ?? 0);
  // boolean セレクタ（isHumanTurn / isAITurn をストアから分離）
  const isHumanTurn = useGameStore((s) => s.gameState?.currentPlayerIndex === 0);
  const isAITurn = useGameStore((s) => s.gameState?.currentPlayerIndex === 1);

  const playAction = useGameStore((s) => s.playAction);
  const skipAction = useGameStore((s) => s.skipAction);
  const buyCard = useGameStore((s) => s.buyCard);
  const skipBuy = useGameStore((s) => s.skipBuy);
  const resolvePending = useGameStore((s) => s.resolvePending);
  const executeAITurn = useGameStore((s) => s.executeAITurn);
  const goToResult = useGameStore((s) => s.goToResult);

  const [buyTarget, setBuyTarget] = useState<string | null>(null);
  const [playTarget, setPlayTarget] = useState<string | null>(null);
  const [phaseNotification, setPhaseNotification] = useState<string | null>(null);
  const [prevPhase, setPrevPhase] = useState<Phase | null>(null);

  // Phase transition notification
  useEffect(() => {
    if (!phase || !isHumanTurn) return;
    if (prevPhase === null) {
      setPrevPhase(phase);
      return;
    }
    if (prevPhase !== phase) {
      const phaseNames: Record<Phase, string> = {
        [Phase.Action]: 'アクションフェーズ',
        [Phase.Buy]: '購入フェーズ',
        [Phase.Cleanup]: 'クリーンアップフェーズ',
      };
      const newPhaseName = phaseNames[phase];
      setPhaseNotification(`${newPhaseName}に移りました`);
      setPrevPhase(phase);
    }
  }, [phase, isHumanTurn, prevPhase]);

  // Auto-dismiss phase notification
  useEffect(() => {
    if (!phaseNotification) return;
    const timer = setTimeout(() => setPhaseNotification(null), 2500);
    return () => clearTimeout(timer);
  }, [phaseNotification]);

  // Unified game flow state machine
  useEffect(() => {
    const flowState = getGameFlowState(players, gameOver, pendingEffect, isAITurn);

    switch (flowState) {
      case 'ai-turn': {
        const timer = setTimeout(() => {
          executeAITurn();
        }, AI_TURN_DELAY_MS);
        return () => clearTimeout(timer);
      }

      case 'pending-effect': {
        if (!pendingEffect || !players) return;
        const humanId = players[0].id;
        if (pendingEffect.playerId === humanId) return; // 人間対象なら手動解決

        const capturedPendingEffect = pendingEffect;
        const capturedPlayers = players;
        const timer = setTimeout(() => {
          resolveAIPendingEffect(capturedPendingEffect, capturedPlayers, resolvePending);
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
  }, [players, gameOver, pendingEffect, isAITurn, executeAITurn, resolvePending, goToResult]);

  if (!players || !turnState || phase === undefined || supply === undefined ||
      log === undefined || turnNumber === undefined) return null;

  if (gameOver) return null;

  const humanPlayer = players[0];
  const currentPlayer = players[currentPlayerIndex];

  const canPlayActions =
    isHumanTurn &&
    phase === Phase.Action &&
    turnState.actions > 0 &&
    !pendingEffect;

  const canBuyCards =
    isHumanTurn &&
    phase === Phase.Buy &&
    turnState.buys > 0 &&
    !pendingEffect;

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
                supply={supply}
                onBuy={canBuyCards ? (cardName: string) => setBuyTarget(cardName) : undefined}
                canBuy={canBuyCards}
                maxCost={canBuyCards ? turnState.coins : undefined}
              />

              <PlayArea cards={currentPlayer.playArea} />

              {/* Action buttons */}
              <div className="flex gap-2 justify-center items-center">
                {isHumanTurn && phase === Phase.Action && !pendingEffect && (
                  <button
                    onClick={skipAction}
                    className="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-800/80 border border-slate-600 rounded hover:bg-slate-700/80 transition-colors"
                  >
                    アクションスキップ
                  </button>
                )}
                {isHumanTurn && phase === Phase.Buy && !pendingEffect && (
                  <button
                    onClick={skipBuy}
                    className="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-800/80 border border-slate-600 rounded hover:bg-slate-700/80 transition-colors"
                  >
                    購入スキップ
                  </button>
                )}
                {isAITurn && (
                  <div className="flex items-center gap-2 py-2">
                    <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-slate-400">
                      AIが考えています...
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* TurnInfo - フローティング（コンポーネント内で absolute 配置） */}
          <TurnInfo
            turnState={turnState}
            phase={phase}
            turnNumber={turnNumber}
            currentPlayer={currentPlayer.name}
          />

          {/* GameLog - フローティング（コンポーネント内で absolute 配置） */}
          <GameLog log={log} />
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
      {pendingEffect && pendingEffect.playerId === humanPlayer.id && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <PendingEffectUI
            pendingEffect={pendingEffect}
            hand={humanPlayer.hand}
            supply={supply}
            onResolve={resolvePending}
          />
        </div>
      )}

      {/* 購入確認ダイアログ */}
      {buyTarget && (
        <ConfirmDialog
          title={(getCardDef(buyTarget).nameJa ?? getCardDef(buyTarget).name)}
          cardDef={getCardDef(buyTarget)}
          confirmLabel="購入する"
          onConfirm={() => { buyCard(buyTarget); setBuyTarget(null); }}
          onCancel={() => setBuyTarget(null)}
          details={{ cost: getCardDef(buyTarget).cost, types: getCardDef(buyTarget).types }}
        />
      )}

      {/* プレイ確認ダイアログ */}
      {playTarget && (() => {
        const card = humanPlayer.hand.find((c) => c.instanceId === playTarget);
        if (!card) return null;
        return (
          <ConfirmDialog
            title={card.def.nameJa ?? card.def.name}
            cardDef={card.def}
            confirmLabel="プレイする"
            onConfirm={() => { playAction(playTarget); setPlayTarget(null); }}
            onCancel={() => setPlayTarget(null)}
          />);
      })()}

      {/* Phase transition notification */}
      {phaseNotification && (
        <div
          aria-live="polite"
          className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-slate-800 text-slate-100 text-sm font-medium border border-slate-600 rounded shadow-lg animate-fade-in"
        >
          {phaseNotification}
        </div>
      )}
    </div>
  );
}
