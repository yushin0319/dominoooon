import { CARD_DEFS } from '../domain/card';
import { EMPTY_PILES_TO_END } from '../domain/supply';
import ModalShell from './ModalShell';

/** 1 ターンの流れ（手札の上の帯のボタン名と同じ言葉で書く） */
const STEPS = [
  {
    title: 'アクション',
    text: '光っている手札のアクションカードを押して使います。使えるのは「アクション」の数だけ（最初は 1 回）。使えるカードが無ければ、自動で購入に進みます。',
  },
  {
    title: '購入',
    text: '財宝は自動で場に出ます。コインの合計以下のカードを、サプライから押して買います（最初は 1 枚）。買ったカードは捨て札に入り、あとで山札に混ざります。',
  },
  {
    title: 'ターン終了',
    text: '「ターン終了」を押すと、手札と場のカードを捨て札にして、山札から 5 枚引きます。山札が無くなったら、捨て札を混ぜて山札にします。',
  },
];

/** 操作のしかた */
const CONTROLS = [
  ['タップ（クリック）', 'カードを使う・買う'],
  ['長押し（パソコンはマウスを乗せる）', 'カードの説明を見る'],
  ['「購入を取り消す」', '買い間違えたら、直前の 1 枚だけ戻せる'],
  ['「購入へ進む」「ターン終了」', '手札のすぐ上のボタン'],
  ['途中でやめても大丈夫', '自動で保存し、次に開いたときに続きから遊べる'],
];

/** キーボードでの操作（パソコン） */
const KEYBOARD = [
  ['Tab / Shift + Tab', '押せるカード・ボタンへ移る（説明も出る）'],
  ['Enter / Space', 'カードを使う・買う、ボタンを押す、選択画面でカードを選ぶ'],
  ['1〜9', '手札の左から 1〜9 枚目を使う'],
  ['Esc', '遊び方・メニュー・確認などを閉じる（効果の選択画面は閉じない）'],
];

interface HowToPlayDialogProps {
  onClose: () => void;
}

/**
 * 遊び方（タイトル画面の「遊び方」・ゲーム中の「?」から開く）。
 * 3 つのステップ（アクション → 購入 → ターン終了）、勝ち方、主な操作。外を押す・「閉じる」・Esc で閉じる
 */
export default function HowToPlayDialog({ onClose }: HowToPlayDialogProps) {
  return (
    <ModalShell
      title="遊び方"
      titleClassName="px-5 pt-4 pb-2 text-lg font-bold text-white"
      onClose={onClose}
      backdropClassName="bg-black/70"
      className="w-full max-w-lg max-h-full flex flex-col bg-slate-800 border border-slate-600 rounded-lg shadow-xl text-slate-200"
    >
      {/* 中身が画面より高いときは、ここだけスクロールする（見出しと「閉じる」は常に見える）。
          キーボードでも読み進められるよう Tab で選べる欄にする（選んで矢印キー・PageDown でスクロール） */}
      <section
        aria-label="遊び方の説明"
        // biome-ignore lint/a11y/noNoninteractiveTabindex: スクロールする欄をキーボードでスクロールできるようにする（WCAG 2.1.1。axe の scrollable-region-focusable と同じ考え方）
        tabIndex={0}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-2 space-y-5 text-sm leading-relaxed"
      >
        <section>
          <h3 className="mb-1 font-bold text-white">勝ち方</h3>
          <p>
            ゲームが終わったときに、勝利点がいちばん多い人の勝ちです。勝利点のカードは
            属州 {CARD_DEFS.Province.vpValue} 点・公領 {CARD_DEFS.Duchy.vpValue}{' '}
            点・屋敷 {CARD_DEFS.Estate.vpValue} 点（呪いは{' '}
            {CARD_DEFS.Curse.vpValue} 点）。
            同点ならターン数が少ない方の勝ち、それも同じなら引き分けです。
          </p>
          <p className="mt-1">
            属州の山がなくなるか、サプライの山が {EMPTY_PILES_TO_END}{' '}
            つ空になったら、そのターンの終わりでゲーム終了です。
          </p>
        </section>

        <section>
          <h3 className="mb-2 font-bold text-white">1 ターンの流れ</h3>
          <ol className="space-y-3">
            {STEPS.map((step, i) => (
              <li key={step.title} className="flex gap-3">
                <span
                  aria-hidden="true"
                  className="shrink-0 w-7 h-7 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center"
                >
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <h4 className="font-bold text-emerald-200">
                    <span className="sr-only">ステップ {i + 1}: </span>
                    {step.title}
                  </h4>
                  <p className="text-slate-300">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section>
          <h3 className="mb-2 font-bold text-white">操作</h3>
          <dl className="space-y-2">
            {CONTROLS.map(([term, desc]) => (
              <div key={term}>
                <dt className="font-semibold text-slate-100">{term}</dt>
                <dd className="text-slate-300">{desc}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section>
          <h3 className="mb-2 font-bold text-white">キーボード（パソコン）</h3>
          <dl className="space-y-2">
            {KEYBOARD.map(([keys, desc]) => (
              <div key={keys}>
                <dt className="font-semibold text-slate-100">{keys}</dt>
                <dd className="text-slate-300">{desc}</dd>
              </div>
            ))}
          </dl>
        </section>
      </section>
      <div className="px-5 py-3 flex justify-end border-t border-slate-700">
        <button
          type="button"
          onClick={onClose}
          className="min-h-11 px-5 text-sm font-medium text-slate-100 bg-slate-700 border border-slate-600 rounded hover:bg-slate-600 transition-colors"
        >
          閉じる
        </button>
      </div>
    </ModalShell>
  );
}
