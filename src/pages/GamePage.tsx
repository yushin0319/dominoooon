import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { resolveAIPendingEffect } from '../ai/aiPendingResolver';
import ConfirmDialog from '../components/ConfirmDialog';
import GameLog from '../components/GameLog';
import Hand from '../components/Hand';
import PendingEffectUI from '../components/PendingEffectUI';
import PlayArea from '../components/PlayArea';
import PlayerStatus, {
  PlayerStatusButton,
  PlayerStatusDialog,
} from '../components/PlayerStatus';
import SupplyArea from '../components/SupplyArea';
import TurnBar from '../components/TurnBar';
import TurnInfo from '../components/TurnInfo';
import { getCardDef } from '../domain/card';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { getGameEndReasonText, getGameEndStatus } from '../lib/gameEnd';
import {
  GAME_OVER_DELAY_MS,
  getAIStepMs,
  getAITurnStartMs,
  getTurnGuide,
  getTurnNotice,
  NOTICE_MS,
  TURN_ACTION_CONFIRM,
  TURN_ACTION_LABEL,
  type TurnAction,
  type TurnPoint,
} from '../lib/turnFlow';
import {
  selectAITurnStep,
  selectUndoableBuy,
  useGameStore,
} from '../stores/gameStore';
import type { PendingEffect, PlayerState } from '../types';
import { CardType } from '../types';

// Timing constants（AI のターンの段階を見せる時間は lib/turnFlow.ts）
const EFFECT_RESOLVE_DELAY_MS = 400;

