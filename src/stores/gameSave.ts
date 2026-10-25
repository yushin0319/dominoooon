/**
 * 途中保存（ページを再読み込み・閉じても続きから遊べるように、ストアの一部を localStorage に置く）。
 *
 * 保存するもの: 画面・ゲームの状態・取り消せる購入・AI の戦略・前回の設定（SavedGame）。
 * 保存しないもの: シャッフル関数、段階ごとに見せている途中の AI のターン（gameStore の partialize で、
 * AI のターンは最後まで進めた状態に置き換えて保存する）。
 *
 * カードの定義（CardDef）は名前だけで保存し、読むときに CARD_DEFS の定義に戻す。
 * 定義には関数（庭園の点の数え方 vpCalculator）があり、そのまま JSON にすると消えるため。
 * 読んだデータは形を確かめ、壊れていたら捨ててタイトルから始める（壊れたデータで毎回エラー画面にならないように）。
 */
import type { PersistStorage, StorageValue } from 'zustand/middleware';
import { CARD_DEFS } from '../domain/card';
import { isPendingEffectType } from '../domain/effect';
import type { AIStrategy, CardDef, GameSetup, GameState, Page } from '../types';
import { AI_STRATEGY_IDS, PAGES, Phase } from '../types';

/** localStorage のキー。GitHub Pages では同じ origin（yushin0319.github.io）にほかの作品も載るので、名前を付ける */
export const SAVE_KEY = 'dominoooon:save';

/** 保存データの形の版。形を変えたら上げ、gameStore の migrate で古い版を移し替える（移せなければ捨てる） */
export const SAVE_VERSION = 1;

export interface SavedGame {
  page: Page;
  gameState: GameState | null;
  /** 取り消せる購入（買う前の状態とカード名）。買った直後のまま保存したときだけ */
  undo: { before: GameState; cardName: string } | null;
  aiStrategy: AIStrategy;
  lastSetup: GameSetup | null;
}

/** 保存データの中で、カードの定義を置き換える印 */
const CARD_REF = '$card';

const PHASES: readonly string[] = Object.values(Phase);
const isPage = (x: unknown): x is Page => PAGES.includes(x as Page);
const isStrategy = (x: unknown): x is AIStrategy =>
  AI_STRATEGY_IDS.includes(x as AIStrategy);

type Obj = Record<string, unknown>;

