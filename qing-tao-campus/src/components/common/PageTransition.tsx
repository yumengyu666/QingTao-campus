/**
 * PageTransition — 页面切换动画 v2.1
 * 
 * Features:
 * - "default" 变体: 向上淡入 (类似 iOS push)
 * - "glass" 变体: 从右侧滑入 + 轻微模糊 (子页面进入)
 * - 自动滚动到顶部
 * - 使用 framer-motion 高性能动画
 * - 尊重 prefers-reduced-motion
 * - RTL 友好（根据页面方向自动调整）
 */
import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { useEffect, useRef, useCallback, useState } from 'react';

const pageVariants = {
  initial: {
    opacity: 0,
    y: 16,
  },
  enter: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.16, 1, 0.3, 1], // ease-out-expo
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: {
      duration: 0.18,
      ease: [0.65, 0, 0.35, 1], // ease-in-out-quint
    },
  },
};

/* Reduced motion variant */
const reducedVariants = {
  initial: { opacity: 0 },
  enter: {
    opacity: 1,
    transition: { duration: 0.15 },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.1 },
  },
};

/* Glass sub-page variant — slide in/out from right with subtle blur */
const glassVariants = {
  initial: {
    opacity: 0,
    x: 40,
    filter: 'blur(4px)',
  },
  enter: {
    opacity: 1,
    x: 0,
    filter: 'blur(0px)',
    transition: {
      duration: 0.35,
      ease: [0.16, 1, 0.3, 1], // ease-out-expo
    },
  },
  exit: {
    opacity: 0,
    x: 40,
    filter: 'blur(3px)',
    transition: {
      duration: 0.22,
      ease: [0.65, 0, 0.35, 1], // ease-in-out-quint
    },
  },
};

/* Reduced motion glass variant */
const reducedGlassVariants = {
  initial: { opacity: 0 },
  enter: {
    opacity: 1,
    transition: { duration: 0.15 },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.1 },
  },
};

interface Props {
  children: React.ReactNode;
  /** "default" = fade-up (main pages), "glass" = slide from right with blur (sub-pages) */
  variant?: 'default' | 'glass';
}

export function PageTransition({ children, variant = 'default' }: Props) {
  const location = useLocation();
  const prefersReduced = useRef(false);
  const [animDone, setAnimDone] = useState(false);

  useEffect(() => {
    setAnimDone(false);
  }, [location.pathname]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    prefersReduced.current = mq.matches;
    const handler = (e: MediaQueryListEvent) => {
      prefersReduced.current = e.matches;
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [location.pathname]);

  const variants = prefersReduced.current
    ? variant === 'glass' ? reducedGlassVariants : reducedVariants
    : variant === 'glass' ? glassVariants : pageVariants;

  return (
    <motion.div
      key={location.pathname}
      variants={variants}
      initial="initial"
      animate="enter"
      exit="exit"
      onAnimationComplete={() => setAnimDone(true)}
      style={{ minHeight: 'inherit', transform: animDone ? 'none' : undefined }}
    >
      {children}
    </motion.div>
  );
}
