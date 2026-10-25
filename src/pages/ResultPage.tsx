import { RotateCcw } from 'lucide-react';
import { useMemo } from 'react';
import { getGameOutcome } from '../domain/game';
import {
  getEndReasonDetail,
  getKingdomNames,
  getResultHeadline,
  type ResultHeadline,
} from '../lib/gameResult';
import { cn } from '../lib/utils';
import { useGameStore } from '../stores/gameStore';

/** 一言の色（勝ち = 金 / 負け = 落ち着いた白 / 引き分け = 水色） */
const toneClass: Record<ResultHeadline['tone'], string> = {
  win: 'text-yellow-300',
  lose: 'text-slate-100',
  draw: 'text-sky-200',
};

/**
 * 結果画面。勝ち負けの一言・終わった理由・ラウンド数・勝利点の内訳と、次に遊ぶボタン。
 * 以前は「1位 あなた 30 VP」「ターン数: 24（両者のターンの合計）」と「タイトルに戻る」だけで、
 * 同点でも 1位・2位に分かれていた
 */
export default function ResultPage() {
  const gameState = useGameStore((s) => s.gameState);
  const hasLastSetup = useGameStore((s) => s.lastSetup !== null);
  const goToTitle = useGameStore((s) => s.goToTitle);
  const goToSetup = useGameStore((s) => s.goToSetup);
  const restartGame = useGameStore((s) => s.restartGame);

  const outcome = useMemo(
    () => (gameState ? getGameOutcome(gameState) : null),
    [gameState],
  );

  if (!gameState || !outcome) return null;

  // 人間は players[0]（あなた）
  const humanId = gameState.players[0].id;
  const headline = getResultHeadline(outcome, humanId);
  const reason = getEndReasonDetail(outcome);
  const kingdom = getKingdomNames(gameState.supply);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 motion-safe:animate-fade-in">
      <div className="w-full max-w-lg space-y-5">
        <header className="text-center space-y-2">
          <p className="text-sm font-medium text-slate-400">ゲーム終了</p>
          <h1
            className={cn(
              'text-4xl font-bold drop-shadow',
              toneClass[headline.tone],
            )}
          >
            {headline.title}
          </h1>
          {headline.note && (
            <p className="text-sm font-medium text-amber-200">
              {headline.note}
            </p>
          )}
          <p className="text-sm text-slate-300">
            {reason ? `${reason}・` : ''}
            {outcome.rounds} ラウンド
          </p>
        </header>

        {/* 勝利点の内訳（両者を見比べられるように、カードごとの行に両者の枚数と点を並べる） */}
        <div className="overflow-hidden rounded-lg border border-slate-600 bg-slate-800/80 shadow-xl">
          <table className="w-full text-sm text-slate-200">
            <caption className="sr-only">勝利点の内訳</caption>
            <thead>
              <tr className="border-b border-slate-600 bg-slate-900/40">
                <th scope="col" className="px-3 py-2 text-left font-medium">
                  <span className="sr-only">カード</span>
                </th>
                {outcome.players.map((p) => {
                  const won =
                    outcome.kind === 'win' &&
                    outcome.winnerIds.includes(p.playerId);
                  return (
                    <th
                      key={p.playerId}
                      scope="col"
                      className="px-3 py-2 text-right font-bold text-white"
                    >
                      {p.name}
                      {won && (
                        <span className="ml-2 align-middle rounded-full bg-yellow-400 px-2 py-0.5 text-xs font-bold text-slate-900">
                          勝ち
                        </span>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {outcome.vpRows.map((cardName, row) => (
                <tr key={cardName} className="border-b border-slate-700/70">
                  <th
                    scope="row"
                    className="px-3 py-2 text-left font-medium text-slate-300"
                  >
                    {outcome.players[0].breakdown[row].nameJa}
                  </th>
                  {outcome.players.map((p) => {
                    const entry = p.breakdown[row];
                    return (
                      <td
                        key={p.playerId}
                        className={cn(
                          'px-3 py-2 text-right tabular-nums whitespace-nowrap',
                          entry.count === 0 && 'text-slate-500',
                        )}
                      >
                        <span className="text-xs text-slate-400">
                          {entry.count} 枚
                        </span>
                        <span className="ml-2 inline-block min-w-[3.5em] font-semibold">
                          {entry.vp} 点
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-b border-slate-700/70 bg-slate-900/40">
                <th scope="row" className="px-3 py-2 text-left font-bold">
                  合計
                </th>
                {outcome.players.map((p) => (
                  <td
                    key={p.playerId}
                    className="px-3 py-2 text-right text-lg font-black text-white tabular-nums whitespace-nowrap"
                  >
                    {p.vp} 点
                  </td>
                ))}
              </tr>
              <tr>
                <th
                  scope="row"
                  className="px-3 py-2 text-left font-medium text-slate-400"
                >
                  ターン数
                </th>
                {outcome.players.map((p) => (
                  <td
                    key={p.playerId}
                    className="px-3 py-2 text-right text-slate-300 tabular-nums whitespace-nowrap"
                  >
                    {p.turns} ターン
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>

        <p className="text-center text-xs leading-relaxed text-slate-400">
          キングダム: {kingdom.join('・')}
        </p>

        {/* 次に遊ぶ。押せる高さは 44px 以上 */}
        <div className="flex flex-col gap-3">
          {hasLastSetup && (
            <button
              type="button"
              onClick={restartGame}
              className="min-h-12 px-6 inline-flex items-center justify-center gap-2 text-lg font-semibold text-white bg-purple-600 rounded-lg hover:bg-purple-700 motion-safe:active:scale-95 transition-all shadow-lg"
            >
              <RotateCcw aria-hidden="true" className="w-5 h-5" />
              同じキングダムでもう一度
            </button>
          )}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={goToSetup}
              className="min-h-11 px-3 text-sm font-medium text-slate-100 bg-slate-800/80 border border-slate-500 rounded-lg hover:bg-slate-700 transition-colors"
            >
              キングダムを選び直す
            </button>
            <button
              type="button"
              onClick={goToTitle}
              className="min-h-11 px-3 text-sm font-medium text-slate-100 bg-slate-800/80 border border-slate-500 rounded-lg hover:bg-slate-700 transition-colors"
            >
              タイトルに戻る
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
