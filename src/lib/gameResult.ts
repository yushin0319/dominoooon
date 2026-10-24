import type { GameOutcome } from '../domain/game';
import { isKingdomPile } from '../domain/supply';
import type { SupplyPile } from '../types';
import { getGameEndReasonText } from './gameEnd';

export interface ResultHeadline {
  /** あなたから見た結果（色分けに使う） */
  tone: 'win' | 'lose' | 'draw';
  /** 結果画面の大きな一言 */
  title: string;
  /** 同点だったときの決まり方（同点でなければ null） */
  note: string | null;
}

/** 結果画面の一言（あなたの勝ち / 負け / 引き分け）と、同点だったときの決まり方 */
export function getResultHeadline(
  outcome: GameOutcome,
  humanId: string,
): ResultHeadline {
  if (outcome.kind === 'draw') {
    return {
      tone: 'draw',
      title: '引き分け',
      note: '勝利点もターン数も同じなので引き分けです',
    };
  }
  const won = outcome.winnerIds.includes(humanId);
  const winner = outcome.players.find(
    (p) => p.playerId === outcome.winnerIds[0],
  );
  const turns = outcome.players
    .map((p) => `${p.name} ${p.turns} ターン`)
    .join(' / ');
  return {
    tone: won ? 'win' : 'lose',
    title: won ? 'あなたの勝ち！' : 'あなたの負け',
    note:
      outcome.decidedByTurns && winner
        ? `勝利点は同点。ターン数が少ない${winner.name}の勝ちです（${turns}）`
        : null,
  };
}

/** 終わった理由の文。山が 3 つ空のときは、どの山が空になったかも書く */
export function getEndReasonDetail(outcome: GameOutcome): string | null {
  if (!outcome.endReason) return null;
  const text = getGameEndReasonText(outcome.endReason);
  return outcome.endReason === 'piles' && outcome.emptyPiles.length > 0
    ? `${text}（${outcome.emptyPiles.join('・')}）`
    : text;
}

/** 遊んだキングダムのカード名（日本語、サプライの順）。結果画面の「同じキングダムでもう一度」が何かを見せる */
export function getKingdomNames(supply: SupplyPile[]): string[] {
  return supply.filter(isKingdomPile).map((p) => p.card.nameJa);
}
