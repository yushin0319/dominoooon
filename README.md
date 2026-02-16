# Dominoooon

ドミニオン基本第二版のWebゲーム実装（人間 vs AI）

## 概要

このプロジェクトは、カードゲーム「ドミニオン（基本第二版）」をブラウザでプレイできるWebアプリケーションです。プレイヤーは2種類のAI戦略から相手を選び、対戦することができます。

## 実装状況

- **Phase 1-6 完了**
- **実装カード数**: 29種類（王国カード）+ 7種類（基本カード）
- **AI戦略**: 2種類（Big Money、Big Money + Smithy）
- **テスト数**: 247テスト（ドメインロジック + ストア + AI）
- **UI**: Material-UI ベースのモダンなデザイン
- **日本語対応**: カード名・効果説明が日本語

## 技術スタック

- **言語**: TypeScript 5.9
- **フレームワーク**: React 19.2
- **ビルドツール**: Vite 7.3
- **状態管理**: Zustand 5.0
- **UIライブラリ**: Material-UI (MUI)
- **スタイリング**: Tailwind CSS 3.4 + class-variance-authority
- **アニメーション**: Framer Motion 11.18
- **テスト**: Vitest 4.0 + @testing-library/react
- **その他**: Lucide React (アイコン)

## ディレクトリ構造

```
src/
├── domain/              # ゲームロジック（純粋関数、React非依存）
│   ├── card.ts          # カード定義
│   ├── effect.ts        # カード効果解決エンジン
│   ├── game.ts          # ゲーム状態管理
│   ├── turn.ts          # ターン進行・フェーズ管理
│   ├── player.ts        # プレイヤー操作
│   ├── supply.ts        # サプライ管理
│   └── shuffle.ts       # シャッフル処理
├── components/          # Reactコンポーネント
│   ├── ErrorBoundary.tsx
│   ├── PendingEffectUI.tsx
│   ├── CardView.tsx
│   └── ...
├── pages/               # ページレベルコンポーネント
│   ├── TitlePage.tsx
│   ├── SetupPage.tsx
│   ├── GamePage.tsx
│   └── ResultPage.tsx
├── stores/              # Zustand ストア
│   └── gameStore.ts
├── ai/                  # AI戦略
│   ├── bigMoney.ts
│   └── bigMoneySmithy.ts
├── types/               # TypeScript型定義
│   └── index.ts
├── lib/                 # ユーティリティ関数
│   └── utils.ts
└── assets/              # 静的アセット
```

## セットアップ

### 前提条件

- Node.js 18以上

### インストール

```bash
npm install
```

### 開発サーバー起動

```bash
npm run dev
```

ブラウザで `http://localhost:5173` を開いてください。

### ビルド

```bash
npm run build
```

ビルド成果物は `dist/` ディレクトリに生成されます。

### プレビュー

```bash
npm run preview
```

ビルド後のアプリケーションをローカルでプレビューできます。

## テスト

### 全テスト実行

```bash
npm test
```

### テスト（ウォッチモード）

```bash
npx vitest
```

### テストカバレッジ

```bash
npx vitest run --coverage
```

## Lint

```bash
npm run lint
```

## 開発方針

### アーキテクチャ

- **ドメイン駆動設計**: `src/domain/` はReactから完全に独立した純粋関数群
- **不変性**: すべての状態更新は新しいオブジェクトを返す（イミュータブル）
- **型安全**: TypeScript strict mode で型チェックを厳格化

### テスト戦略

- ドメインロジック（ゲームルール）は100%カバレッジを目指す
- React コンポーネントは主要な UI フローをテスト
- AI 戦略は基本動作を検証

## ライセンス

このプロジェクトは個人的な学習・研究目的で作成されています。
