import { FiArrowLeft } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { useNavContext } from '@/hooks/useAppNavigate';

interface MobileHeaderProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  className?: string;
  transparent?: boolean;
}

export function MobileHeader({
  title,
  showBack = true,
  onBack,
  rightAction,
  className = '',
  transparent = false,
}: MobileHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { basePath } = useNavContext();

  // 液态玻璃布局：LiquidGlassLayout 已提供完整头部
  if (basePath === '/lg') return null;

  const bgClass = transparent
    ? 'bg-transparent'
    : 'bg-white/90 dark:bg-[var(--color-card)]/90 backdrop-blur-xl border-b border-gray-100/80 dark:border-[var(--color-border)]/80';

  return (
    <header className={`sticky top-0 z-30 ${bgClass} ${className}`}>
      <div className="flex items-center justify-between h-12 px-4">
        <div className="w-16 flex items-center">
          {showBack && (
            <button
              onClick={onBack ? onBack : () => navigate(-1)}
              className="p-1 -ml-1 flex items-center gap-1 text-sm text-indigo-500 hover:text-indigo-600 transition-colors group"
              aria-label="返回"
            >
              <FiArrowLeft className="text-xl transition-transform group-hover:-translate-x-0.5" />
              <span className="hidden md:inline">返回</span>
            </button>
          )}
        </div>

        <h1 className="font-semibold text-base truncate max-w-[60%]">{title}</h1>

        <div className="w-16 flex justify-end items-center">
          {rightAction}
        </div>
      </div>
    </header>
  );
}
