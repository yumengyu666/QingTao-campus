import { FiSearch } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';

interface Props {
  placeholder?: string;
  searchType?: 'goods' | 'posts' | 'lostfound';
  className?: string;
}

export function SearchBar({
  placeholder = '搜索商品/帖子...',
  searchType,
  className = '',
}: Props) {
  const navigate = useNavigate();
  const to = searchType ? `/search?type=${searchType}` : '/search';

  return (
    <button
      onClick={() => navigate(to)}
      className={`w-full flex items-center gap-3 px-4 py-3 bg-white dark:bg-[var(--color-card)] border border-gray-100 dark:border-[var(--color-border)] rounded-2xl shadow-sm hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-md active:scale-[0.98] transition-all group ${className}`}
    >
      <FiSearch className="text-gray-400 group-hover:text-indigo-400 transition-colors flex-shrink-0" />
      <span className="text-sm text-gray-400 text-left">{placeholder}</span>
    </button>
  );
}
