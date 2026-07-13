import type { ReactNode } from 'react';

interface Props {
  current: number;
  max: number;
  className?: string;
}

export function CharCounter({ current, max, className = '' }: Props) {
  const ratio = Math.min(current / max, 1);
  const pct = Math.round(ratio * 100);

  const colorClass =
    pct > 95 ? 'text-red-500' :
    pct > 80 ? 'text-amber-500' :
    'text-gray-400';

  const barColorClass =
    pct > 95 ? 'bg-red-500' :
    pct > 80 ? 'bg-amber-500' :
    'bg-indigo-400';

  return (
    <div className={`flex flex-col items-end gap-0.5 ${className}`}>
      <span className={`text-xs font-medium tabular-nums ${colorClass}`}>
        {current}/{max}
      </span>
      <div className="w-full h-0.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${barColorClass}`}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
    </div>
  );
}
