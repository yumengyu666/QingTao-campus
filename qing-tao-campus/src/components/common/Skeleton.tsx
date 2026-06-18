/**
 * Skeleton loading placeholders with refined shimmer animation.
 *
 * Variants:
 * - Card / Grid: product/post card skeletons
 * - List: list row skeleton (avatar + text)
 * - Detail: full detail page skeleton
 * - Text: single/multiple text lines
 * - Avatar: circular avatar placeholder
 * - Conversation: chat conversation list
 * - Banner: large hero/banner placeholder
 * - Profile: user profile skeleton
 */

function TextLine({
  width,
  height = 'h-3.5',
  className = '',
}: {
  width?: string;
  height?: string;
  className?: string;
}) {
  return (
    <div
      className={`skeleton rounded-md ${height} ${className}`}
      style={{ width: width || '100%' }}
    />
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-[var(--color-card)] rounded-xl overflow-hidden border border-gray-100 dark:border-[var(--color-border)]">
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

function SkeletonCardSimple() {
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
        <div
          key={i}
          className="flex items-center gap-3 p-3 bg-white dark:bg-[var(--color-card)] rounded-xl border border-gray-50 dark:border-[var(--color-border)]"
        >
          <div className="skeleton w-10 h-10 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <TextLine width="50%" />
            <TextLine width="80%" height="h-3" />
          </div>
          <div className="skeleton w-14 h-6 rounded-md" />
        </div>
      ))}
    </div>
  );
}

function SkeletonDetail() {
  return (
    <div className="space-y-4 animate-fade-in">
      {/* Hero image */}
      <div className="skeleton h-64 md:h-80 rounded-xl" />

      {/* Title card */}
      <div className="bg-white dark:bg-[var(--color-card)] rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="skeleton h-6 w-16 rounded-full" />
          <div className="skeleton h-6 w-16 rounded-full" />
          <div className="skeleton h-6 w-20 rounded-full" />
        </div>
        <TextLine width="70%" height="h-6" />
        <div className="flex items-center gap-3">
          <div className="skeleton w-8 h-8 rounded-full" />
          <TextLine width="30%" height="h-4" />
        </div>
      </div>

      {/* Content card */}
      <div className="bg-white dark:bg-[var(--color-card)] rounded-xl p-4 space-y-2.5">
        <TextLine width="100%" />
        <TextLine width="95%" />
        <TextLine width="85%" />
        <TextLine width="60%" />
      </div>

      {/* Contact card */}
      <div className="bg-white dark:bg-[var(--color-card)] rounded-xl p-4 space-y-3">
        <TextLine width="25%" height="h-5" />
        <div className="flex gap-3">
          <div className="skeleton h-10 flex-1 rounded-lg" />
          <div className="skeleton h-10 flex-1 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

function SkeletonText({
  lines = 3,
  className = '',
}: {
  lines?: number;
  className?: string;
}) {
  const widths = ['90%', '100%', '80%', '95%', '70%', '85%'];
  return (
    <div className={`space-y-2.5 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <TextLine key={i} width={widths[i % widths.length]} />
      ))}
    </div>
  );
}

function SkeletonAvatar({
  size = 'md',
}: {
  size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  const sizeMap = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
    xl: 'w-20 h-20',
  };
  return <div className={`skeleton ${sizeMap[size]} rounded-full flex-shrink-0`} />;
}

function SkeletonGrid({
  count = 6,
  cols = 2,
  bordered = true,
}: {
  count?: number;
  cols?: number;
  bordered?: boolean;
}) {
  const gridCols =
    cols === 1
      ? 'grid-cols-1'
      : cols === 2
        ? 'grid-cols-2'
        : cols === 3
          ? 'grid-cols-3'
          : 'grid-cols-4';
  const CardComponent = bordered ? SkeletonCard : SkeletonCardSimple;

  return (
    <div className={`grid ${gridCols} gap-3 md:gap-4`}>
      {Array.from({ length: count }).map((_, i) => (
        <CardComponent key={i} />
      ))}
    </div>
  );
}

function SkeletonConversation({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-0.5">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 p-3 rounded-2xl hover:bg-gray-50 dark:hover:bg-[var(--color-card-hover)] transition-colors"
        >
          <div className="skeleton w-12 h-12 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex justify-between items-center">
              <TextLine width="35%" height="h-4" />
              <TextLine width="18%" height="h-3" />
            </div>
            <TextLine width="75%" height="h-3" />
          </div>
        </div>
      ))}
    </div>
  );
}

function SkeletonBanner() {
  return <div className="skeleton banner-swiper" />;
}

function SkeletonProfile() {
  return (
    <div className="space-y-4">
      {/* Cover photo area */}
      <div className="skeleton h-32 md:h-48 rounded-b-2xl" />
      {/* Avatar + info */}
      <div className="px-4 -mt-10 space-y-4">
        <div className="flex items-end gap-4">
          <div className="skeleton w-20 h-20 rounded-full ring-4 ring-white dark:ring-[var(--color-bg)]" />
          <div className="flex-1 pb-2 space-y-2">
            <TextLine width="40%" height="h-5" />
            <TextLine width="60%" height="h-3.5" />
          </div>
        </div>
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-16 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

export const Skeleton = {
  Card: SkeletonCard,
  CardSimple: SkeletonCardSimple,
  Grid: SkeletonGrid,
  List: SkeletonList,
  Detail: SkeletonDetail,
  Text: SkeletonText,
  Avatar: SkeletonAvatar,
  Conversation: SkeletonConversation,
  Banner: SkeletonBanner,
  Profile: SkeletonProfile,
};
