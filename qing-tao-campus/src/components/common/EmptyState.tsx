import { FiInbox } from 'react-icons/fi';
import { motion } from 'framer-motion';

interface Props {
  message?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  variant?: 'default' | 'compact' | 'subtle' | 'glass';
}

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  },
};

const iconVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, delay: 0.1, ease: [0.175, 0.885, 0.32, 1.275] },
  },
};

export function EmptyState({
  message = '暂无数据',
  description,
  icon,
  action,
  variant = 'default',
}: Props) {
  const isCompact = variant === 'compact';
  const isSubtle = variant === 'subtle';
  const isGlass = variant === 'glass';

  const paddingY = isCompact ? 'py-8' : 'py-16 md:py-24';
  const iconSize = isCompact ? 'w-14 h-14' : 'w-20 h-20 md:w-24 md:h-24';
  const iconTextSize = isCompact ? 'text-2xl' : 'text-3xl md:text-4xl';

  // ── Glass variant: wrapped in a subtle glass card ──
  if (isGlass) {
    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex items-center justify-center p-6"
      >
        <div
          className="flex flex-col items-center justify-center rounded-2xl px-8 py-12 md:py-16 max-w-sm w-full"
          style={{
            background: 'var(--color-card)',
            border: '1px solid var(--color-border)',
            backdropFilter: 'blur(16px) saturate(180%)',
            WebkitBackdropFilter: 'blur(16px) saturate(180%)',
          }}
        >
          <motion.div
            variants={iconVariants}
            className="w-20 h-20 md:w-24 md:h-24 rounded-2xl flex items-center justify-center mb-5"
            style={{
              background: 'var(--color-bg-raised)',
              border: '1px solid var(--color-border)',
            }}
          >
            {icon || (
              <FiInbox
                className="text-3xl md:text-4xl"
                style={{ color: 'var(--color-text-tertiary)' }}
              />
            )}
          </motion.div>
          <p
            className="text-sm font-medium mb-1"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {message}
          </p>
          {description && (
            <p
              className="text-xs text-center max-w-xs leading-relaxed"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              {description}
            </p>
          )}
          {action && <div className="mt-5">{action}</div>}
        </div>
      </motion.div>
    );
  }

  // ── Subtle variant ──
  if (isSubtle) {
    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className={`flex flex-col items-center justify-center ${paddingY} px-4`}
      >
        <div
          className="mb-3"
          style={{ color: 'var(--color-text-tertiary)' }}
        >
          {icon || <FiInbox className={iconTextSize} />}
        </div>
        <p
          className="text-sm"
          style={{ color: 'var(--color-text-tertiary)' }}
        >
          {message}
        </p>
        {description && (
          <p
            className="text-xs mt-1 text-center max-w-xs"
            style={{ color: 'var(--color-text-quaternary)' }}
          >
            {description}
          </p>
        )}
        {action && <div className="mt-4">{action}</div>}
      </motion.div>
    );
  }

  // ── Default / Compact variant ──
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={`flex flex-col items-center justify-center ${paddingY} px-4`}
    >
      <motion.div
        variants={iconVariants}
        className={`${iconSize} rounded-2xl flex items-center justify-center mb-5`}
        style={{
          background: 'var(--color-card)',
          border: '1px solid var(--color-border)',
        }}
      >
        {icon || (
          <FiInbox
            className={iconTextSize}
            style={{ color: 'var(--color-text-tertiary)' }}
          />
        )}
      </motion.div>
      <p
        className="text-sm font-medium"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        {message}
      </p>
      {description && (
        <p
          className="text-xs mt-1.5 text-center max-w-xs leading-relaxed"
          style={{ color: 'var(--color-text-tertiary)' }}
        >
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  );
}
