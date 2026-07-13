import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface FlyToCartProps {
  trigger: boolean;
  origin: DOMRect | null;
  targetSelector: string;
  onComplete?: () => void;
}

export default function FlyToCart({
  trigger,
  origin,
  targetSelector,
  onComplete,
}: FlyToCartProps) {
  const [flyState, setFlyState] = useState<
    'idle' | 'flying' | 'arrived'
  >('idle');
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [startRect, setStartRect] = useState<DOMRect | null>(null);

  // Capture target position when fly starts
  const startFly = useCallback(() => {
    if (!origin) return;

    const target = document.querySelector(targetSelector);
    if (!target) {
      // Fallback: fly toward top-right (cart default position)
      const fallback: DOMRect = {
        x: window.innerWidth - 60,
        y: 60,
        width: 24,
        height: 24,
        top: 60,
        right: window.innerWidth - 36,
        bottom: 84,
        left: window.innerWidth - 60,
      } as DOMRect;
      setTargetRect(fallback);
    } else {
      setTargetRect(target.getBoundingClientRect());
    }
    setStartRect(origin);
    setFlyState('flying');
  }, [origin, targetSelector]);

  useEffect(() => {
    if (trigger && origin) {
      startFly();
    }
  }, [trigger, origin, startFly]);

  const handleComplete = () => {
    setFlyState('arrived');
    setTimeout(() => {
      setFlyState('idle');
      setStartRect(null);
      setTargetRect(null);
      onComplete?.();
    }, 400);
  };

  if (flyState === 'idle' || !startRect || !targetRect) return null;

  // Bezier control points for arc
  const midX = (startRect.x + startRect.width / 2 + targetRect.x + targetRect.width / 2) / 2;
  const startY = startRect.y + startRect.height / 2;
  const targetY = targetRect.y + targetRect.height / 2;
  const controlY = Math.min(startY, targetY) - 80; // arc upward

  const cartIconSize = Math.min(targetRect.width, targetRect.height) || 24;
  const flySize = Math.max(24, startRect.width * 0.6);

  return (
    <AnimatePresence>
      <motion.div
        key="fly-to-cart"
        initial={{
          x: startRect.x + startRect.width / 2 - flySize / 2,
          y: startRect.y + startRect.height / 2 - flySize / 2,
          scale: 1,
          opacity: 1,
          rotate: 0,
        }}
        animate={{
          x: [
            startRect.x + startRect.width / 2 - flySize / 2,
            midX - flySize / 2,
            targetRect.x + targetRect.width / 2 - flySize / 2,
          ],
          y: [
            startRect.y + startRect.height / 2 - flySize / 2,
            controlY,
            targetRect.y + targetRect.height / 2 - flySize / 2,
          ],
          scale: [1, 1.1, 0.3],
          opacity: [1, 1, 0.6],
          rotate: [0, 15, 0],
        }}
        transition={{
          duration: 0.6,
          ease: [0.32, 0.72, 0, 1],
          times: [0, 0.5, 1],
        }}
        onAnimationComplete={handleComplete}
        style={{
          position: 'fixed',
          width: flySize,
          height: flySize,
          zIndex: 9999,
          pointerEvents: 'none',
        }}
      >
        <div
          className="rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 shadow-lg shadow-indigo-500/40 flex items-center justify-center"
          style={{ width: '100%', height: '100%' }}
        >
          <svg
            width={flySize * 0.5}
            height={flySize * 0.5}
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="9" cy="21" r="1" />
            <circle cx="20" cy="21" r="1" />
            <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" />
          </svg>
        </div>
      </motion.div>

      {/* Cart icon bounce on arrival */}
      {flyState === 'arrived' && (
        <motion.div
          initial={{ scale: 1 }}
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          style={{
            position: 'fixed',
            left: targetRect.x,
            top: targetRect.y,
            width: cartIconSize,
            height: cartIconSize,
            zIndex: 9998,
            pointerEvents: 'none',
          }}
        />
      )}
    </AnimatePresence>
  );
}
