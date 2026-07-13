import { FiCheck } from 'react-icons/fi';

interface Props {
  steps: string[];
  current: number; // 0-indexed
  className?: string;
}

export function StepIndicator({ steps, current, className = '' }: Props) {
  return (
    <div className={`flex items-center justify-center gap-0 ${className}`}>
      {/* Desktop: full labels */}
      <div className="hidden sm:flex items-center w-full">
        {steps.map((label, i) => {
          const isCompleted = i < current;
          const isActive = i === current;
          const isFuture = i > current;

          return (
            <div key={i} className="flex items-center flex-1 last:flex-none">
              {/* Step circle + label */}
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                    isCompleted
                      ? 'bg-green-500 text-white'
                      : isActive
                      ? 'bg-indigo-500 text-white ring-4 ring-indigo-200 dark:ring-indigo-800'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                  }`}
                >
                  {isCompleted ? <FiCheck className="text-sm" /> : i + 1}
                </div>
                <span
                  className={`text-xs font-medium transition-colors ${
                    isCompleted
                      ? 'text-green-600 dark:text-green-400'
                      : isActive
                      ? 'text-indigo-600 dark:text-indigo-400'
                      : 'text-gray-400 dark:text-gray-500'
                  }`}
                >
                  {label}
                </span>
              </div>

              {/* Connecting line */}
              {i < steps.length - 1 && (
                <div className="flex-1 h-0.5 mx-2 mt-[-1.25rem]">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isCompleted ? 'bg-green-400' : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile: compact numbers only */}
      <div className="flex sm:hidden items-center gap-1">
        {steps.map((_, i) => {
          const isCompleted = i < current;
          const isActive = i === current;
          return (
            <div key={i} className="flex items-center gap-1">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-all duration-300 ${
                  isCompleted
                    ? 'bg-green-500 text-white'
                    : isActive
                    ? 'bg-indigo-500 text-white ring-2 ring-indigo-200 dark:ring-indigo-800'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                }`}
              >
                {isCompleted ? <FiCheck className="text-[10px]" /> : i + 1}
              </div>
              {i < steps.length - 1 && (
                <div
                  className={`w-4 h-0.5 rounded-full ${
                    isCompleted ? 'bg-green-400' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
