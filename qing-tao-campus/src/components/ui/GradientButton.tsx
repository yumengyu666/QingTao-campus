import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface GradientButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'success' | 'danger' | 'warn' | 'info' | 'purple';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  icon?: ReactNode;
}

const variants = {
  primary: 'from-indigo-500 to-blue-500 shadow-indigo-500/25',
  success: 'from-emerald-500 to-teal-500 shadow-emerald-500/25',
  danger: 'from-rose-500 to-red-500 shadow-rose-500/25',
  warn: 'from-amber-500 to-orange-500 shadow-amber-500/25',
  info: 'from-cyan-500 to-sky-500 shadow-cyan-500/25',
  purple: 'from-violet-500 to-purple-500 shadow-violet-500/25',
};

const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-5 py-2.5 text-sm', lg: 'px-7 py-3.5 text-base' };

export function GradientButton({
  children, onClick, variant = 'primary', size = 'md', disabled, loading, className = '', icon,
}: GradientButtonProps) {
  return (
    <motion.button
      whileHover={!disabled ? { scale: 1.02, y: -1 } : {}}
      whileTap={!disabled ? { scale: 0.97 } : {}}
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        ${sizes[size]} rounded-xl font-medium text-white
        bg-gradient-to-r ${variants[variant]}
        shadow-lg hover:shadow-xl
        disabled:opacity-50 disabled:cursor-not-allowed
        transition-all duration-200
        flex items-center justify-center gap-2
        ${className}
      `}
    >
      {loading ? (
        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : icon}
      {children}
    </motion.button>
  );
}
