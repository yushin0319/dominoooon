import { Coins, ShoppingCart, Swords } from 'lucide-react';
import { memo } from 'react';
import { EMPTY_PILES_TO_END } from '../domain/supply';
import type { GameEndStatus } from '../lib/gameEnd';
import { cn } from '../lib/utils';
import type { Phase, TurnState } from '../types';

interface TurnInfoProps {
  turnState: TurnState;
  phase: Phase;
  turnNumber: number;
  currentPlayer: string;
  /** ゲーム終了の近さ（属州の残り・空の山の数） */
  endStatus: GameEndStatus;
}

// 終了が近いほど目立たせる（near = まもなく終了 / end = このターンで終了）
const endLevelClass: Record<GameEndStatus['level'], string> = {
  normal: 'text-slate-900 dark:text-white',
  near: 'bg-amber-100 text-amber-800 ring-1 ring-amber-400 dark:bg-amber-500/20 dark:text-amber-200',
  end: 'bg-rose-100 text-rose-800 ring-1 ring-rose-400 dark:bg-rose-500/25 dark:text-rose-100',
};

const endLevelText: Record<GameEndStatus['level'], string | null> = {
  normal: null,
  near: 'まもなく終了',
  end: 'このターンで終了',
};

const phaseNameJa: Record<string, string> = {
  Action: 'アクションフェーズ',
  Buy: '購入フェーズ',
  Cleanup: 'クリーンアップ',
};

function phaseColor(phase: Phase): string {
  switch (phase) {
    case 'Buy':
      return 'bg-yellow-500 text-black';
    case 'Cleanup':
      return 'bg-green-600 text-white';
    default:
      return 'bg-blue-600 text-white';
  }
}

const TurnInfo = memo(function TurnInfo({
  turnState,
  phase,
  turnNumber,
  currentPlayer,
  endStatus,
}: TurnInfoProps) {
  const levelText = endLevelText[endStatus.level];
  return (
    // lg 未満: 画面上部の横長バー（プレイエリアに重ならない） / lg 以上: 右端に浮かせる縦長パネル
    <div className="shrink-0 mx-2 mt-2 flex flex-row justify-around items-center gap-2 sm:gap-3 p-2 sm:p-3 z-40 lg:absolute lg:mx-0 lg:mt-0 lg:right-3 lg:top-1/2 lg:-translate-y-1/2 lg:flex-col lg:justify-normal bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-lg border border-slate-300 dark:border-slate-600 shadow-xl">
      {/* Player Info */}
      <div className="flex flex-col items-center gap-0.5 sm:gap-1 pr-2 border-r lg:pr-0 lg:pb-2 lg:border-r-0 lg:border-b lg:w-full border-slate-300 dark:border-slate-600">
        <div className="text-[9px] sm:text-[10px] text-slate-600 dark:text-slate-400 font-medium">
          Turn {turnNumber}
        </div>
        <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate max-w-[80px] sm:max-w-none">
          {currentPlayer}
        </div>
        <span
          className={`text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full font-medium ${phaseColor(phase)}`}
        >
          {phaseNameJa[phase] ?? phase}
        </span>
      </div>

      {/* Action counter */}
      <div className="flex flex-col items-center gap-0.5 sm:gap-1">
        <Swords className="w-4 h-4 sm:w-5 sm:h-5 text-slate-700 dark:text-slate-300" />
        <span className="text-[9px] sm:text-[10px] text-slate-600 dark:text-slate-400 font-medium">
          アクション
        </span>
        <span className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
          {turnState.actions}
        </span>
      </div>

      {/* Buy counter */}
      <div className="flex flex-col items-center gap-0.5 sm:gap-1">
        <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 text-slate-700 dark:text-slate-300" />
        <span className="text-[9px] sm:text-[10px] text-slate-600 dark:text-slate-400 font-medium">
          購入
        </span>
        <span className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
          {turnState.buys}
        </span>
      </div>

      {/* Coin counter */}
      <div className="flex flex-col items-center gap-0.5 sm:gap-1">
        <Coins className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600 dark:text-yellow-400" />
        <span className="text-[9px] sm:text-[10px] text-slate-600 dark:text-slate-400 font-medium">
          コイン
        </span>
        <span className="text-lg sm:text-xl font-black text-yellow-600 dark:text-yellow-400">
          {turnState.coins}
        </span>
      </div>

      {/* ゲーム終了の近さ。lg 未満は右端の列、lg 以上はパネルの一番下 */}
      <div className="pl-2 border-l lg:pl-0 lg:pt-2 lg:border-l-0 lg:border-t lg:w-full border-slate-300 dark:border-slate-600">
        <div
          data-testid="game-end-status"
          data-level={endStatus.level}
          className={cn(
            'flex flex-col items-center gap-0.5 sm:gap-1 px-1.5 py-0.5 rounded-md',
            endLevelClass[endStatus.level],
          )}
        >
          <span className="text-[9px] sm:text-[10px] font-medium opacity-80 whitespace-nowrap">
            属州 残り
          </span>
          <span className="text-lg sm:text-xl font-black leading-none">
            {endStatus.provincesLeft}
          </span>
          <span className="text-[9px] sm:text-[10px] font-medium whitespace-nowrap">
            空の山 {endStatus.emptyPiles}/{EMPTY_PILES_TO_END}
          </span>
          {/* 狭い画面は色だけで示し、読み上げ用に文を残す */}
          {levelText && (
            <span className="sr-only lg:not-sr-only lg:text-[10px] lg:font-bold lg:whitespace-nowrap">
              {levelText}
            </span>
          )}
        </div>
      </div>
    </div>
  );
});

export default TurnInfo;
