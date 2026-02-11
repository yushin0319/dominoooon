import { useGameStore } from '../stores/gameStore';

export default function TitlePage() {
  const goToSetup = useGameStore((s) => s.goToSetup);

  return (
    <div className="title-page">
      <h1 className="title-logo">Dominoooon</h1>
      <p className="title-subtitle">ドミニオン風カードゲーム</p>
      <button className="btn btn-primary btn-large" onClick={goToSetup}>
        ゲーム開始
      </button>
    </div>
  );
}
