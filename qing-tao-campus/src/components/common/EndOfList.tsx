import { motion } from 'framer-motion';
import { FiMinus } from 'react-icons/fi';

interface Props {
  text?: string;
  variant?: 'default' | 'compact';
}

export function EndOfList({
  text = '— 已经到底啦 —',
  variant = 'default',
}: Props) {
  if (variant === 'compact') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="flex items-center justify-center py-6"
      >
        <span className="text-[11px] text-gray-300 dark:text-gray-600">
          {text}
        </span>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="flex items-center justify-center py-10"
    >
      <div className="flex items-center gap-3">
        <div className="h-px w-10 bg-gradient-to-r from-transparent to-gray-200 dark:to-gray-700" />
        <span className="text-xs text-gray-350 dark:text-gray-600 whitespace-nowrap font-medium">
          {text}
        </span>
        <div className="h-px w-10 bg-gradient-to-l from-transparent to-gray-200 dark:to-gray-700" />
      </div>
    </motion.div>
  );
}
