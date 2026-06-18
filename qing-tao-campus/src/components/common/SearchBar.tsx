import { FiSearch } from "react-icons/fi";
import { motion } from "framer-motion";
import { useAppNavigate } from "@/hooks/useAppNavigate";

interface Props {
  placeholder?: string;
  searchType?: "goods" | "posts" | "lostfound";
  className?: string;
}

export function SearchBar({
  placeholder = "搜索商品 / 帖子...",
  searchType,
  className = "",
}: Props) {
  const nav = useAppNavigate();
  const to = searchType ? `/search?type=${searchType}` : "/search";

  return (
    <motion.button
      whileTap={{ scale: 0.985 }}
      onClick={() => nav(to)}
      className={`lg-input lg-input-search group ${className}`}
      aria-label={placeholder}
    >
      <FiSearch
        className="text-[var(--color-text-tertiary)] group-hover:text-[var(--color-text-secondary)] transition-colors flex-shrink-0"
        size={17}
      />
      <span className="text-sm text-[var(--color-text-placeholder)] text-left flex-1 select-none">
        {placeholder}
      </span>
    </motion.button>
  );
}
