import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
  padding?: 'sm' | 'md' | 'lg';
}

export function GlassCard({ children, className = '', hover = true, onClick, padding = 'md' }: GlassCardProps) {
  const p = { sm: 'p-3', md: 'p-5', lg: 'p-8' }[padding];

  return (
    <motion.div
      whileHover={hover ? { y: -2, scale: 1.01 } : {}}
      whileTap={onClick ? { scale: 0.98 } : {}}
      onClick={onClick}
      className={`
        ${p} rounded-2xl cursor-pointer
        bg-white/70 dark:bg-gray-800/70
        backdrop-blur-xl backdrop-saturate-150
        border border-white/20 dark:border-gray-700/30
        shadow-lg shadow-black/5 dark:shadow-black/20
        transition-shadow duration-300
        hover:shadow-xl hover:shadow-black/10
        ${className}
      `}
    >
      {children}
    </motion.div>
  );
}
