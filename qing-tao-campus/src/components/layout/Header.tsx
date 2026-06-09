import { FiArrowLeft, FiShare2 } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { DarkModeToggle } from "@/components/common/DarkModeToggle";
import { ThemePicker } from "@/components/theme/ThemePicker";
import { useEffect } from "react";

interface Props {
  title: string;
  showBack?: boolean;
  onShare?: () => void;
  rightAction?: React.ReactNode;
}

export function Header({ title, showBack = true, onShare, rightAction }: Props) {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = title ? `${title} - 轻淘` : '轻淘 - 郑州轻工业大学校园二手交易平台';
  }, [title]);

  return (
    <header className="sticky top-0 z-30 bg-white/80 dark:bg-[var(--color-card)]/80 backdrop-blur border-b border-gray-100 dark:border-[var(--color-border)] md:static md:bg-transparent md:dark:bg-transparent md:backdrop-blur-none md:border-0 md:mb-2">
      <div className="flex items-center justify-between h-11 px-4 md:px-0 md:h-8">
        <div className="w-16">
          {showBack && (
            <button onClick={() => navigate(-1)} className="p-1 -ml-1 md:p-0 md:flex md:items-center md:gap-1 md:text-sm md:text-indigo-500 md:hover:text-indigo-600 md:transition-colors">
              <FiArrowLeft className="text-xl md:text-base" />
              <span className="hidden md:inline">返回</span>
            </button>
          )}
        </div>
        <h1 className="font-medium text-base truncate md:font-semibold">{title}</h1>
        <div className="w-16 flex justify-end items-center gap-2">
          <ThemePicker />
          <DarkModeToggle />
          {onShare && (
            <button onClick={onShare} className="p-1 md:p-0">
              <FiShare2 className="text-xl md:text-base" />
            </button>
          )}
          {rightAction}
        </div>
      </div>
    </header>
  );
}
