import { FiInbox } from 'react-icons/fi';

interface Props {
  message?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export function EmptyState({
  message = '暂无数据',
  description,
  icon,
  action,
}: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 md:py-24 px-4 animate-fade-in-up">
      <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-gray-100 dark:bg-[var(--color-card)] flex items-center justify-center mb-5 animate-float">
        {icon || <FiInbox className="text-3xl md:text-4xl text-gray-300 dark:text-gray-600" />}
      </div>
      <p className="text-sm font-medium text-gray-500 dark:text-[var(--color-text-secondary)]">{message}</p>
      {description && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5 text-center max-w-xs">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
