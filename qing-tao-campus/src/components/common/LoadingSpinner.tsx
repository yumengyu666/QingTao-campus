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

const dotSizeMap = {
  sm: 'w-1.5 h-1.5',
  md: 'w-2 h-2',
  lg: 'w-2.5 h-2.5',
};

function SpinnerDots({ size = 'md' }: { size: 'sm' | 'md' | 'lg' }) {
  return (
    <div className="flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={`${dotSizeMap[size]} rounded-full bg-indigo-400 animate-bounce`}
          style={{
            animationDelay: `${i * 0.12}s`,
            animationDuration: '0.8s',
          }}
        />
      ))}
    </div>
  );
}

export function LoadingSpinner({
  fullScreen = false,
  size = 'md',
  label,
}: Props) {
  const container = fullScreen
    ? 'flex flex-col items-center justify-center gap-4 min-h-[60vh]'
    : 'flex flex-col items-center justify-center gap-3 py-16';

  return (
    <div className={`${container} animate-fade-in`}>
      <SpinnerDots size={size} />
      {label && (
        <p className={`${size === 'sm' ? 'text-xs' : 'text-sm'} text-gray-400 dark:text-gray-500`}>
          {label}
        </p>
      )}
    </div>
  );
}
