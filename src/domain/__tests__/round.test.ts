// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { getCardDef } from '../card';
import {
  createGame,
  endTurn,
  formatTurnHeader,
  GAME_START_LOG,
  getPlayedRounds,
  getRoundNumber,
  parseTurnHeader,
} from '../game';
import { createShuffleFn } from '../shuffle';

const shuffle = createShuffleFn(() => 0.5);
const kingdom = [
  'Cellar',
  'Chapel',
  'Village',
  'Workshop',
  'Smithy',
  'Remodel',
  'Militia',
  'Market',
  'Mine',
  'Witch',
].map(getCardDef);

const newGame = () => createGame(['あなた', 'AI'], kingdom, shuffle);

describe('getRoundNumber: 両者が 1 回ずつ番を終えると 1 ラウンド', () => {
  it('2 人なら通しのターン 1・2 がラウンド 1、3・4 がラウンド 2（自分の 2 回目の番は「ラウンド 2」）', () => {
    expect([1, 2, 3, 4, 5].map((t) => getRoundNumber(t, 2))).toEqual([
      1, 1, 2, 2, 3,
    ]);
  });

  it('1 人ならターン番号のまま、3 人なら 3 ターンで 1 ラウンド', () => {
    expect(getRoundNumber(4, 1)).toBe(4);
    expect([1, 3, 4, 6, 7].map((t) => getRoundNumber(t, 3))).toEqual([
      1, 1, 2, 2, 3,
    ]);
  });

  it('おかしな値（0 以下）でもラウンド 1 より小さくしない', () => {
    expect(getRoundNumber(0, 2)).toBe(1);
    expect(getRoundNumber(3, 0)).toBe(3);
  });
});

describe('getPlayedRounds: 結果画面に出す、遊んだラウンド数', () => {
  // ゲーム終了の判定はターンの終わり（endTurn）で、そのとき turnNumber はもう次の番に進んでいる
  it('自分の番（通し 7）で終わったら 4 ラウンド目の途中まで = 4', () => {
    expect(
      getPlayedRounds({ turnNumber: 8, gameOver: true, players: [{}, {}] }),
    ).toBe(4);
  });

  it('AI の番（通し 8）で終わったら 4 ラウンド', () => {
    expect(
      getPlayedRounds({ turnNumber: 9, gameOver: true, players: [{}, {}] }),
    ).toBe(4);
  });

  it('ゲーム中なら今のラウンド', () => {
    expect(
      getPlayedRounds({ turnNumber: 3, gameOver: false, players: [{}, {}] }),
    ).toBe(2);
  });
});

describe('ゲームログ: 日本語で、両者のターンの区切りを入れる', () => {
  it('最初の行は日本語の「ゲーム開始」で、続けて自分の最初のターンの区切り', () => {
    const game = newGame();
    expect(GAME_START_LOG).toBe('ゲーム開始');
    expect(game.log).toEqual(['ゲーム開始', formatTurnHeader(1, 'あなた')]);
    expect(game.log.join('\n')).not.toMatch(/[A-Za-z]{2,}/);
  });

  it('ターンを終えたら次の人のターンの区切りを足す（AI の番も自分の番も、同じラウンドの数え方）', () => {
    const afterHuman = endTurn(newGame(), shuffle);
    expect(afterHuman.log.at(-1)).toBe(formatTurnHeader(1, 'AI'));

    const afterAI = endTurn(afterHuman, shuffle);
    expect(afterAI.log.at(-1)).toBe(formatTurnHeader(2, 'あなた'));
  });

  it('ゲームが終わったターンのあとには、次の人の区切りを足さない', () => {
    const game = newGame();
    const ending = {
      ...game,
      supply: game.supply.map((p) =>
        p.card.name === 'Province' ? { ...p, count: 0 } : p,
      ),
    };
    const after = endTurn(ending, shuffle);
    expect(after.gameOver).toBe(true);
    expect(after.log).toEqual(game.log);
  });

  it('区切りの行は「--- ラウンド N: ◯◯のターン ---」で、中身を取り出せる（ほかの行は区切りではない）', () => {
    const header = formatTurnHeader(3, 'AI');
    expect(header).toBe('--- ラウンド 3: AIのターン ---');
    expect(parseTurnHeader(header)).toBe('ラウンド 3: AIのターン');
    expect(parseTurnHeader('あなたは銅貨を購入しました')).toBeNull();
    expect(parseTurnHeader('AI: 5 コイン → 銀貨を購入')).toBeNull();
  });
});
