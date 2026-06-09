import { useEffect, useRef, useState } from 'react';

interface AnimatedCounterProps {
  from?: number;
  to: number;
  duration?: number;
  suffix?: string;
  prefix?: string;
  className?: string;
}

export function AnimatedCounter({ from = 0, to, duration = 1000, suffix = '', prefix = '', className = '' }: AnimatedCounterProps) {
  const [count, setCount] = useState(from);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const startTime = performance.now();
    const range = to - from;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(from + range * eased));

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };

    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [from, to, duration]);

  return (
    <span className={`tabular-nums font-mono ${className}`}>
      {prefix}{count.toLocaleString()}{suffix}
    </span>
  );
}
