/**
 * GSAPAnimate — 声明式 GSAP 动画包装组件
 *
 * 用法:
 *   <GSAPAnimate from={{ opacity: 0, y: 30 }} to={{ opacity: 1, y: 0, duration: 0.6 }}>
 *     <div>动画内容</div>
 *   </GSAPAnimate>
 */
import { useRef, useEffect, type ReactNode } from 'react';
import { gsap } from 'gsap';

interface GSAPAnimateProps {
  children: ReactNode;
  from?: gsap.TweenVars;
  to?: gsap.TweenVars;
  scrollTrigger?: boolean;
  className?: string;
  delay?: number;
}

export function GSAPAnimate({
  children,
  from = { opacity: 0, y: 30 },
  to = { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' },
  scrollTrigger = false,
  className = '',
  delay = 0,
}: GSAPAnimateProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      gsap.set(el, { opacity: 1, y: 0 });
      return;
    }

    if (scrollTrigger) {
      const { ScrollTrigger } = require('gsap/ScrollTrigger');
      gsap.registerPlugin(ScrollTrigger);

      gsap.fromTo(el, from, {
        ...to,
        delay,
        scrollTrigger: {
          trigger: el,
          start: 'top 85%',
          toggleActions: 'play none none none',
        },
      });
    } else {
      gsap.fromTo(el, from, { ...to, delay });
    }
  }, [from, to, scrollTrigger, delay]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
