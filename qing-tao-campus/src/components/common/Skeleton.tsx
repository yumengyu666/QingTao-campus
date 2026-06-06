/**
 * Skeleton loading placeholders with shimmer animation.
 *
 * Variants:
 * - card: product/post card skeleton
 * - list: list row skeleton (avatar + text)
 * - detail: full detail page skeleton
 * - text: single/multiple text lines
 * - avatar: circular avatar placeholder
 */

function TextLine({ width, className = '' }: { width?: string; className?: string }) {
  return (
    <div
      className={`skeleton h-3.5 rounded-md ${className}`}
      style={{ width: width || '100%' }}
    />
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-[var(--color-card)] rounded-xl overflow-hidden">
      <div className="skeleton h-36 md:h-44 rounded-none" />
      <div className="p-3 space-y-2.5">
        <TextLine width="90%" />
        <TextLine width="60%" />
        <div className="flex items-center justify-between pt-1">
          <div className="skeleton h-5 w-16 rounded-md" />
          <div className="skeleton h-4 w-12 rounded-md" />
        </div>
      </div>
    </div>
  );
}

function SkeletonList({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 bg-white dark:bg-[var(--color-card)] rounded-xl">
          <div className="skeleton w-10 h-10 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <TextLine width="50%" />
            <TextLine width="80%" className="h-3" />
          </div>
          <div className="skeleton w-14 h-6 rounded-md" />
        </div>
      ))}
    </div>
  );
}

function SkeletonDetail() {
  return (
    <div className="space-y-4">
      <div className="skeleton h-64 md:h-96 rounded-xl" />
      <div className="bg-white dark:bg-[var(--color-card)] rounded-xl p-4 space-y-3">
        <TextLine width="40%" className="h-5" />
        <TextLine width="70%" className="h-6" />
        <div className="flex gap-2">
          <div className="skeleton h-6 w-14 rounded-full" />
          <div className="skeleton h-6 w-14 rounded-full" />
          <div className="skeleton h-6 w-14 rounded-full" />
        </div>
      </div>
      <div className="bg-white dark:bg-[var(--color-card)] rounded-xl p-4 space-y-2">
        <TextLine width="30%" />
        <TextLine width="100%" />
        <TextLine width="100%" />
        <TextLine width="60%" />
      </div>
    </div>
  );
}

function SkeletonText({ lines = 3 }: { lines?: number }) {
  const widths = ['90%', '100%', '80%', '95%', '70%', '85%'];
  return (
    <div className="space-y-2.5">
      {Array.from({ length: lines }).map((_, i) => (
        <TextLine key={i} width={widths[i % widths.length]} />
      ))}
    </div>
  );
}

function SkeletonAvatar({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeMap = { sm: 'w-8 h-8', md: 'w-10 h-10', lg: 'w-16 h-16' };
  return <div className={`skeleton ${sizeMap[size]} rounded-full flex-shrink-0`} />;
}

function SkeletonGrid({ count = 6, cols = 2 }: { count?: number; cols?: number }) {
  const gridCols = cols === 2 ? 'grid-cols-2' : cols === 3 ? 'grid-cols-3' : 'grid-cols-4';
  return (
    <div className={`grid ${gridCols} gap-3 md:gap-4`}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

function SkeletonConversation({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-1">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-2xl">
          <div className="skeleton w-12 h-12 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex justify-between">
              <TextLine width="30%" />
              <TextLine width="15%" className="h-3" />
            </div>
            <TextLine width="70%" className="h-3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export const Skeleton = {
  Card: SkeletonCard,
  Grid: SkeletonGrid,
  List: SkeletonList,
  Detail: SkeletonDetail,
  Text: SkeletonText,
  Avatar: SkeletonAvatar,
  Conversation: SkeletonConversation,
};
