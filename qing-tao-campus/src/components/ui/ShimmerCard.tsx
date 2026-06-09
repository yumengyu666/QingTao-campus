interface ShimmerCardProps {
  lines?: number;
  className?: string;
  avatar?: boolean;
}

export function ShimmerCard({ lines = 3, className = '', avatar = true }: ShimmerCardProps) {
  return (
    <div className={`rounded-2xl bg-white dark:bg-gray-800 p-5 space-y-3 overflow-hidden ${className}`}>
      {avatar && <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 animate-shimmer bg-[length:200%_100%]" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-1/3 rounded bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 animate-shimmer bg-[length:200%_100%]" />
          <div className="h-2 w-1/4 rounded bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 animate-shimmer bg-[length:200%_100%]" />
        </div>
      </div>}
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className={`h-3 rounded bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 animate-shimmer bg-[length:200%_100%]`}
          style={{ width: `${70 + Math.random() * 30}%` }} />
      ))}
    </div>
  );
}
