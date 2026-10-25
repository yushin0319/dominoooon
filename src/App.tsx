import { MotionConfig } from 'framer-motion';
import GamePage from './pages/GamePage';
import ResultPage from './pages/ResultPage';
import SetupPage from './pages/SetupPage';
import TitlePage from './pages/TitlePage';
import { useGameStore } from './stores/gameStore';

function CurrentPage() {
  const page = useGameStore((s) => s.page);
  switch (page) {
    case 'title':
      return <TitlePage />;
    case 'setup':
      return <SetupPage />;
    case 'game':
      return <GamePage />;
    case 'result':
      return <ResultPage />;
  }
}

function App() {
  // OS の「視差効果を減らす / アニメーションを減らす」設定（prefers-reduced-motion）では、
  // framer-motion の動き（手札の登場・持ち上げ・場に出す・AI のターン）を止める（位置は一瞬で変わり、透明度だけ変わる）
  return (
    <MotionConfig reducedMotion="user">
      <CurrentPage />
    </MotionConfig>
  );
}

export default App;
