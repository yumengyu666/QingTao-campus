/**
 * LazyImage — 懒加载 + 占位 + 渐进式加载
 *
 * Features:
 * - IntersectionObserver 懒加载 (200px rootMargin)
 * - Shimmer placeholder (使用 skeleton 类)
 * - 渐进式 opacity 过渡
 * - 错误回退 + alt 文本
 * - 宽高比锁定防止布局偏移
 * - srcset 支持
 */
import { useState, useRef, useEffect } from 'react';

interface LazyImageProps {
  src: string;
  alt?: string;
  className?: string;
  width?: number;
  height?: number;
  aspectRatio?: string; // e.g. "4/3" or "1/1"
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  fallbackSrc?: string;
  onLoad?: () => void;
  onError?: () => void;
}

export function LazyImage({
  src,
  alt = '',
  className = '',
  width,
  height,
  aspectRatio,
  objectFit = 'cover',
  placeholderColor,
  fallbackSrc = '/logo.png',
  onLoad,
  onError,
}: LazyImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [inView, setInView] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(src);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentSrc(src);
    setLoaded(false);
    setError(false);
  }, [src]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { rootMargin: '200px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const handleLoad = () => {
    setLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    if (currentSrc !== fallbackSrc && fallbackSrc) {
      setCurrentSrc(fallbackSrc);
    } else {
      setError(true);
      onError?.();
    }
  };

  const containerStyle: React.CSSProperties = {
    width,
    height,
    aspectRatio,
    backgroundColor: placeholderColor || undefined,
  };

  return (
    <div
      ref={ref}
      className={`relative overflow-hidden ${className}`}
      style={containerStyle}
      role="img"
      aria-label={alt || undefined}
    >
      {/* Shimmer placeholder */}
      {!loaded && !error && (
        <div className="absolute inset-0 skeleton rounded-none" />
      )}

      {/* Error fallback */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center img-placeholder text-gray-400 dark:text-gray-600">
          <svg className="w-8 h-8 mb-1 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
          </svg>
          <span className="text-xs">图片加载失败</span>
        </div>
      )}

      {/* Actual image */}
      {inView && !error && (
        <img
          src={currentSrc}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          className={`w-full h-full transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          style={{ objectFit }}
          loading="lazy"
          decoding="async"
        />
      )}
    </div>
  );
}
