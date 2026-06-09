import { useState, useEffect } from 'react';

interface TypewriterTextProps {
  text: string;
  speed?: number;
  delay?: number;
  className?: string;
  cursor?: boolean;
  onComplete?: () => void;
}

export function TypewriterText({ text, speed = 50, delay = 0, className = '', cursor = true, onComplete }: TypewriterTextProps) {
  const [displayed, setDisplayed] = useState('');
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    const cursorInterval = setInterval(() => setShowCursor(v => !v), 530);
    return () => clearInterval(cursorInterval);
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      let i = 0;
      const interval = setInterval(() => {
        if (i >= text.length) {
          clearInterval(interval);
          onComplete?.();
          return;
        }
        setDisplayed(text.slice(0, i + 1));
        i++;
      }, speed);
      return () => clearInterval(interval);
    }, delay);
    return () => clearTimeout(timeout);
  }, [text, speed, delay]);

  return (
    <span className={className}>
      {displayed}
      {cursor && showCursor && (
        <span className="inline-block w-[2px] h-[1em] bg-current ml-0.5 align-middle animate-pulse" />
      )}
    </span>
  );
}
