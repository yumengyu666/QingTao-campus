import { Component, type ReactNode } from 'react';
import { FiAlertTriangle, FiRefreshCw } from 'react-icons/fi';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-4">
            <FiAlertTriangle className="text-2xl text-red-500" />
          </div>
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">
            页面加载异常
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-md">
            请尝试刷新页面。如果问题持续，请联系管理员。
          </p>
          <button
            onClick={this.handleRetry}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-500 text-white text-sm font-medium hover:bg-indigo-600 active:scale-95 transition-all"
          >
            <FiRefreshCw className="text-sm" />
            重试
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
