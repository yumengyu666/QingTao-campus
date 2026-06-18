import { CAMPUS_MAP } from '@/utils/constants';

interface Props {
  campus: string;
  size?: 'sm' | 'md';
}

export function CampusTag({ campus, size = 'sm' }: Props) {
  const label = CAMPUS_MAP[campus as keyof typeof CAMPUS_MAP] || campus;
  const sizeClass =
    size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-1';

  return (
    <span
      className={`${sizeClass} rounded-full font-medium inline-flex items-center gap-1`}
      style={{
        background: 'var(--color-brand-primary-bg)',
        color: 'var(--color-brand-primary-text)',
      }}
    >
      <span
        className="w-1 h-1 rounded-full"
        style={{
          backgroundColor: 'var(--color-brand-primary-text)',
          opacity: 0.6,
        }}
      />
      {label}
    </span>
  );
}
