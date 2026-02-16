import { Swords, ShoppingCart, Coins } from 'lucide-react';
import type { TurnState, Phase } from '../types';

interface TurnInfoProps {
  turnState: TurnState;
  phase: Phase;
  turnNumber: number;
  currentPlayer: string;
  onEndPhase?: () => void;
}

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

export default function TurnInfo({ turnState, phase, turnNumber, currentPlayer, onEndPhase }: TurnInfoProps) {
  return (
    <div className="absolute right-3 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-3 p-3 bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-lg border border-slate-300 dark:border-slate-600 shadow-xl">
      {/* Player Info */}
      <div className="flex flex-col items-center gap-1 pb-2 border-b border-slate-300 dark:border-slate-600 w-full">
        <div className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">
          Turn {turnNumber}
        </div>
        <div className="text-sm font-bold text-slate-900 dark:text-white">
          {currentPlayer}
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${phaseColor(phase)}`}>
          {phase}
        </span>
      </div>

      {/* Action counter */}
      <div className="flex flex-col items-center gap-1">
        <Swords className="w-5 h-5 text-slate-700 dark:text-slate-300" />
        <span className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">アクション</span>
        <span className="text-xl font-black text-slate-900 dark:text-white">{turnState.actions}</span>
      </div>

      {/* Buy counter */}
      <div className="flex flex-col items-center gap-1">
        <ShoppingCart className="w-5 h-5 text-slate-700 dark:text-slate-300" />
        <span className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">購入</span>
        <span className="text-xl font-black text-slate-900 dark:text-white">{turnState.buys}</span>
      </div>

      {/* Coin counter */}
      <div className="flex flex-col items-center gap-1">
        <Coins className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
        <span className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">コイン</span>
        <span className="text-xl font-black text-yellow-600 dark:text-yellow-400">{turnState.coins}</span>
      </div>

      {/* End Phase Button */}
      {onEndPhase && (
        <>
          <div className="w-full h-px bg-slate-300 dark:bg-slate-600" />
          <button
            onClick={onEndPhase}
            className="text-[11px] font-bold whitespace-nowrap px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 active:scale-95 transition-all shadow"
          >
            フェーズ
            <br />
            終了
          </button>
        </>
      )}
    </div>
  );
}
