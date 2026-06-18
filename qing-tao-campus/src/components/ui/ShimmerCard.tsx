interface ShimmerCardProps {
  lines?: number;
  className?: string;
  avatar?: boolean;
}

export function ShimmerCard({ lines = 3, className = '', avatar = true }: ShimmerCardProps) {
  return (
    <div className={`lg-card p-5 space-y-3 overflow-hidden ${className}`}>
      {avatar && (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full lg-skeleton" />
          <div className="flex-1 space-y-2">
            <div className="lg-skeleton h-3" style={{ width: '35%' }} />
            <div className="lg-skeleton h-2.5" style={{ width: '25%' }} />
          </div>
        </div>
      )}
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="lg-skeleton h-3"
          style={{ width: `${70 + Math.random() * 30}%` }}
        />
      ))}
    </div>
  );
}
