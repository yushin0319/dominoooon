# dominoooon

ドミニオン第二版風のブラウザカードゲーム実装（人間 vs AI）。GitHub description: 「偽ドミニオン」。

- **本番**: https://yushin0319.github.io/dominoooon/

## スタック

- React 19 + TypeScript 7 + Vite 8
- Tailwind CSS v4 + framer-motion + lucide-react
- 状態管理: Zustand（`persist` で localStorage に途中保存）
- テスト: vitest 5 + @testing-library/react + jsdom
- スタイルユーティリティ: clsx + tailwind-merge（`cn`）
- Lint: Biome v2 / Husky + lint-staged
- パッケージマネージャ: bun

## 構成

```
src/
  domain/                ゲームロジック（React 非依存）
    card.ts              カード定義・効果
    game.ts              ゲーム状態
    turn.ts              ターン管理
    player.ts            プレイヤー状態
    supply.ts            供給エリア
    shuffle.ts           シャッフル
    effect/              効果実行エンジン（basic / attack / complex）
    __tests__/           単体テスト（ai / components / hooks / lib / pages / stores にも __tests__/ あり。App 全体は src/__tests__/）
  ai/                    AI 戦略
    bigMoney.ts          Big Money（画面表示は「お金重視」）
    bigMoneySmithy.ts    Big Money + Smithy（画面表示は「お金重視＋鍛冶屋」）
    aiPendingResolver.ts 保留効果の AI 解決
    aiTurn.ts            AI のターンを「アクション → 財宝 → 購入」の段階に分けて画面で順に見せる
  stores/
    gameStore.ts         Zustand ゲームストア（persist で途中保存）
    gameSave.ts          途中保存の形式（localStorage キー `dominoooon:save`、読み込み時の検証）
  components/            React UI（Hand / SupplyArea / PlayArea / TurnInfo / TurnBar / CardView /
                         CardArt / PlayerStatus / GameLog / GameMenu / HowToPlay / PendingEffectUI /
                         ConfirmDialog / ModalShell / ErrorBoundary）
  hooks/                 useDialogKeyboard / useFocusFallback（キーボード操作）・
                         usePrefersReducedMotion・useViewportWidth
  pages/                 TitlePage / SetupPage / GamePage / ResultPage
  constants/             カード名定数（cardNames）・効果ラベル（effectLabels）
  lib/                   画面用の関数・React 非依存（utils = cn・カード効果テキスト / cardArt / setup / turnFlow /
                         gameEnd / gameResult / playerStatus / handLayout / tooltip / focus 等）
  types/                 TypeScript 型定義
src/test-setup.ts        vitest のセットアップ（jest-dom マッチャーの型拡張）
public/cards/            カードの絵（`<英語名の小文字・空白は _>.webp`）
docs/cards.md            カード効果一覧（基本第二版・全カード）
docs/card-art.md         カードの絵の作り方（ComfyUI の設定・各カードの題材）
```

## 操作

- タイトル → 「ゲーム開始」/「遊び方」
- セットアップでキングダム 10 枚（手で選ぶ or ランダム）と AI 戦略（お金重視 / お金重視＋鍛冶屋）を選ぶ
- ゲーム画面: アクション実行 → サプライからカード購入（直前の 1 枚は取り消せる）→ ターン終了で AI ターン。「遊び方」（? の印）で説明、「メニュー」からゲームをやめる
- リザルト画面で勝敗と勝利点の内訳。「同じキングダムでもう一度」/「キングダムを選び直す」/「タイトルに戻る」
- 途中のゲームは自動で localStorage に保存され、ページを閉じても次に開いたときに続きから遊べる
- キーボード操作（Tab / Enter / Space / 1〜9 で手札 / Esc）に対応。OS の「動きを減らす」設定（`prefers-reduced-motion`）に従ってアニメーションを減らす

## 開発

```bash
bun install
bun run dev          # Vite :5173
bun run build        # tsc -b && vite build
bun run test         # vitest run
bun run lint         # Biome
bun run preview      # vite preview（build 結果の確認）
```

- `bun install` で Husky が有効になり（`prepare`）、pre-commit で lint-staged（Biome）が走る

## CI / デプロイ

- CI: `.github/workflows/ci.yml`（lint → `tsc -b` → test → build）/ PR レビュー: `gemini-review.yml` / Dependabot の patch・minor は `dependabot-automerge.yml` で自動マージ
- GitHub Pages: `deploy.yml` が main push（と手動実行）で build して `dist` を配信
- `vite.config.ts` の `base: '/dominoooon/'` でサブパス配信
