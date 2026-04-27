# dominoooon

ドミニオン第二版風のブラウザカードゲーム実装（人間 vs AI）。GitHub description: 「偽ドミニオン」。

- **本番**: https://yushin0319.github.io/dominoooon/

## スタック

- React 19 + TypeScript + Vite 8
- Tailwind CSS v4 + framer-motion + lucide-react
- 状態管理: Zustand
- テスト: vitest + @testing-library/react
- Lint: Biome / Husky + lint-staged
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
    effect/              効果実行エンジン
    __tests__/           単体テスト
  ai/                    AI 戦略
    bigMoney.ts          Big Money
    bigMoneySmithy.ts    Big Money + Smithy
  stores/                Zustand ゲームストア
  components/            React UI（Hand / SupplyArea / PlayArea / TurnInfo / CardView / GameLog）
  pages/                 TitlePage / SetupPage / GamePage / ResultPage
  types/                 TypeScript 型定義
```

## 操作

- タイトル → ゲーム開始
- セットアップで AI 戦略を選択
- ゲーム画面: サプライからカード購入、アクション実行、ターン終了で AI ターン
- リザルト画面で勝敗・最終スコア表示

## 開発

```bash
bun install
bun run dev          # Vite :5173
bun run build        # tsc -b && vite build
bun test             # vitest
bun run lint         # Biome
```

## デプロイ

- GitHub Pages（main push で自動）
- `vite.config.ts` の `base: '/dominoooon/'` でサブパス配信
