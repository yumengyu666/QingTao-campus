import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiChevronLeft, FiChevronRight } from 'react-icons/fi';

interface Props {
  images: { url: string; blurredUrl?: string }[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
}

export function ImageLightbox({ images, initialIndex = 0, isOpen, onClose }: Props) {
  const [index, setIndex] = useState(initialIndex);

  useEffect(() => {
    setIndex(initialIndex);
  }, [initialIndex, isOpen]);

  const prev = useCallback(() => setIndex(i => (i > 0 ? i - 1 : images.length - 1)), [images.length]);
  const next = useCallback(() => setIndex(i => (i < images.length - 1 ? i + 1 : 0)), [images.length]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    if (isOpen) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose, prev, next]);

  if (!isOpen || images.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
        onClick={onClose}
      >
        <button onClick={onClose} className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 text-white hover:bg-white/20">
          <FiX size={24} />
        </button>

        {images.length > 1 && (
          <>
            <button onClick={e => { e.stopPropagation(); prev(); }} className="absolute left-4 z-10 p-2 rounded-full bg-white/10 text-white hover:bg-white/20">
              <FiChevronLeft size={28} />
            </button>
            <button onClick={e => { e.stopPropagation(); next(); }} className="absolute right-4 z-10 p-2 rounded-full bg-white/10 text-white hover:bg-white/20">
              <FiChevronRight size={28} />
            </button>
          </>
        )}

        <motion.img
          key={index}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
          src={images[index]?.url || ''}
          alt=""
          className="max-w-[90vw] max-h-[90vh] object-contain select-none"
          onClick={e => e.stopPropagation()}
          draggable={false}
        />

        {images.length > 1 && (
          <div className="absolute bottom-6 text-white/60 text-sm">
            {index + 1} / {images.length}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
