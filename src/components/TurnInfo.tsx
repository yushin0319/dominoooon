import type { TurnState, Phase } from '../types';

interface TurnInfoProps {
  turnState: TurnState;
  phase: Phase;
  turnNumber: number;
  currentPlayer: string;
}

export default function TurnInfo({ turnState, phase, turnNumber, currentPlayer }: TurnInfoProps) {
  return (
    <div className="turn-info">
      <div className="turn-info-player">
        <span className="turn-label">Turn {turnNumber}</span>
        <span className="turn-player">{currentPlayer}</span>
      </div>
      <div className="turn-info-phase">
        <span className={`phase-badge phase-${phase.toLowerCase()}`}>{phase}</span>
      </div>
      <div className="turn-info-stats">
        <span className="stat">Actions: {turnState.actions}</span>
        <span className="stat">Buys: {turnState.buys}</span>
        <span className="stat">Coins: {turnState.coins}</span>
      </div>
    </div>
  );
}
