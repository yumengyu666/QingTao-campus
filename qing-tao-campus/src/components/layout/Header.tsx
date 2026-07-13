import { FiArrowLeft, FiShare2, FiSearch } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { useAppNavigate, useNavContext } from '@/hooks/useAppNavigate';
import { DarkModeToggle } from '@/components/common/DarkModeToggle';
import { ThemePicker } from '@/components/theme/ThemePicker';
import { Breadcrumb } from '@/components/common/Breadcrumb';
import { useEffect } from 'react';

interface Props {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  showBreadcrumb?: boolean;
  showSearch?: boolean;
  onShare?: () => void;
  rightAction?: React.ReactNode;
}

export function Header({
  title,
  showBack = true,
  onBack,
  showBreadcrumb = false,
  showSearch = false,
  onShare,
  rightAction,
}: Props) {
  const navigate = useNavigate();
  const nav = useAppNavigate();
  const { basePath } = useNavContext();

  // 液态玻璃布局：LiquidGlassLayout 已提供完整头部（主Tab标题/子页返回），
  // 页面内 Header 不再渲染，避免双重嵌套
  if (basePath === '/lg') return null;

  useEffect(() => {
    document.title = title ? `${title} - 轻淘` : '轻淘 - 郑州轻工业大学校园二手交易平台';
  }, [title]);

  return (
    <header className="sticky top-0 z-30 bg-[var(--color-glass-bg)] backdrop-blur-xl border-b border-[var(--color-border-divider)] md:static md:bg-transparent md:backdrop-blur-none md:border-0 md:mb-2">
      {/* Main Header Bar */}
      <div className="flex items-center justify-between h-11 px-4 md:px-0 md:h-auto md:py-0">
        <div className="w-16 flex items-center">
          {showBack && (
            <button
              onClick={() => onBack ? onBack() : navigate(-1)}
              className="p-1 -ml-1 md:p-0 md:flex md:items-center md:gap-1 md:text-sm md:text-[var(--color-primary)] md:hover:opacity-80 md:transition-opacity group"
              aria-label="返回"
            >
              <FiArrowLeft className="text-xl md:text-base transition-transform group-hover:-translate-x-0.5" />
              <span className="hidden md:inline">返回</span>
            </button>
          )}
          {showSearch && (
            <button
              onClick={() => nav('/search')}
              className="p-1.5 rounded-lg hover:bg-[var(--color-bg-hover)] transition-colors"
              aria-label="搜索"
            >
              <FiSearch className="text-lg md:text-base" />
            </button>
          )}
        </div>

        <h1 className="font-semibold text-base truncate max-w-[60%] md:font-bold md:text-lg">
          {title}
        </h1>

        <div className="w-16 flex justify-end items-center gap-1">
          <ThemePicker />
          <DarkModeToggle />
          {onShare && (
            <button
              onClick={onShare}
              className="p-1.5 rounded-lg hover:bg-[var(--color-bg-hover)] transition-colors"
              aria-label="分享"
            >
              <FiShare2 className="text-lg md:text-base" />
            </button>
          )}
          {rightAction}
        </div>
      </div>

      {/* Breadcrumb (desktop only) */}
      {showBreadcrumb && (
        <div className="hidden md:block px-0">
          <Breadcrumb />
        </div>
      )}
    </header>
  );
}
