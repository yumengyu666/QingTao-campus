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

  // Shared glass-friendly button style
  const btnBase =
    'w-8 h-8 rounded-lg flex items-center justify-center text-xs font-medium transition-colors';
  const navBtn = `${btnBase} border disabled:opacity-30 disabled:cursor-not-allowed`;

  return (
    <div className="flex flex-col items-center gap-2 py-4">
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className={navBtn}
          style={{
            borderColor: 'var(--color-border)',
            color: 'var(--color-text-secondary)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--color-bg-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <FiChevronLeft className="text-sm" />
        </button>

        {pages.map((p, i) =>
          p === '...' ? (
            <span
              key={`dots-${i}`}
              className="w-8 h-8 flex items-center justify-center text-xs"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              ...
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p as number)}
              className={btnBase}
              style={
                page === p
                  ? {
                      background: 'var(--color-brand-primary)',
                      color: '#ffffff',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                    }
                  : {
                      color: 'var(--color-text-secondary)',
                    }
              }
              onMouseEnter={(e) => {
                if (page !== p) {
                  e.currentTarget.style.background = 'var(--color-bg-hover)';
                }
              }}
              onMouseLeave={(e) => {
                if (page !== p) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              {p}
            </button>
          )
        )}

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className={navBtn}
          style={{
            borderColor: 'var(--color-border)',
            color: 'var(--color-text-secondary)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--color-bg-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <FiChevronRight className="text-sm" />
        </button>
      </div>

      <div className="flex items-center gap-1.5">
        <span
          className="text-xs"
          style={{ color: 'var(--color-text-tertiary)' }}
        >
          共 {total} 条 · 第 {page} / {totalPages} 页
        </span>
        <input
          type="number"
          value={jumpValue}
          onChange={(e) => setJumpValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleJump()}
          placeholder="跳转"
          min={1}
          max={totalPages}
          className="w-12 px-2 py-0.5 text-xs text-center rounded border outline-none transition-colors"
          style={{
            borderColor: 'var(--color-border)',
            background: 'var(--color-card)',
            color: 'var(--color-text-primary)',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-border-focus)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-border)';
          }}
        />
        <button
          onClick={handleJump}
          disabled={!jumpValue}
          className="text-xs font-medium disabled:opacity-30"
          style={{ color: 'var(--color-brand-primary)' }}
        >
          GO
        </button>
      </div>
    </div>
  );
}
