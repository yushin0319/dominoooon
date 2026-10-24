import { Coins, ShoppingCart, Swords } from 'lucide-react';
import { memo } from 'react';
import { EMPTY_PILES_TO_END } from '../domain/supply';
import type { GameEndStatus } from '../lib/gameEnd';
import { cn } from '../lib/utils';
import type { Phase, TurnState } from '../types';

interface TurnInfoProps {
  turnState: TurnState;
  phase: Phase;
  /** ラウンド（両者が 1 回ずつ番を終えると 1 ラウンド。domain/game.ts の getRoundNumber） */
  round: number;
  currentPlayer: string;
  /** ゲーム終了の近さ（属州の残り・空の山の数） */
  endStatus: GameEndStatus;
}

// 色は OS のライト / ダーク設定によらず暗い配色で固定する（dark: で分けていたので、ライトモードでは明るい灰色の板になっていた）
// 終了が近いほど目立たせる（near = まもなく終了 / end = このターンで終了）
const endLevelClass: Record<GameEndStatus['level'], string> = {
  normal: 'text-white',
  near: 'bg-amber-500/20 text-amber-200 ring-1 ring-amber-400',
  end: 'bg-rose-500/25 text-rose-100 ring-1 ring-rose-400',
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

// 狭い画面の横長バーは幅が足りないので短く書く（12px の文字で 390px の画面に収める）
const phaseShortJa: Record<string, string> = {
  Action: 'アクション',
  Buy: '購入',
  Cleanup: '片付け',
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

// 小さいラベル（アクション・購入・コインなど）。12px 未満は読みにくい
const LABEL = 'text-xs text-slate-400 font-medium whitespace-nowrap';

const TurnInfo = memo(function TurnInfo({
  turnState,
  phase,
  round,
  currentPlayer,
  endStatus,
}: TurnInfoProps) {
  const levelText = endLevelText[endStatus.level];
  return (
    // lg 未満: 画面上部の横長バー（プレイエリアに重ならない） / lg 以上: 右端に浮かせる縦長パネル。
    // lg 以上は幅を固定する（フェーズ名の長さ・番の人で幅が変わり、パネルが横に 30px ずれていた）
    <div className="shrink-0 mx-2 mt-2 flex flex-row justify-around items-center gap-2 sm:gap-3 p-2 sm:p-3 z-40 lg:absolute lg:mx-0 lg:mt-0 lg:right-3 lg:top-1/2 lg:-translate-y-1/2 lg:w-[152px] lg:flex-col lg:justify-normal bg-slate-800/70 backdrop-blur-sm rounded-lg border border-slate-600 shadow-xl">
      {/* Player Info。lg 未満は幅を固定する（フェーズ名の長さで右の欄が横にずれないように） */}
      <div className="flex flex-col items-center gap-0.5 sm:gap-1 w-[4.75rem] shrink-0 pr-2 border-r lg:pr-0 lg:pb-2 lg:border-r-0 lg:border-b lg:w-full border-slate-600">
        <div className={LABEL}>ラウンド {round}</div>
        <div className="text-xs sm:text-sm font-bold text-white truncate max-w-full">
          {currentPlayer}
        </div>
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${phaseColor(phase)}`}
        >
          <span className="lg:hidden">{phaseShortJa[phase] ?? phase}</span>
          <span className="hidden lg:inline">
            {phaseNameJa[phase] ?? phase}
          </span>
        </span>
      </div>

      {/* Action counter */}
      <div className="flex flex-col items-center gap-0.5 sm:gap-1">
        <Swords className="w-4 h-4 sm:w-5 sm:h-5 text-slate-300" />
        <span className={LABEL}>アクション</span>
        <span className="text-lg sm:text-xl font-black text-white">
          {turnState.actions}
        </span>
      </div>

      {/* Buy counter */}
      <div className="flex flex-col items-center gap-0.5 sm:gap-1">
        <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 text-slate-300" />
        <span className={LABEL}>購入</span>
        <span className="text-lg sm:text-xl font-black text-white">
          {turnState.buys}
        </span>
      </div>

      {/* Coin counter */}
      <div className="flex flex-col items-center gap-0.5 sm:gap-1">
        <Coins className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" />
        <span className={LABEL}>コイン</span>
        <span className="text-lg sm:text-xl font-black text-yellow-400">
          {turnState.coins}
        </span>
      </div>

      {/* ゲーム終了の近さ。lg 未満は右端の列、lg 以上はパネルの一番下 */}
      <div className="pl-2 border-l lg:pl-0 lg:pt-2 lg:border-l-0 lg:border-t lg:w-full border-slate-600">
        <div
          data-testid="game-end-status"
          data-level={endStatus.level}
          className={cn(
            'flex flex-col items-center gap-0.5 sm:gap-1 px-1.5 py-0.5 rounded-md',
            endLevelClass[endStatus.level],
          )}
        >
          <span className="text-xs font-medium opacity-80 whitespace-nowrap">
            属州 残り
          </span>
          <span className="text-lg sm:text-xl font-black leading-none">
            {endStatus.provincesLeft}
          </span>
          <span className="text-xs font-medium whitespace-nowrap">
            空の山 {endStatus.emptyPiles}/{EMPTY_PILES_TO_END}
          </span>
          {/* 狭い画面は色だけで示し、読み上げ用に文を残す。
              lg 以上は文が無いときも 1 行分を空けておく（終了が近づいたときにパネルの高さが変わって上下にずれないように） */}
          {levelText ? (
            <span className="sr-only lg:not-sr-only lg:text-xs lg:font-bold lg:whitespace-nowrap">
              {levelText}
            </span>
          ) : (
            <span aria-hidden="true" className="hidden lg:block lg:h-4" />
          )}
        </div>
      </div>
    </div>
  );
});

export default TurnInfo;
