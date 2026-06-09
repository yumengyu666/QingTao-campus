import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import { LazyImage } from '@/components/common/LazyImage';

class MockIntersectionObserver {
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
  constructor(_cb: IntersectionObserverCallback, _opts?: IntersectionObserverInit) {}
}

describe('LazyImage', () => {
  beforeEach(() => {
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
  });

  it('renders placeholder div', () => {
    const { container } = render(
      <LazyImage src="/test.jpg" alt="test image" />,
    );
    expect(container.firstElementChild).toBeInTheDocument();
    expect((container.firstElementChild as HTMLElement).tagName).toBe('DIV');
  });

  it('sets background color on placeholder', () => {
    const { container } = render(
      <LazyImage src="/test.jpg" alt="test" placeholderColor="#ff0000" />,
    );
    const div = container.firstElementChild as HTMLElement;
    expect(div.style.backgroundColor).toBe('rgb(255, 0, 0)');
  });

  it('renders with custom className', () => {
    const { container } = render(
      <LazyImage src="/test.jpg" alt="test" className="my-image" />,
    );
    expect((container.firstElementChild as HTMLElement).className).toContain('my-image');
  });

  it('renders with width and height when provided', () => {
    const { container } = render(
      <LazyImage src="/test.jpg" alt="test" width={200} height={150} />,
    );
    const div = container.firstElementChild as HTMLElement;
    expect(div.style.width).toBe('200px');
    expect(div.style.height).toBe('150px');
  });

  it('observes intersection', () => {
    let observed = false;
    const TestObserver = class {
      observe = () => { observed = true; };
      disconnect = vi.fn();
      unobserve = vi.fn();
      constructor(_cb: unknown, _opts?: unknown) {}
    };
    vi.stubGlobal('IntersectionObserver', TestObserver);

    render(<LazyImage src="/test.jpg" alt="test" />);
    expect(observed).toBe(true);
  });
});
