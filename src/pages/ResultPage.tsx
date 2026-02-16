import { useGameStore } from '../stores/gameStore';
import { getGameResults } from '../domain/game';

export default function ResultPage() {
  const gameState = useGameStore((s) => s.gameState);
  const goToTitle = useGameStore((s) => s.goToTitle);

  if (!gameState) return null;

  const results = getGameResults(gameState);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 animate-fade-in">
      <div className="max-w-md w-full mx-4 space-y-6">
        <h1 className="text-4xl font-bold text-white text-center mb-8">
          ゲーム結果
        </h1>

        <div className="space-y-2">
          {results.map((r, i) => (
            <div
              key={r.playerId}
              className={`
                flex items-center justify-between p-4 rounded-lg
                ${i === 0
                  ? 'bg-white shadow-xl border-l-4 border-yellow-400'
                  : 'bg-white/90 shadow'
                }
              `}
            >
              <span className="font-bold text-slate-900">{i + 1}位</span>
              <span className="flex-1 ml-4 text-slate-900">{r.name}</span>
              <span className="font-bold text-green-600">
                {r.vp} VP
              </span>
            </div>
          ))}
        </div>

        <p className="text-center text-slate-300">
          ターン数: {gameState.turnNumber}
        </p>

        <div className="flex justify-center">
          <button
            onClick={goToTitle}
            className="px-8 py-3 text-lg font-semibold text-white bg-purple-600 rounded-lg hover:bg-purple-700 active:scale-95 transition-all shadow-lg hover:shadow-xl"
          >
            タイトルに戻る
          </button>
        </div>
      </div>
    </div>
  );
}
