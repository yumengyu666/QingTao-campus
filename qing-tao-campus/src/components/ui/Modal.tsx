import { motion, AnimatePresence } from 'framer-motion';
import { FiX } from 'react-icons/fi';
import { useEffect, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showClose?: boolean;
  closeOnBackdrop?: boolean;
  footer?: React.ReactNode;
  bottomSheet?: boolean; // mobile: bottom panel; desktop: centered modal
}

const sizeMap = {
  sm: '360px',
  md: '480px',
  lg: '640px',
  xl: '800px',
};

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  size = 'md',
  showClose = true,
  closeOnBackdrop = true,
  footer,
  bottomSheet = false,
}: ModalProps) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 640 : false
  );

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, handleKeyDown]);

  if (typeof window === 'undefined') return null;

  const useBottomSheet = bottomSheet && isMobile;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-[var(--modal-backdrop-bg)]"
            style={{ backdropFilter: 'var(--modal-backdrop-blur)' }}
            onClick={closeOnBackdrop ? onClose : undefined}
          />

          {/* Bottom Sheet (mobile) */}
          {useBottomSheet ? (
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="fixed bottom-0 left-0 right-0 bg-[var(--modal-bg)] rounded-t-2xl shadow-[var(--modal-shadow)] max-h-[85vh] overflow-y-auto w-full"
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
              </div>
              {/* Header */}
              {(title || showClose) && (
                <div className="flex items-start justify-between px-5 pt-2 pb-0">
                  <div>
                    {title && (
                      <h2 className="text-lg font-bold text-[var(--color-text-primary)]">{title}</h2>
                    )}
                    {description && (
                      <p className="text-sm text-[var(--color-text-tertiary)] mt-1">{description}</p>
                    )}
                  </div>
                  {showClose && (
                    <button
                      onClick={onClose}
                      className="p-1.5 -mr-1.5 -mt-1 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors flex-shrink-0"
                      aria-label="关闭"
                    >
                      <FiX size={18} />
                    </button>
                  )}
                </div>
              )}
              <div className="p-5">{children}</div>
              {footer && (
                <div className="px-5 pb-5 flex items-center justify-end gap-3">
                  {footer}
                </div>
              )}
            </motion.div>
          ) : (
            /* Centered Modal (desktop) */
            <motion.div
              initial={{ scale: 0.92, y: 24, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.92, y: 24, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className={`relative bg-[var(--modal-bg)] rounded-[var(--modal-border-radius)] shadow-[var(--modal-shadow)] w-full overflow-hidden`}
              style={{ maxWidth: sizeMap[size] }}
            >
              {/* Header */}
              {(title || showClose) && (
                <div className="flex items-start justify-between p-[var(--modal-padding)] pb-0">
                  <div>
                    {title && (
                      <h2 className="text-lg font-bold text-[var(--color-text-primary)]">{title}</h2>
                    )}
                    {description && (
                      <p className="text-sm text-[var(--color-text-tertiary)] mt-1">{description}</p>
                    )}
                  </div>
                  {showClose && (
                    <button
                      onClick={onClose}
                      className="p-1.5 -mr-1.5 -mt-1 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors flex-shrink-0"
                      aria-label="关闭"
                    >
                      <FiX size={18} />
                    </button>
                  )}
                </div>
              )}

              {/* Body */}
              <div className="p-[var(--modal-padding)]">{children}</div>

              {/* Footer */}
              {footer && (
                <div className="px-[var(--modal-padding)] pb-[var(--modal-padding)] flex items-center justify-end gap-3">
                  {footer}
                </div>
              )}
            </motion.div>
          )}
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

/**
 * Confirm dialog — wrapper around Modal
 */
interface ConfirmProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = '确认',
  cancelLabel = '取消',
  variant = 'primary',
  loading,
}: ConfirmProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{message}</p>
      <div className="flex justify-end gap-3 mt-6">
        <button onClick={onClose} className="btn btn-secondary btn-sm" disabled={loading}>
          {cancelLabel}
        </button>
        <button
          onClick={onConfirm}
          className={`btn btn-sm ${variant === 'danger' ? 'btn-danger' : 'btn-primary'}`}
          disabled={loading}
        >
          {loading ? '处理中...' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
