import { CircleHelp } from 'lucide-react';
import { useState } from 'react';
import HowToPlayDialog from '../components/HowToPlay';
import { useGameStore } from '../stores/gameStore';

export default function TitlePage() {
  const goToSetup = useGameStore((s) => s.goToSetup);
  // 遊び方を開いているか（遊び方の説明がどこにもなかった）
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 px-4 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 animate-fade-in">
      {/* 360px 幅では 60px の文字が画面から 6px はみ出していたので、狭い画面だけ一段小さくする */}
      <h1 className="text-5xl min-[380px]:text-6xl font-bold text-white drop-shadow-lg">
        Dominoooon
      </h1>
      <p className="text-xl text-slate-300">ドミニオン風カードゲーム</p>
      <div className="flex flex-col items-stretch gap-3 w-full max-w-xs">
        <button
          type="button"
          onClick={goToSetup}
          className="px-8 py-4 text-lg font-semibold text-white bg-purple-600 rounded-lg hover:bg-purple-700 active:scale-95 transition-all shadow-lg hover:shadow-xl"
        >
          ゲーム開始
        </button>
        <button
          type="button"
          onClick={() => setHelpOpen(true)}
          className="min-h-12 px-8 inline-flex items-center justify-center gap-2 text-base font-medium text-slate-100 bg-slate-800/80 border border-slate-500 rounded-lg hover:bg-slate-700 transition-colors"
        >
          <CircleHelp aria-hidden="true" className="w-5 h-5" />
          遊び方
        </button>
      </div>
      {helpOpen && <HowToPlayDialog onClose={() => setHelpOpen(false)} />}
    </div>
  );
}
