interface Props {
  src?: string;
  nickname?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  badge?: number;
  isOnline?: boolean;
}

const sizeMap = {
  sm: 'w-7 h-7 text-[10px]',
  md: 'w-9 h-9 text-xs',
  lg: 'w-14 h-14 text-lg',
  xl: 'w-20 h-20 text-2xl',
};

const badgeSizeMap = {
  sm: 'w-2.5 h-2.5',
  md: 'w-3 h-3',
  lg: 'w-4 h-4',
  xl: 'w-5 h-5',
};

export function UserAvatar({
  src,
  nickname,
  size = 'md',
  badge,
  isOnline,
}: Props) {
  const initial = (nickname || '?')[0];

  if (src) {
    return (
      <div className="relative flex-shrink-0">
        <img
          src={src}
          alt={nickname || ''}
          className={`${sizeMap[size]} rounded-full object-cover bg-gray-100 dark:bg-[var(--color-card-hover)] ring-2 ring-gray-100 dark:ring-gray-700`}
          loading="lazy"
        />
        {isOnline !== undefined && (
          <span
            className={`absolute -bottom-0.5 -right-0.5 ${badgeSizeMap[size]} rounded-full ring-2 ring-white dark:ring-gray-800 ${
              isOnline ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
            }`}
          />
        )}
        {badge != null && badge > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1 leading-none ring-2 ring-white dark:ring-gray-800">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="relative flex-shrink-0">
      <div
        className={`${sizeMap[size]} rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 text-white flex items-center justify-center font-bold ring-2 ring-gray-100 dark:ring-gray-700`}
      >
        {initial}
      </div>
      {isOnline !== undefined && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 ${badgeSizeMap[size]} rounded-full ring-2 ring-white dark:ring-gray-800 ${
            isOnline ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
          }`}
        />
      )}
      {badge != null && badge > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1 leading-none ring-2 ring-white dark:ring-gray-800">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </div>
  );
}
