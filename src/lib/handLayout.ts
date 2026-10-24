/** 手札カード 1 枚の幅・高さ（CardView の通常サイズ w-[120px] h-[170px]） */
export const HAND_CARD_WIDTH = 120;
export const HAND_CARD_HEIGHT = 170;

/** 隣のカードとの重なり幅の最小値（PC 幅での従来値） */
export const HAND_MIN_OVERLAP = 16;

/**
 * 扇形に並べるときに手札の左右に確保する余白の合計。
 * Hand の左右の余白（8px ずつ）と、扇形の回転で端のカードが外側へはみ出す分（片側 約 20px）を含む。
 */
export const HAND_SIDE_MARGIN = 64;

/**
 * 一列に並べるときに手札の左右に確保する余白の合計。
 * Hand の左右の余白（8px ずつ）と、横スクロール欄の内側の余白（4px ずつ。端のカードの光る枠が欄で切れないように）
 */
export const HAND_ROW_SIDE_MARGIN = 24;

/** 一列に並べるとき、各カードの見えている帯の最小幅（指で押せる大きさの目安 44px） */
export const MIN_TOUCH_STRIP = 44;

/**
 * 手札が空のときの列の高さ（縦に積む画面だけ）。一言（2 行まで）が入る高さ。
 * スマホの購入フェーズでは財宝が自動で場に出て手札が空になり、空の欄が高さを使い続けていた
 */
export const EMPTY_HAND_ROW_HEIGHT = 32;

/** これより狭い画面は縦に積む（Tailwind の lg）。PC 幅では手札が空でも高さを変えない（中央の列が上下に動かないように） */
const STACKED_LAYOUT_MAX_WIDTH = 1024;

/** 使えるカードにホバーしたときに持ち上げる量（px） */
export const HOVER_LIFT = 5;

// 扇形: 隣のカードとの角度・下げる量。枚数が多いときは端のカードが最大値を超えないよう間隔を詰める
const FAN_ANGLE_STEP = 5;
const FAN_MAX_ANGLE = 10;
const FAN_Y_STEP = 6;
const FAN_MAX_Y = 12;

/** 扇形の手札（5 枚・16px 重ね）が収まる最小の画面幅。これより狭い画面では常に一列にする */
const FAN_MIN_VIEWPORT =
  5 * HAND_CARD_WIDTH - 4 * HAND_MIN_OVERLAP + HAND_SIDE_MARGIN;

export interface HandCardPose {
  /** 傾き（度） */
  rotate: number;
  /** 下げる量（px） */
  y: number;
}

export interface HandLayout {
  /** fan = 扇形（PC 幅） / row = 傾けずに一列（狭い画面・枚数が多いとき） */
  mode: 'fan' | 'row';
  /** 隣のカードとの重なり幅（px） */
  overlap: number;
  poses: HandCardPose[];
  /** カードを並べる列の高さ（傾き・下げる量・持ち上げる分を含む） */
  rowHeight: number;
  /** 画面に収まらず横スクロールが要るか */
  scrollable: boolean;
  /** ホバーしたカードを一番手前に出すか（重なりが大きいと右隣の見えている帯を覆うので出さない） */
  raiseOnHover: boolean;
}

function rowWidth(cardCount: number, overlap: number): number {
  return cardCount * HAND_CARD_WIDTH - (cardCount - 1) * overlap;
}

// 傾けたカードの外接矩形の高さの半分
function rotatedHalfHeight(angleDeg: number): number {
  const rad = (Math.abs(angleDeg) * Math.PI) / 180;
  return (
    (HAND_CARD_HEIGHT * Math.cos(rad) + HAND_CARD_WIDTH * Math.sin(rad)) / 2
  );
}

/** 扇形の列の高さ。一番傾いて一番下がった端のカードの下端まで（枚数によらず同じにする） */
const FAN_ROW_HEIGHT = Math.ceil(
  HAND_CARD_HEIGHT / 2 + FAN_MAX_Y + rotatedHalfHeight(FAN_MAX_ANGLE),
);

/** 一列の列の高さ。スクロール領域の中で持ち上げたカードが上で切れないよう、持ち上げ分を足す */
const ROW_ROW_HEIGHT = HAND_CARD_HEIGHT + HOVER_LIFT + 1;

function fanPoses(cardCount: number): HandCardPose[] {
  const center = (cardCount - 1) / 2;
  const angleStep =
    center > 0 ? Math.min(FAN_ANGLE_STEP, FAN_MAX_ANGLE / center) : 0;
  const yStep = center > 0 ? Math.min(FAN_Y_STEP, FAN_MAX_Y / center) : 0;
  return Array.from({ length: cardCount }, (_, i) => ({
    rotate: (i - center) * angleStep,
    y: Math.abs(i - center) * yStep,
  }));
}

/**
 * 手札の並べ方を返す。
 * - PC 幅で 16px 重ねて収まるとき: 従来どおりの扇形（5 枚の見た目は変えない。枚数が多いときは傾きを詰める）
 * - 狭い画面・枚数が多いとき: 傾けずに一列。各カードの左の帯（名前・種類・コストが見える）を 44px 以上残し、
 *   収まらない分は横スクロールにする
 */
export function getHandLayout(
  cardCount: number,
  viewportWidth: number,
): HandLayout {
  // 手札が空: 縦に積む画面では低くして、ほかの欄（サプライ）に高さを回す
  if (cardCount === 0 && viewportWidth < STACKED_LAYOUT_MAX_WIDTH) {
    return {
      mode: 'row',
      overlap: HAND_MIN_OVERLAP,
      poses: [],
      rowHeight: EMPTY_HAND_ROW_HEIGHT,
      scrollable: false,
      raiseOnHover: false,
    };
  }

  const fanFits =
    viewportWidth >= FAN_MIN_VIEWPORT &&
    rowWidth(cardCount, HAND_MIN_OVERLAP) <= viewportWidth - HAND_SIDE_MARGIN;
  if (fanFits) {
    return {
      mode: 'fan',
      overlap: HAND_MIN_OVERLAP,
      poses: fanPoses(cardCount),
      rowHeight: FAN_ROW_HEIGHT,
      scrollable: false,
      raiseOnHover: true,
    };
  }

  const available = viewportWidth - HAND_ROW_SIDE_MARGIN;
  let overlap = HAND_MIN_OVERLAP;
  if (cardCount >= 2) {
    const needed = Math.ceil(
      (cardCount * HAND_CARD_WIDTH - available) / (cardCount - 1),
    );
    overlap = Math.min(
      Math.max(HAND_MIN_OVERLAP, needed),
      HAND_CARD_WIDTH - MIN_TOUCH_STRIP,
    );
  }
  return {
    mode: 'row',
    overlap,
    poses: Array.from({ length: cardCount }, () => ({ rotate: 0, y: 0 })),
    rowHeight: ROW_ROW_HEIGHT,
    scrollable: rowWidth(cardCount, overlap) > available,
    raiseOnHover: false,
  };
}
