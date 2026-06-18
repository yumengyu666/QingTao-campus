interface GlassSkeletonProps {
  /** Width in any CSS unit */
  width?: string | number;
  /** Height in any CSS unit */
  height?: string | number;
  /** Border radius override */
  borderRadius?: string | number;
  className?: string;
  /** Number of skeleton lines to render */
  lines?: number;
  /** Gap between lines */
  gap?: number;
}

export function GlassSkeleton({
  width,
  height = 16,
  borderRadius = 8,
  className = "",
  lines = 1,
  gap = 12,
}: GlassSkeletonProps) {
  if (lines > 1) {
    return (
      <div className={`flex flex-col ${className}`} style={{ gap }}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className="lg-skeleton"
            style={{
              width: width || `${85 - i * 10}%`,
              height,
              borderRadius,
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`lg-skeleton ${className}`}
      style={{ width, height, borderRadius }}
    />
  );
}
