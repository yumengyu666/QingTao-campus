import { useRef, useState, useEffect, useCallback, type CSSProperties, type ReactNode } from 'react';

/**
 * VirtualList — lightweight virtual scrolling for 50+ item lists.
 *
 * Only renders items within the visible viewport plus an overscan buffer,
 * replacing thousands of DOM nodes with calculated spacer divs.
 *
 * Props:
 * - items: T[]              — data array
 * - renderItem: (item, index) => ReactNode
 * - itemHeight: number      — fixed height of each item in px
 * - overscan?: number       — extra rows to render above/below viewport (default 5)
 * - className?: string      — outer container class
 * - innerClassName?: string — inner scrollable container class
 * - gap?: number            — gap between items in px (default 0)
 */

interface VirtualListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  itemHeight: number;
  overscan?: number;
  className?: string;
  innerClassName?: string;
  gap?: number;
}

export function VirtualList<T>({
  items,
  renderItem,
  itemHeight,
  overscan = 5,
  className = '',
  innerClassName = '',
  gap = 0,
}: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  const totalHeight = items.length * (itemHeight + gap) - (gap > 0 ? gap : 0);

  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      setScrollTop(containerRef.current.scrollTop);
    }
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    setContainerHeight(el.clientHeight);
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });
    resizeObserver.observe(el);
    return () => resizeObserver.disconnect();
  }, []);

  const startIndex = Math.max(0, Math.floor(scrollTop / (itemHeight + gap)) - overscan);
  const visibleCount = Math.ceil(containerHeight / (itemHeight + gap)) + 2 * overscan;
  const endIndex = Math.min(items.length, startIndex + visibleCount);

  const visibleItems = items.slice(startIndex, endIndex);

  const offsetY = startIndex * (itemHeight + gap);

  const containerStyle: CSSProperties = {
    height: containerHeight > 0 ? containerHeight : undefined,
    overflowY: 'auto',
    overflowX: 'hidden',
    WebkitOverflowScrolling: 'touch',
    contain: 'strict',
  };

  const innerStyle: CSSProperties = {
    position: 'relative',
    height: totalHeight,
    contain: 'layout',
  };

  const itemStyle = (index: number): CSSProperties => ({
    position: 'absolute',
    top: (startIndex + index) * (itemHeight + gap),
    left: 0,
    right: 0,
    height: itemHeight,
  });

  // If few items, just render them all directly
  if (items.length <= 50) {
    return (
      <div className={className} style={{ overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <div className={innerClassName} role="list">
          {items.map((item, index) => (
            <div key={index} style={gap > 0 ? { marginBottom: index < items.length - 1 ? gap : 0 } : undefined}>
              {renderItem(item, index)}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={className}
      style={containerStyle}
      onScroll={handleScroll}
      role="list"
    >
      <div style={innerStyle}>
        {visibleItems.map((item, i) => {
          const actualIndex = startIndex + i;
          return (
            <div key={actualIndex} style={itemStyle(i)} role="listitem">
              {renderItem(item, actualIndex)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
