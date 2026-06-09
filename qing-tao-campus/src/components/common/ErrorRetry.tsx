import { FiRefreshCw } from 'react-icons/fi';

interface ErrorRetryProps {
  message?: string;
  onRetry: () => void;
}

export function ErrorRetry({ message = '加载失败，请重试', onRetry }: ErrorRetryProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-4">
        <FiRefreshCw className="text-2xl text-red-400" />
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{message}</p>
      <button
        onClick={onRetry}
        className="px-6 py-2.5 rounded-xl bg-indigo-500 text-white text-sm font-medium
          hover:bg-indigo-600 active:scale-95 transition-all"
      >
        重新加载
      </button>
    </div>
  );
}