function isObj(x: unknown): x is Obj {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

/** CARD_DEFS のカードの定義そのものか（ゲームの状態のカードの定義はいつも CARD_DEFS の定義を指している） */
function isCardDef(x: unknown): x is CardDef {
  return (
    isObj(x) &&
    typeof x.name === 'string' &&
    Object.hasOwn(CARD_DEFS, x.name) &&
    CARD_DEFS[x.name] === (x as unknown)
  );
}

/** 保存データの JSON を作る（カードの定義は { $card: 名前 } にする） */
export function serializeSave(value: StorageValue<SavedGame>): string {
  return JSON.stringify(value, (_key, v) =>
    isCardDef(v) ? { [CARD_REF]: v.name } : v,
  );
}

// ===== 形の確認（読み込んだデータが今のゲームの状態として使えるか） =====

const isInt = (x: unknown, min = 0): x is number =>
  Number.isInteger(x) && (x as number) >= min;

function isCardInstance(x: unknown): boolean {
  return isObj(x) && typeof x.instanceId === 'string' && isCardDef(x.def);
}

const isCardList = (x: unknown) => Array.isArray(x) && x.every(isCardInstance);

function isPlayer(x: unknown): boolean {
  return (
    isObj(x) &&
    typeof x.id === 'string' &&
    typeof x.name === 'string' &&
    isCardList(x.deck) &&
    isCardList(x.hand) &&
    isCardList(x.discard) &&
    isCardList(x.playArea)
  );
}

function isPendingEffect(x: unknown): boolean {
  if (x === null) return true;
  if (!isObj(x)) return false;
  return (
    isPendingEffectType(x.type) &&
    isCardDef(x.sourceCard) &&
    typeof x.playerId === 'string' &&
    (x.data === undefined || isObj(x.data)) &&
    (x.continuation === undefined ||
      (Array.isArray(x.continuation) &&
        x.continuation.every(
          (c) => isObj(c) && isCardInstance(c.card) && isInt(c.remaining),
        )))
  );
}

/** ゲームの状態として使えるか */
export function isGameState(x: unknown): x is GameState {
  if (!isObj(x)) return false;
  const { players, supply, turnState } = x;
  return (
    Array.isArray(players) &&
    players.length >= 2 &&
    players.every(isPlayer) &&
    Array.isArray(supply) &&
    supply.every((p) => isObj(p) && isCardDef(p.card) && isInt(p.count)) &&
    isCardList(x.trash) &&
    isInt(x.currentPlayerIndex) &&
    (x.currentPlayerIndex as number) < players.length &&
    PHASES.includes(x.phase as string) &&
    isObj(turnState) &&
    isInt(turnState.actions) &&
    isInt(turnState.buys) &&
    isInt(turnState.coins) &&
    isPendingEffect(x.pendingEffect) &&
    isInt(x.turnNumber, 1) &&
    typeof x.gameOver === 'boolean' &&
    Array.isArray(x.log) &&
    x.log.every((l) => typeof l === 'string')
  );
}

function isGameSetup(x: unknown): x is GameSetup {
  return (
    isObj(x) &&
    Array.isArray(x.kingdom) &&
    x.kingdom.every(
      (n) => typeof n === 'string' && Object.hasOwn(CARD_DEFS, n),
    ) &&
    isStrategy(x.aiStrategy)
  );
}

/** 今の版の保存データとして使えるか（ゲーム中・結果画面ならゲームの状態が要る） */
export function isSavedGame(x: unknown): x is SavedGame {
  if (!isObj(x)) return false;
  const { page, gameState, undo } = x;
  return (
    isPage(page) &&
    (gameState === null || isGameState(gameState)) &&
    !((page === 'game' || page === 'result') && gameState === null) &&
    (undo === null ||
      (isObj(undo) &&
        isGameState(undo.before) &&
        typeof undo.cardName === 'string')) &&
    isStrategy(x.aiStrategy) &&
    (x.lastSetup === null || isGameSetup(x.lastSetup))
  );
}

/**
 * 保存データの JSON を読む。カードの名前は CARD_DEFS の定義に戻す。
 * 壊れている（JSON でない・知らないカード・形が違う）ときは null。
 * 版が今と違うときは中身を確かめずに返す（移し替えるか捨てるかは persist の migrate が決める）
 */
export function parseSave(text: string): StorageValue<SavedGame> | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text, (_key, v) => {
      if (isObj(v) && typeof v[CARD_REF] === 'string') {
        const name = v[CARD_REF] as string;
        if (!Object.hasOwn(CARD_DEFS, name)) {
          throw new Error(`知らないカード: ${name}`);
        }
        return CARD_DEFS[name];
      }
      return v;
    });
  } catch {
    // JSON でない・知らないカード: 使えないデータとして扱う（呼び出し側で捨てる）
    return null;
  }
  if (!isObj(parsed) || typeof parsed.version !== 'number') return null;
  if (parsed.version !== SAVE_VERSION) {
    return { state: parsed.state as SavedGame, version: parsed.version };
  }
  return isSavedGame(parsed.state)
    ? { state: parsed.state, version: parsed.version }
    : null;
}

/** localStorage の一部（テストではメモリの代わりを渡す） */
export type SaveBackend = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/** 今の環境の localStorage。無い環境（テストの node・設定で止めたブラウザ）では undefined */
function defaultBackend(): SaveBackend | undefined {
  try {
    return globalThis.localStorage ?? undefined;
  } catch {
    // プライバシー設定などで localStorage に触れると例外になるブラウザがある
    return undefined;
  }
}

/**
 * zustand persist に渡す保存先。localStorage は毎回取り直す（テストで差し替えられるように）。
 * 書き込めない（容量不足・プライベートブラウズ）ときはゲームを止めず、保存できないことを 1 回だけ警告する。
 * 壊れたデータは読んだときに消す。
 */
export function createSaveStorage(
  getBackend: () => SaveBackend | undefined = defaultBackend,
): PersistStorage<SavedGame> {
  let warnedWrite = false;
  return {
    getItem: (name) => {
      const backend = getBackend();
      const text = backend?.getItem(name) ?? null;
      if (text === null) return null;
      const value = parseSave(text);
      if (!value) {
        console.warn('[dominoooon] 保存データが壊れていたので消しました');
        backend?.removeItem(name);
      }
      return value;
    },
    setItem: (name, value) => {
      try {
        getBackend()?.setItem(name, serializeSave(value));
      } catch (e) {
        if (!warnedWrite) {
          warnedWrite = true;
          console.warn('[dominoooon] 途中保存ができませんでした', e);
        }
      }
    },
    removeItem: (name) => {
      try {
        getBackend()?.removeItem(name);
      } catch {
        // 消せなくても、次の保存で上書きされる
      }
    },
  };
}
