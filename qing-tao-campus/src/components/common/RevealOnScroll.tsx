/**
 * RevealOnScroll — 滚动触发展示动画
 *
 * 当元素进入视口时，触发指定的 CSS 动画类。
 * 支持：fade-in-up, fade-in, scale-in, slide-in-left, slide-in-right
 *
 * 用法:
 *   <RevealOnScroll animation="fade-in-up" delay={0.1}>
 *     <div>内容</div>
 *   </RevealOnScroll>
 */
import { useRef, useEffect, useState, type ReactNode } from 'react';

type AnimationType =
  | 'fade-in-up'
  | 'fade-in'
  | 'fade-in-down'
  | 'scale-in'
  | 'slide-in-left'
  | 'slide-in-right';

interface Props {
  children: ReactNode;
  animation?: AnimationType;
  delay?: number; // seconds
  threshold?: number; // 0-1
  className?: string;
  once?: boolean; // 只触发一次
}

const animationMap: Record<AnimationType, string> = {
  'fade-in-up': 'animate-fade-in-up',
  'fade-in': 'animate-fade-in',
  'fade-in-down': 'animate-fade-in-down',
  'scale-in': 'animate-scale-in',
  'slide-in-left': 'animate-fade-in-left',
  'slide-in-right': 'animate-fade-in-right',
};

export function RevealOnScroll({
  children,
  animation = 'fade-in-up',
  delay = 0,
  threshold = 0.1,
  className = '',
  once = true,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          if (once) obs.disconnect();
        } else if (!once) {
          setVisible(false);
        }
      },
      { threshold, rootMargin: '0px 0px -40px 0px' },
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold, once]);

  const animClass = animationMap[animation];

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? undefined : 0,
        animation: visible ? undefined : 'none',
      }}
    >
      <div
        className={visible ? animClass : ''}
        style={{
          animationDelay: visible ? `${delay}s` : undefined,
        }}
      >
        {children}
      </div>
    </div>
  );
}
