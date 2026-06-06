import { motion } from 'framer-motion';

export function EndOfList({ text = '— 我是有底线的 —' }: { text?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center justify-center py-8"
    >
      <div className="flex items-center gap-3">
        <div className="h-px w-12 bg-gray-200 dark:bg-gray-700" />
        <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">{text}</span>
        <div className="h-px w-12 bg-gray-200 dark:bg-gray-700" />
      </div>
    </motion.div>
  );
}
