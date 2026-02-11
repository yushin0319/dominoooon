// ===== Card Type & Phase =====

export const CardType = {
  Action: "Action",
  Treasure: "Treasure",
  Victory: "Victory",
  Curse: "Curse",
  Attack: "Attack",
  Reaction: "Reaction",
} as const;
export type CardType = (typeof CardType)[keyof typeof CardType];

export const Phase = {
  Action: "Action",
  Buy: "Buy",
  Cleanup: "Cleanup",
} as const;
export type Phase = (typeof Phase)[keyof typeof Phase];

// ===== Card Interfaces =====

export interface CardEffect {
  cards?: number;
  actions?: number;
  buys?: number;
  coins?: number;
  custom?: string;
}

export interface CardDef {
  name: string;
  cost: number;
  types: CardType[];
  effects: CardEffect;
  vpValue?: number;
  vpCalculator?: (player: PlayerState) => number;
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

export interface PendingEffect {
  type: string;
  sourceCard: CardDef;
  playerId: string;
  data?: Record<string, unknown>;
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

// ===== Utility Types =====

export type ShuffleFn = (array: CardInstance[]) => CardInstance[];

export type KingdomSetup = CardDef[];
