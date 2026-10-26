# src ディレクトリ構成

このドキュメントは、プロジェクトの `src/` ディレクトリの構成を説明します。

## ディレクトリ構造

```
src/
├── components/         # Reactコンポーネント（UI層）
│   ├── CardView.tsx   # カード表示コンポーネント
│   ├── CardArt.tsx    # カードの絵（public/cards/ の webp）
│   ├── ConfirmDialog.tsx  # 確認ダイアログ
│   ├── ErrorBoundary.tsx  # エラーバウンダリ（途中保存を消してタイトルへ戻せる）
│   ├── GameLog.tsx    # ゲームログ表示
│   ├── GameMenu.tsx   # ゲーム中の「遊び方」「メニュー」ボタンとメニュー（ゲームをやめる）
│   ├── Hand.tsx       # 手札表示コンポーネント
│   ├── HowToPlay.tsx  # 遊び方ダイアログ（タイトル画面・ゲーム中から開く）
│   ├── ModalShell.tsx # ダイアログ共通の枠
│   ├── PendingEffectUI.tsx  # ペンディング効果UI
│   ├── PlayArea.tsx   # 場（プレイエリア）表示
│   ├── PlayerStatus.tsx  # 山札・捨て札の枚数と勝利点（狭い画面ではダイアログで出す）
│   ├── SupplyArea.tsx # サプライ表示
│   ├── TurnBar.tsx    # 手札の上の帯（次にすること・「購入へ進む」「ターン終了」「購入を取り消す」）
│   ├── TurnInfo.tsx   # ターン情報表示（ラウンド・ゲーム終了の近さ）
│   └── __tests__/     # コンポーネントテスト
├── pages/             # ページコンポーネント
│   ├── TitlePage.tsx  # タイトル画面
│   ├── SetupPage.tsx  # ゲーム設定画面（キングダム 10 枚と AI 戦略を選ぶ）
│   ├── GamePage.tsx   # ゲーム画面
│   ├── ResultPage.tsx # 結果画面
│   └── __tests__/     # ページテスト
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
│   ├── bigMoney.ts    # Big Money戦略（画面表示は「お金重視」）
│   ├── bigMoneySmithy.ts  # Big Money + Smithy戦略（画面表示は「お金重視＋鍛冶屋」）
│   ├── aiPendingResolver.ts  # 保留効果のAI解決
│   ├── aiTurn.ts      # AIのターンを「アクション → 財宝 → 購入」の段階に分ける
│   └── __tests__/     # AI戦略テスト
├── stores/            # 状態管理（Zustand）
│   ├── gameStore.ts   # ゲーム状態ストア（persist で localStorage に途中保存）
│   ├── gameSave.ts    # 途中保存の形式（キー `dominoooon:save`・版・読み込み時の検証）
│   └── __tests__/     # ストアテスト
├── hooks/             # React フック
│   ├── useDialogKeyboard.ts  # ダイアログのフォーカス・Esc
│   ├── useFocusFallback.ts   # フォーカスの行き場がなくなったときの移動先
│   ├── usePrefersReducedMotion.ts  # OS の「動きを減らす」設定
│   ├── useViewportWidth.ts   # 画面の幅
│   └── __tests__/     # フックテスト
├── types/             # 型定義モジュール
│   └── index.ts       # グローバル型定義
├── constants/         # 定数定義
│   ├── cardNames.ts   # 名前比較に使うカード名定数（CARD）
│   └── effectLabels.ts  # カード効果の日本語ラベル
├── lib/               # ユーティリティ関数（React 非依存）
│   ├── utils.ts       # cn関数（clsx + tailwind-merge）/ カード効果テキスト生成（getEffectText）
│   ├── cardArt.ts     # カードの絵の URL（BASE_URL 付き）
│   ├── cardStatus.ts  # カードが今使える・買えるかの見た目
│   ├── cardType.ts    # カードの種類の色・日本語名
│   ├── focus.ts       # Tab で止まる要素の判定
│   ├── gameEnd.ts     # ゲーム終了の近さ・終了理由の文
│   ├── gameResult.ts  # 結果画面の一言・同点時の決まり方
│   ├── handLayout.ts  # 手札の並べ方の寸法
│   ├── inputModality.ts  # 最後の操作がキーボードか
│   ├── playerStatus.ts   # 山札・捨て札の枚数と勝利点
│   ├── pointer.ts     # 長押し・ホバーの判定
│   ├── setup.ts       # キングダムの選び直し・AI 戦略の名前と説明
│   ├── tooltip.ts     # ツールチップの位置
│   ├── turnFlow.ts    # ターン進行のお知らせ・AI の段階表示の間隔
│   └── __tests__/     # ユーティリティテスト
├── assets/            # 静的アセット
│   └── react.svg      # Reactロゴ（デフォルト）
├── __tests__/         # App 全体と見た目の決まり（uiRules）のテスト
├── App.tsx            # アプリケーションルート
├── main.tsx           # エントリーポイント
├── index.css          # グローバルスタイル
└── test-setup.ts      # vitest のセットアップ（jest-dom マッチャーの型拡張）
```

## 各ディレクトリの役割

### `components/`
再利用可能なUIコンポーネントを配置します。ゲームの状態は props で受け取り、ストアには触りません（`ErrorBoundary` だけは途中保存を消すためにストアを使います）。カード定義などの定数・判定関数は `domain/` から読みます。

### `pages/`
画面単位のページコンポーネントを配置します。アプリケーションのルーティングに対応します。

### `domain/`
ゲームのビジネスロジックを配置します。UIとは独立しており、純粋な関数として実装されています。
- **effect/**: カード効果の解決ロジック。命名規則は明確性重視（例: `resolveMilitiaChoice`）

### `ai/`
AI対戦相手の戦略を配置します。各ファイルは異なるAI戦略を実装します。`aiTurn.ts` は戦略が決めた行動を段階に分けて、画面（GamePage）が順に見せられるようにします。

### `stores/`
Zustandを使用した状態管理を配置します。ゲーム全体の状態を管理し、`persist` で localStorage に途中保存します。

### `hooks/`
キーボード操作・画面の幅・動きを減らす設定など、画面から使う React フックを配置します。

### `types/`
TypeScriptの型定義を配置します。ドメインモデルの型を集約します。

### `constants/`
アプリケーション全体で使用する定数を配置します。i18n対応を見越した構成です。

### `lib/`
画面まわりの汎用ユーティリティ関数（React 非依存）を配置します。`cn()`（Tailwind CSS class merging）、カード効果テキストを生成する `getEffectText()` のほか、セットアップ・ターン進行・結果画面・手札の並べ方などの計算。

### `assets/`
画像やアイコンなどの静的アセットを配置します。現在はデフォルトのReactロゴのみ（カードの絵は `public/cards/` にあります）。

## 命名規則

- **コンポーネント**: PascalCase（例: `CardView.tsx`）
- **ドメインロジック**: camelCase関数（例: `resolveCustomEffect`）
- **型定義**: PascalCase（例: `GameState`, `CardInstance`）
- **定数**: UPPER_SNAKE_CASE（例: `EFFECT_LABELS`）

## テスト

各ディレクトリに `__tests__/` サブディレクトリを配置し、テストファイルを格納します（App 全体のテストは `src/__tests__/`）。
テストファイル名は `*.test.ts` または `*.test.tsx` とします。
