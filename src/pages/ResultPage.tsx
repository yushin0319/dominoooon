import { useGameStore } from '../stores/gameStore';
import { getGameResults } from '../domain/game';

export default function ResultPage() {
  const gameState = useGameStore((s) => s.gameState);
  const goToTitle = useGameStore((s) => s.goToTitle);

  if (!gameState) return null;

  const results = getGameResults(gameState);

  return (
    <div className="result-page">
      <h2>ゲーム結果</h2>
      <div className="result-list">
        {results.map((r, i) => (
          <div key={r.playerId} className={`result-row ${i === 0 ? 'winner' : ''}`}>
            <span className="result-rank">{i + 1}位</span>
            <span className="result-name">{r.name}</span>
            <span className="result-vp">{r.vp} VP</span>
          </div>
        ))}
      </div>
      <p className="result-turns">ターン数: {gameState.turnNumber}</p>
      <button className="btn btn-primary" onClick={goToTitle}>
        タイトルに戻る
      </button>
    </div>
  );
}
