import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ShimmerCard } from '@/components/ui/ShimmerCard';

describe('ShimmerCard', () => {
  it('renders with default props', () => {
    const { container } = render(<ShimmerCard />);
    expect(container.firstElementChild).toBeInTheDocument();
    expect((container.firstElementChild as HTMLElement).className).toContain('lg-card');
  });

  it('renders avatar when avatar=true', () => {
    const { container } = render(<ShimmerCard avatar={true} />);
    // The avatar is a 10x10 rounded-full lg-skeleton div
    const avatarEl = container.querySelector('.w-10.h-10.rounded-full');
    expect(avatarEl).toBeInTheDocument();
  });

  it('does not render avatar when avatar=false', () => {
    const { container } = render(<ShimmerCard avatar={false} />);
    const avatarEl = container.querySelector('.w-10.h-10.rounded-full');
    expect(avatarEl).not.toBeInTheDocument();
  });

  it('renders correct number of shimmer lines', () => {
    const { container } = render(<ShimmerCard lines={5} />);
    // Uses lg-skeleton class for shimmer elements (avatar circle + 2 text + 5 content lines)
    const shimmerLines = container.querySelectorAll('.lg-skeleton');
    expect(shimmerLines.length).toBeGreaterThanOrEqual(5);
  });

  it('applies custom className', () => {
    const { container } = render(<ShimmerCard className="test-class" />);
    expect((container.firstElementChild as HTMLElement).className).toContain('test-class');
  });

  it('renders without crashing with zero lines', () => {
    const { container } = render(<ShimmerCard lines={0} avatar={false} />);
    expect(container.firstElementChild).toBeInTheDocument();
  });
});
