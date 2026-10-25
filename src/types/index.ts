// ===== Card Type & Phase =====

export const CardType = {
  Action: 'Action',
  Treasure: 'Treasure',
  Victory: 'Victory',
  Curse: 'Curse',
  Attack: 'Attack',
  Reaction: 'Reaction',
} as const;
export type CardType = (typeof CardType)[keyof typeof CardType];

export const Phase = {
  Action: 'Action',
  Buy: 'Buy',
  Cleanup: 'Cleanup',
} as const;
export type Phase = (typeof Phase)[keyof typeof Phase];

// ===== Card Interfaces =====

export type CardEffectCustomType =
  | 'councilRoom'
  | 'witch'
  | 'moneylender'
  | 'library'
  | 'bandit'
  | 'bureaucrat'
  | 'merchant'
  | 'vassal'
  | 'sentry'
  | 'poacher'
  | 'harbinger'
  | 'cellar'
  | 'chapel'
  | 'workshop'
  | 'remodel'
  | 'mine'
  | 'artisan'
  | 'militia'
  | 'throneRoom';

export interface CardEffect {
  cards?: number;
  actions?: number;
  buys?: number;
  coins?: number;
  custom?: CardEffectCustomType;
}

export interface CardDef {
  name: string;
  nameJa: string;
  cost: number;
  types: CardType[];
  effects: CardEffect;
  vpValue?: number;
  vpCalculator?: (player: PlayerState) => number;
  /** vpCalculator の説明（カードの説明・セットアップ画面に出す。庭園は効果も固定の点も無く、説明が空欄だった） */
  vpText?: string;
}

export interface CardInstance {
  instanceId: string;
  def: CardDef;
}

// ===== Game State Interfaces =====

export interface TurnState {
  actions: number;
  buys: number;
  coins: number;
}

export interface PlayerState {
  id: string;
  name: string;
  deck: CardInstance[];
  hand: CardInstance[];
  discard: CardInstance[];
  playArea: CardInstance[];
}

export type PendingEffectType =
  | 'cellar'
  | 'chapel'
  | 'workshop'
  | 'remodel'
  | 'mine'
  | 'artisan'
  | 'militia'
  | 'throneRoom'
  | 'poacher'
  | 'harbinger'
  | 'vassal'
  | 'sentry';

/** 選択待ちが片付いたあとに続けて使うカード（玉座の間の 2 回目など） */
export interface PendingContinuation {
  card: CardInstance;
  /** あと何回使うか */
  remaining: number;
}

export interface PendingEffect {
  type: PendingEffectType;
  sourceCard: CardDef;
  playerId: string;
  data?: Record<string, unknown>;
  /** この選択待ちが片付いたら先頭から順に実行する残りの使用（玉座の間） */
  continuation?: PendingContinuation[];
}

export interface SupplyPile {
  card: CardDef;
  count: number;
}

export interface GameState {
  players: PlayerState[];
  supply: SupplyPile[];
  trash: CardInstance[];
  currentPlayerIndex: number;
  phase: Phase;
  turnState: TurnState;
  pendingEffect: PendingEffect | null;
  turnNumber: number;
  gameOver: boolean;
  log: string[];
}

// ===== App =====

/** 画面（タイトル / ゲーム設定 / ゲーム / 結果）。保存データの確認にも使うので値の一覧から型を作る */
export const PAGES = ['title', 'setup', 'game', 'result'] as const;
export type Page = (typeof PAGES)[number];

/** AI の戦略（お金重視 / お金重視＋鍛冶屋） */
export const AI_STRATEGY_IDS = ['bigMoney', 'bigMoneySmithy'] as const;
export type AIStrategy = (typeof AI_STRATEGY_IDS)[number];

/** ゲームを始めたときの設定（「同じキングダムでもう一度」に使う） */
export interface GameSetup {
  /** キングダムのカード名（CARD_DEFS のキー） */
  kingdom: string[];
  aiStrategy: AIStrategy;
}

// ===== Utility Types =====

export type ShuffleFn = (array: CardInstance[]) => CardInstance[];

export type KingdomSetup = CardDef[];
