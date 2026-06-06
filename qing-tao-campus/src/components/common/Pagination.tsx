import { useState } from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

interface Props {
  page: number;
  total: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, total, pageSize = 20, onPageChange }: Props) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const [jumpValue, setJumpValue] = useState('');

  if (total <= pageSize) return null;

  const pages: (number | '...')[] = [];
  const delta = 2;
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - delta && i <= page + delta)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...');
    }
  }

  const handleJump = () => {
    const p = parseInt(jumpValue);
    if (p >= 1 && p <= totalPages) {
      onPageChange(p);
      setJumpValue('');
    }
  };

  return (
    <div className="flex flex-col items-center gap-2 py-4">
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="w-8 h-8 rounded-lg flex items-center justify-center border border-gray-200 dark:border-[var(--color-border)] text-gray-500 dark:text-[var(--color-text-secondary)] hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <FiChevronLeft className="text-sm" />
        </button>

        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`dots-${i}`} className="w-8 h-8 flex items-center justify-center text-xs text-gray-400">
              ...
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p as number)}
              className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                page === p
                  ? 'bg-indigo-500 text-white shadow-sm'
                  : 'text-gray-500 dark:text-[var(--color-text-secondary)] hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {p}
            </button>
          )
        )}

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="w-8 h-8 rounded-lg flex items-center justify-center border border-gray-200 dark:border-[var(--color-border)] text-gray-500 dark:text-[var(--color-text-secondary)] hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <FiChevronRight className="text-sm" />
        </button>
      </div>

      <div className="flex items-center gap-1.5">
        <span className="text-xs text-gray-400">
          共 {total} 条 · {totalPages} 页
        </span>
        <input
          type="number"
          value={jumpValue}
          onChange={(e) => setJumpValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleJump()}
          placeholder="跳转"
          min={1}
          max={totalPages}
          className="w-12 px-2 py-0.5 text-xs text-center rounded border border-gray-200 dark:border-[var(--color-border)] bg-white dark:bg-[var(--color-card)] outline-none focus:border-indigo-400"
        />
        <button
          onClick={handleJump}
          disabled={!jumpValue}
          className="text-xs text-indigo-500 hover:text-indigo-600 disabled:opacity-30 font-medium"
        >
          GO
        </button>
      </div>
    </div>
  );
}
