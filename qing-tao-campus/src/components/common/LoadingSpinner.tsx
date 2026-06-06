interface Props {
  fullScreen?: boolean;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

const sizeMap = {
  sm: 'w-5 h-5 border-2',
  md: 'w-8 h-8 border-[3px]',
  lg: 'w-12 h-12 border-4',
};

export function LoadingSpinner({ fullScreen = false, size = 'md', label }: Props) {
  const spinner = (
    <div
      className={`${sizeMap[size]} border-indigo-200 border-t-indigo-500 rounded-full animate-spin`}
    />
  );

  if (fullScreen) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 min-h-screen bg-[var(--color-bg)] animate-fade-in">
        {spinner}
        {label && <p className="text-sm text-gray-400">{label}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-2.5 py-12">
      {spinner}
      {label && <p className="text-xs text-gray-400">{label}</p>}
    </div>
  );
}
