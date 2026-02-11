import { useGameStore } from './stores/gameStore';
import TitlePage from './pages/TitlePage';
import SetupPage from './pages/SetupPage';
import GamePage from './pages/GamePage';
import ResultPage from './pages/ResultPage';
import './App.css';

function App() {
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

export default App;
