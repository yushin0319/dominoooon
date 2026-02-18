import { Component, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
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
            <p className="text-slate-300 mb-6">
              アプリケーションで予期しないエラーが発生しました。
            </p>
            <div className="flex gap-4 justify-center">
              <button
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded font-medium transition-colors"
                onClick={() => window.location.reload()}
              >
                再試行
              </button>
              <button
                className="border border-slate-500 hover:bg-slate-700 text-slate-300 px-6 py-2 rounded font-medium transition-colors"
                onClick={() => window.location.href = '/'}
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
