import { Component, type ReactNode } from 'react';
import { useGameStore } from '../stores/gameStore';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** 画面を移る（テストで差し替える。既定は location.assign） */
  navigate?: (url: string) => void;
}

/**
 * アプリの最初の画面の URL。アプリは GitHub Pages の /dominoooon/ に置いてあるので、vite の base（BASE_URL）へ戻る
 * （「/」へ戻すと yushin0319.github.io の一番上 = 別のサイトの 404 になっていた。開発サーバーは「/」を base へ転送するので気づきにくい）
 */
export function getAppHomeUrl(baseUrl: string): string {
  return baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
}

function assignLocation(url: string) {
  window.location.assign(url);
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  /**
   * タイトルに戻る: 途中のゲームの保存を消してから最初の画面へ。
   * 消さないと、読み直した途中のゲームでまた同じエラーになり、エラー画面から抜けられない
   */
  handleGoHome = () => {
    useGameStore.persist.clearStorage();
    (this.props.navigate ?? assignLocation)(
      getAppHomeUrl(import.meta.env.BASE_URL),
    );
  };

  render() {
    if (this.state.hasError) {
      const { error } = this.state;
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-8">
          <div className="bg-red-900/20 border-2 border-red-500 rounded-lg p-6 max-w-lg w-full text-center">
            <h1 className="text-2xl font-bold mb-4">エラーが発生しました</h1>
            {error?.message && (
              <p className="text-red-300 text-sm mb-4 font-mono bg-red-900/30 rounded p-2">
                {error.message}
              </p>
            )}
            {import.meta.env.DEV && error?.stack && (
              <pre className="text-left text-xs text-slate-400 bg-slate-800 rounded p-3 mb-4 overflow-auto max-h-40">
                {error.stack}
              </pre>
            )}
            <p className="text-slate-300 mb-2">
              アプリケーションで予期しないエラーが発生しました。
            </p>
            <p className="text-slate-400 text-sm mb-6">
              「再試行」は途中のゲームを読み込み直します。直らないときは「タイトルに戻る」を押してください（途中のゲームは消えます）。
            </p>
            {/* ボタンは押しやすい高さ（44px） */}
            <div className="flex flex-wrap gap-4 justify-center">
              <button
                type="button"
                className="min-h-11 bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded font-medium transition-colors"
                onClick={() => window.location.reload()}
              >
                再試行
              </button>
              <button
                type="button"
                className="min-h-11 border border-slate-500 hover:bg-slate-700 text-slate-300 px-6 py-2 rounded font-medium transition-colors"
                onClick={this.handleGoHome}
              >
                タイトルに戻る
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
