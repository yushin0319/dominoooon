import { describe, expect, it } from 'vitest';
import {
  isHoverPointer,
  isLongPressCancelled,
  LONG_PRESS_MOVE_TOLERANCE,
  shouldShowDetailOnTap,
} from '../pointer';

describe('isHoverPointer（ホバーでツールチップを出してよい入力か）', () => {
  it('マウスならホバーで出す', () => {
    expect(isHoverPointer('mouse')).toBe(true);
  });

  it('指（touch）ではホバーで出さない（タップ後に出たまま残るのを防ぐ）', () => {
    expect(isHoverPointer('touch')).toBe(false);
  });

  it('ペンや不明な入力もホバー扱いしない（長押しで見る）', () => {
    expect(isHoverPointer('pen')).toBe(false);
    expect(isHoverPointer('')).toBe(false);
  });
});

describe('shouldShowDetailOnTap（指でタップしたときに説明を出すか）', () => {
  it('押しても何も起きないカード（買えない・使えない・場のカード）は、タップで説明を出す', () => {
    expect(
      shouldShowDetailOnTap({
        pointerType: 'touch',
        clickable: false,
        detailOnTap: false,
      }),
    ).toBe(true);
  });

  it('押すとすぐ使う・買うカード（使える手札・買えるサプライ）は、タップで説明を出さない（タップ=実行、説明は長押し）', () => {
    expect(
      shouldShowDetailOnTap({
        pointerType: 'touch',
        clickable: true,
        detailOnTap: false,
      }),
    ).toBe(false);
  });

  it('選択画面のカードは、選ぶのと一緒に説明も出す（1 回目のタップで選んで説明、確定はボタン）', () => {
    expect(
      shouldShowDetailOnTap({
        pointerType: 'touch',
        clickable: true,
        detailOnTap: true,
      }),
    ).toBe(true);
  });

  it('マウスのクリックでは出さない（PC はホバーで見られる）', () => {
    expect(
      shouldShowDetailOnTap({
        pointerType: 'mouse',
        clickable: false,
        detailOnTap: true,
      }),
    ).toBe(false);
  });

  it('入力の種類が分からないとき（null）は出さない', () => {
    expect(
      shouldShowDetailOnTap({
        pointerType: null,
        clickable: false,
        detailOnTap: false,
      }),
    ).toBe(false);
  });
});

describe('isLongPressCancelled（長押し中に指が動いたらやめる）', () => {
  it('動いていなければ続ける', () => {
    expect(isLongPressCancelled({ x: 100, y: 100 }, { x: 100, y: 100 })).toBe(
      false,
    );
  });

  it('許容範囲ちょうどまでは続ける（境界値）', () => {
    expect(
      isLongPressCancelled(
        { x: 100, y: 100 },
        { x: 100 + LONG_PRESS_MOVE_TOLERANCE, y: 100 },
      ),
    ).toBe(false);
  });

  it('許容範囲を超えて動いたら（スクロールしようとした等）やめる', () => {
    expect(
      isLongPressCancelled(
        { x: 100, y: 100 },
        { x: 100, y: 100 + LONG_PRESS_MOVE_TOLERANCE + 1 },
      ),
    ).toBe(true);
  });

  it('斜めの移動は距離で見る', () => {
    // 8,8 の移動は距離 約 11.3 で、許容範囲 10 を超える
    expect(isLongPressCancelled({ x: 0, y: 0 }, { x: 8, y: 8 })).toBe(true);
  });
});