// Game flow state machine
type GameFlowState =
  | 'player-turn'
  | 'ai-turn'
  | 'pending-effect'
  | 'game-over'
  | 'idle';

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
  const currentPlayerIndex = useGameStore(
    (s) => s.gameState?.currentPlayerIndex ?? 0,
  );
  // boolean セレクタ（isHumanTurn / isAITurn をストアから分離）
  const isHumanTurn = useGameStore(
    (s) => s.gameState?.currentPlayerIndex === 0,
  );
  const isAITurn = useGameStore((s) => s.gameState?.currentPlayerIndex === 1);
  // 次に何をすればよいかの一言と主ボタン（中身が同じなら描き直さない）
  const guide = useGameStore(
    useShallow((s) => (s.gameState ? getTurnGuide(s.gameState) : null)),
  );
  // 取り消せる購入（買った直後の状態のままのときだけ）
  const undoableBuy = useGameStore(selectUndoableBuy);
  // 段階ごとに見せている AI のターンの、今の段階（使ったアクション / 財宝を場に出した / 買った）
  const aiStep = useGameStore(selectAITurnStep);
  const reducedMotion = usePrefersReducedMotion();

  const playAction = useGameStore((s) => s.playAction);
  const skipAction = useGameStore((s) => s.skipAction);
  const buyCard = useGameStore((s) => s.buyCard);
  const undoBuy = useGameStore((s) => s.undoBuy);
  const skipBuy = useGameStore((s) => s.skipBuy);
  const resolvePending = useGameStore((s) => s.resolvePending);
  const startAITurn = useGameStore((s) => s.startAITurn);
  const advanceAITurn = useGameStore((s) => s.advanceAITurn);
  const executeAITurn = useGameStore((s) => s.executeAITurn);
  const goToResult = useGameStore((s) => s.goToResult);

  // 取り返しのつかない操作（購入へ進む / ターン終了）の確認を出しているか
  const [confirm, setConfirm] = useState<TurnAction | null>(null);
  // ターン・フェーズのお知らせ（同じ文が続いても新しいオブジェクトにして、消すまでの時間を数え直す）
  const [notice, setNotice] = useState<{ text: string } | null>(null);
  // 狭い画面で山札・捨て札・勝利点を開いているか（PC は常に見えている）
  const [statusOpen, setStatusOpen] = useState(false);
  // ゲームログの見出しに置く、狭い画面用のボタン（GameLog は memo なので、両者のカードが変わったときだけ作り直す）
  const statusButton = useMemo(
    () =>
      players ? (
        <PlayerStatusButton
          players={players}
          onOpen={() => setStatusOpen(true)}
          className="lg:hidden"
        />
      ) : null,
    [players],
  );
  const prevTurnRef = useRef<TurnPoint | null>(null);
  const gameOverTitleId = useId();

  const endStatus = useMemo(
    () => (supply ? getGameEndStatus(supply) : null),
    [supply],
  );

  // ターン・フェーズが変わったらお知らせを出す（自分の番の始まりは「あなたのターン」）
  useEffect(() => {
    if (phase === undefined || turnNumber === undefined) return;
    const next: TurnPoint = { turnNumber, isHumanTurn, phase };
    const text = getTurnNotice(prevTurnRef.current, next);
    prevTurnRef.current = next;
    if (text) setNotice({ text });
    // AI の番になったら自分の番のお知らせは消す（残っていると AI が何をしたかの一言を隠す）
    else if (!isHumanTurn) setNotice(null);
  }, [phase, turnNumber, isHumanTurn]);

  // お知らせは少しで消す
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), NOTICE_MS);
    return () => clearTimeout(timer);
  }, [notice]);

  // Unified game flow state machine
  useEffect(() => {
    const flowState = getGameFlowState(
      players,
      gameOver,
      pendingEffect,
      isAITurn,
    );

    switch (flowState) {
      case 'ai-turn': {
        // 少し待ってから段階に分けて始め、各段階を少しずつ見せる（最後の段階のあとで人間の番へ）
        const timer = aiStep
          ? setTimeout(advanceAITurn, getAIStepMs(aiStep.kind, reducedMotion))
          : setTimeout(startAITurn, getAITurnStartMs(reducedMotion));
        return () => clearTimeout(timer);
      }

      case 'pending-effect': {
        if (!pendingEffect || !players) return;
        const humanId = players[0].id;
        if (pendingEffect.playerId === humanId) return; // 人間対象なら手動解決

        const capturedPendingEffect = pendingEffect;
        const capturedPlayers = players;
        const timer = setTimeout(() => {
          resolveAIPendingEffect(
            capturedPendingEffect,
            capturedPlayers,
            resolvePending,
          );
        }, EFFECT_RESOLVE_DELAY_MS);
        return () => clearTimeout(timer);
      }

      case 'game-over': {
        // 終わった理由を少し見せてから結果画面へ（いきなり結果画面に切り替わっていた）
        const timer = setTimeout(goToResult, GAME_OVER_DELAY_MS);
        return () => clearTimeout(timer);
      }
      default:
        return;
    }
  }, [
    players,
    gameOver,
    pendingEffect,
    isAITurn,
    aiStep,
    reducedMotion,
    startAITurn,
    advanceAITurn,
    resolvePending,
    goToResult,
  ]);

  if (
    !players ||
    !turnState ||
    phase === undefined ||
    supply === undefined ||
    log === undefined ||
    turnNumber === undefined ||
    !guide ||
    !endStatus
  )
    return null;

  const humanPlayer = players[0];
  const currentPlayer = players[currentPlayerIndex];

  // 主ボタンが出ている = 人間の番・選択待ちなし・ゲーム中（getTurnGuide）
  const canPlayActions =
    guide.action === 'end-actions' && turnState.actions > 0;
  const canBuyCards = guide.action === 'end-turn' && turnState.buys > 0;
  const runTurnAction: Record<TurnAction, () => void> = {
    'end-actions': skipAction,
    'end-turn': skipBuy,
  };

  // 押したらすぐプレイする（確認画面は出さない。カードの説明は PC はホバー、指は長押しで見られる）
  function handlePlayCard(instanceId: string) {
    const card = humanPlayer.hand.find((c) => c.instanceId === instanceId);
    if (!card?.def.types.includes(CardType.Action)) return;
    playAction(instanceId);
  }

  // 購入へ進む / ターン終了: まだできることが残っていて戻れないときだけ確認する
  function handleTurnAction(action: TurnAction) {
    const gs = useGameStore.getState().gameState;
    if (gs && TURN_ACTION_CONFIRM[action].needsConfirm(gs)) {
      setConfirm(action);
    } else {
      runTurnAction[action]();
    }
  }

  const turnAction = guide.action;
  // AI のターンを見ている間（選択待ち・ゲーム終了を除く）は、今の段階の一言と「スキップ」を出す
  const watchingAITurn = isAITurn && !pendingEffect && !gameOver;

  return (
    <div className="relative w-full h-screen overflow-hidden flex flex-col bg-linear-to-b from-slate-900 via-slate-900 to-slate-800">
      {/* Dark overlay for depth */}
      <div className="absolute inset-0 bg-slate-950/40 z-0" />

      {/* Content */}
      <div className="relative z-10 flex flex-col h-full">
        {/* Main area: lg 未満は TurnInfo → サプライ/プレイエリア → GameLog の縦積み、lg 以上は TurnInfo と GameLog を浮かせる。
            min-h-0: 中身の高さで伸びて手札を画面外に押し出さないため（PC も同じ。伸びると画面全体が overflow-hidden の
            ルートの中ではみ出し、手札の下が切れたり、ルートがスクロールして上の見出しが切れたりしていた） */}
        <div className="flex-1 min-h-0 relative flex flex-col lg:flex-row">
          {/* TurnInfo - lg 未満は上部の横長バー、lg 以上はフローティング（コンポーネント内で absolute 配置） */}
          <TurnInfo
            turnState={turnState}
            phase={phase}
            turnNumber={turnNumber}
            currentPlayer={currentPlayer.name}
            endStatus={endStatus}
          />

          {/* 山札・捨て札・勝利点 - lg 以上は左上に常に出す（右は TurnInfo、左下は GameLog で、左上が空いている）。
              lg 未満はゲームログの見出しのボタンから開く（縦に余りが無いため） */}
          <div
            data-testid="player-status-panel"
            className="hidden lg:block absolute left-3 top-3 z-30 w-64 p-3 bg-slate-800/70 backdrop-blur-sm rounded-lg border border-slate-600 shadow-xl"
          >
            <PlayerStatus players={players} />
          </div>

          {/* Supply and Play Area (center) - lg 未満は上詰め、lg 以上は中央寄せ。
              中身が高いときは上詰めに戻す（justify-center-safe。ただの中央寄せだとはみ出た上端がスクロールで見えなくなる）。
              ターンを進めるボタンはここ（スクロールの中）には置かない（スマホ・PC 1366x768 でスクロールしないと見えなかった） */}
          <div className="flex-1 min-h-0 flex flex-col items-center justify-start lg:justify-center-safe p-4 overflow-y-auto">
            {/* 間隔は PC 1366x900 で手札まで画面に収まる詰め方（手札を画面内に入れたので、その分を詰めた） */}
            <div className="w-full max-w-5xl space-y-4">
              <SupplyArea
                supply={supply}
                onBuy={canBuyCards ? buyCard : undefined}
                canBuy={canBuyCards}
                maxCost={canBuyCards ? turnState.coins : undefined}
              />

              <PlayArea
                cards={currentPlayer.playArea}
                ownerLabel={isAITurn ? `${currentPlayer.name}の場` : undefined}
              />
            </div>
          </div>

          {/* GameLog - lg 未満は手札の上に固定の高さで置く、lg 以上はフローティング（コンポーネント内で absolute 配置） */}
          <GameLog log={log} headerAction={statusButton} />
        </div>

        {/* 次に何をするかの一言とターンを進めるボタン。手札のすぐ上に常に見える */}
        <TurnBar
          message={(watchingAITurn && aiStep?.message) || guide.message}
          busy={guide.busy}
          notice={notice?.text ?? null}
          primaryLabel={turnAction ? TURN_ACTION_LABEL[turnAction] : undefined}
          onPrimary={
            turnAction ? () => handleTurnAction(turnAction) : undefined
          }
          undoCardName={
            undoableBuy ? getCardDef(undoableBuy).nameJa : undefined
          }
          onUndo={undoBuy}
          onSkip={watchingAITurn ? executeAITurn : undefined}
        />

        {/* Player hand - bottom */}
        <div className="relative z-20">
          <Hand
            hand={humanPlayer.hand}
            onPlay={canPlayActions ? handlePlayCard : undefined}
            canPlay={canPlayActions}
          />
        </div>
      </div>

      {/* PendingEffect オーバーレイ（人間プレイヤー対象）。
          中身が画面より高いとき（スマホで手札が多い等）は重ね画面ごとスクロールする。
          枠そのものはスクロールさせない（カードのツールチップが枠で切れないように） */}
      {pendingEffect && pendingEffect.playerId === humanPlayer.id && (
        <div className="fixed inset-0 bg-black/70 z-50 overflow-y-auto overscroll-contain">
          <div className="min-h-full flex items-center justify-center p-4">
            <PendingEffectUI
              pendingEffect={pendingEffect}
              hand={humanPlayer.hand}
              discard={humanPlayer.discard}
              supply={supply}
              onResolve={resolvePending}
            />
          </div>
        </div>
      )}

      {/* 狭い画面: 山札・捨て札・勝利点 */}
      {statusOpen && (
        <PlayerStatusDialog
          players={players}
          onClose={() => setStatusOpen(false)}
        />
      )}

      {/* まだできることが残っているのに、フェーズを進める / ターンを終えるときの確認 */}
      {confirm && (
        <ConfirmDialog
          title={TURN_ACTION_CONFIRM[confirm].title}
          message={TURN_ACTION_CONFIRM[confirm].message(turnState)}
          confirmLabel={TURN_ACTION_LABEL[confirm]}
          onConfirm={() => {
            setConfirm(null);
            runTurnAction[confirm]();
          }}
          onCancel={() => setConfirm(null)}
        />
      )}

      {/* ゲーム終了: 理由を少し見せてから結果画面へ */}
      {gameOver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div
            role="status"
            aria-labelledby={gameOverTitleId}
            className="px-8 py-6 text-center bg-slate-800 border border-slate-600 rounded-lg shadow-xl motion-safe:animate-fade-in"
          >
            <h2
              id={gameOverTitleId}
              className="text-2xl font-bold text-white mb-2"
            >
              ゲーム終了
            </h2>
            {endStatus.reason && (
              <p className="text-base text-slate-200">
                {getGameEndReasonText(endStatus.reason)}
              </p>
            )}
            <p className="mt-3 text-xs text-slate-400">結果画面へ移ります</p>
          </div>
        </div>
      )}
    </div>
  );
}
