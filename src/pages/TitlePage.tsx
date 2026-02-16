import { useGameStore } from '../stores/gameStore';

export default function TitlePage() {
  const goToSetup = useGameStore((s) => s.goToSetup);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 animate-fade-in">
      <h1 className="text-6xl font-bold text-white drop-shadow-lg">
        Dominoooon
      </h1>
      <p className="text-xl text-slate-300">
        ドミニオン風カードゲーム
      </p>
      <button
        onClick={goToSetup}
        className="px-8 py-4 text-lg font-semibold text-white bg-purple-600 rounded-lg hover:bg-purple-700 active:scale-95 transition-all shadow-lg hover:shadow-xl"
      >
        ゲーム開始
      </button>
    </div>
  );
}
