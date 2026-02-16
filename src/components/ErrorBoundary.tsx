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
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-8">
          <div className="bg-red-900/20 border-2 border-red-500 rounded-lg p-6 max-w-md text-center">
            <h1 className="text-2xl font-bold mb-4">エラーが発生しました</h1>
            <p className="text-slate-300 mb-6">
              アプリケーションで予期しないエラーが発生しました。
            </p>
            <button
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded font-medium transition-colors"
              onClick={() => window.location.href = '/'}
            >
              タイトルに戻る
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
