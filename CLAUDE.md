# dominoooon

ドミニオン第二版のブラウザゲーム実装（人間 vs AI 対戦）。

## 技術スタック

TypeScript 5.9 + React 19 + Vite + Zustand + Tailwind CSS + shadcn/ui

## ディレクトリ構成

- `src/domain/` - ゲームロジック純粋関数（React 非依存）
- `src/components/` - React UI コンポーネント
- `src/pages/` - ページコンポーネント（Title, Setup, Game, Result）
- `src/stores/` - Zustand ストア
- `src/ai/` - AI 戦略（Big Money, Big Money + Smithy）
- `src/types/` - TypeScript 型定義

## コマンド

```bash
npm run dev      # 開発サーバー :5173
npm run build    # TypeScript 型チェック + Vite ビルド
npm test         # vitest 実行
npm run lint     # ESLint
```

## テスト方針

- **フレームワーク**: vitest（node 環境）
- **テスト対象**: domain/ のゲームロジックが中心（247テスト）
- ドメインロジック → 単体テスト / ストア → 統合テスト
- グローバル tdd-policy.md に従う
- パスエイリアス: `@/` → `./src/`

## CI/CD

- `deploy.yml`: main push 時に GitHub Pages 自動デプロイ
- `gemini-review.yml`: shared-workflows 経由の PR レビュー

## デプロイ

- **本番**: https://yushin0319.github.io/dominoooon/
- GitHub Pages（main push 時自動）
