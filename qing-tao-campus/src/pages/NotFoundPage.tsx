import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiHome, FiCompass } from 'react-icons/fi';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-[var(--color-bg)]">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="text-center"
      >
        {/* Animated icon */}
        <motion.div
          animate={{
            y: [0, -8, 0],
            rotate: [0, -3, 3, 0],
          }}
          transition={{
            repeat: Infinity,
            duration: 4,
            ease: 'easeInOut',
          }}
          className="w-28 h-28 mx-auto mb-6 rounded-3xl bg-white dark:bg-[var(--color-card)] border border-gray-100 dark:border-[var(--color-border)] shadow-sm flex items-center justify-center"
        >
          <span className="text-5xl">🔍</span>
        </motion.div>

        {/* 404 */}
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 mb-3"
        >
          404
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-gray-500 dark:text-[var(--color-text-secondary)] text-sm mb-1.5 font-medium"
        >
          页面不存在或已被移除
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-gray-400 dark:text-gray-500 text-xs mb-8 max-w-xs mx-auto leading-relaxed"
        >
          你访问的页面可能已经下架、被删除，或地址输入有误
        </motion.p>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex items-center justify-center gap-3"
        >
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-500 text-white rounded-xl font-medium hover:bg-indigo-600 active:scale-95 transition-all shadow-lg shadow-indigo-500/25"
          >
            <FiHome size={16} />
            返回首页
          </Link>
          <Link
            to="/square"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white dark:bg-[var(--color-card)] text-gray-700 dark:text-gray-200 rounded-xl font-medium border border-gray-200 dark:border-[var(--color-border)] hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-sm active:scale-95 transition-all"
          >
            <FiCompass size={16} />
            去广场看看
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}
