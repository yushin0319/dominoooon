# src ディレクトリ構成

このドキュメントは、プロジェクトの `src/` ディレクトリの構成を説明します。

## ディレクトリ構造

```
src/
├── components/         # Reactコンポーネント（UI層）
│   ├── CardView.tsx   # カード表示コンポーネント
│   ├── Hand.tsx       # 手札表示コンポーネント
│   ├── PendingEffectUI.tsx  # ペンディング効果UI
│   ├── TurnInfo.tsx   # ターン情報表示
│   └── __tests__/     # コンポーネントテスト
├── pages/             # ページコンポーネント
│   ├── TitlePage.tsx  # タイトル画面
│   ├── SetupPage.tsx  # ゲーム設定画面
│   ├── GamePage.tsx   # ゲーム画面
│   └── ResultPage.tsx # 結果画面
├── domain/            # ドメインロジック（ゲームルール）
│   ├── card.ts        # カード定義
│   ├── effect/        # カード効果ロジック
│   │   ├── index.ts   # 公開API
│   │   ├── types.ts   # 型定義
│   │   ├── basic.ts   # 基本カード効果
│   │   ├── attack.ts  # アタックカード効果
│   │   └── complex.ts # 複雑なカード効果
│   ├── game.ts        # ゲーム状態管理
│   ├── player.ts      # プレイヤー操作
│   ├── supply.ts      # サプライ管理
│   ├── shuffle.ts     # シャッフル機能
│   ├── turn.ts        # ターン管理
│   └── __tests__/     # ドメインロジックテスト
├── ai/                # AI戦略
│   ├── bigMoney.ts    # Big Money戦略
│   ├── bigMoneySmithy.ts  # Big Money + Smithy戦略
│   └── __tests__/     # AI戦略テスト
├── stores/            # 状態管理（Zustand）
│   └── gameStore.ts   # ゲーム状態ストア
├── types/             # 型定義モジュール
│   └── index.ts       # グローバル型定義
├── constants/         # 定数定義
│   └── effectLabels.ts  # カード効果の日本語ラベル
├── lib/               # ユーティリティ関数
│   └── utils.ts       # Tailwind CSS class merging (cn関数)
├── assets/            # 静的アセット
│   └── react.svg      # Reactロゴ（デフォルト）
├── App.tsx            # アプリケーションルート
├── main.tsx           # エントリーポイント
└── index.css          # グローバルスタイル
```

## 各ディレクトリの役割

### `components/`
再利用可能なUIコンポーネントを配置します。ドメインロジックには依存せず、propsを通じてデータを受け取ります。

### `pages/`
画面単位のページコンポーネントを配置します。アプリケーションのルーティングに対応します。

### `domain/`
ゲームのビジネスロジックを配置します。UIとは独立しており、純粋な関数として実装されています。
- **effect/**: カード効果の解決ロジック。命名規則は明確性重視（例: `resolveMilitiaChoice`）

### `ai/`
AI対戦相手の戦略を配置します。各ファイルは異なるAI戦略を実装します。

### `stores/`
Zustandを使用した状態管理を配置します。ゲーム全体の状態を管理します。

### `types/`
TypeScriptの型定義を配置します。ドメインモデルの型を集約します。

### `constants/`
アプリケーション全体で使用する定数を配置します。i18n対応を見越した構成です。

### `lib/`
汎用ユーティリティ関数を配置します。現在は `cn()` 関数（Tailwind CSS class merging）のみ。

### `assets/`
画像やアイコンなどの静的アセットを配置します。現在はデフォルトのReactロゴのみ。

## 命名規則

- **コンポーネント**: PascalCase（例: `CardView.tsx`）
- **ドメインロジック**: camelCase関数（例: `resolveCustomEffect`）
- **型定義**: PascalCase（例: `GameState`, `CardInstance`）
- **定数**: UPPER_SNAKE_CASE（例: `EFFECT_LABELS`）

## テスト

各ディレクトリに `__tests__/` サブディレクトリを配置し、テストファイルを格納します。
テストファイル名は `*.test.ts` または `*.test.tsx` とします。
