import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ShimmerCard } from '@/components/ui/ShimmerCard';

describe('ShimmerCard', () => {
  it('renders with default props', () => {
    const { container } = render(<ShimmerCard />);
    expect(container.firstElementChild).toBeInTheDocument();
    expect((container.firstElementChild as HTMLElement).className).toContain('rounded-2xl');
  });

  it('renders avatar when avatar=true', () => {
    const { container } = render(<ShimmerCard avatar={true} />);
    // The avatar is a 10x10 rounded-full div
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
    // 1 avatar block (4 lines: avatar circle + 2 text lines) + 5 shimmer lines
    const shimmerLines = container.querySelectorAll('.animate-shimmer');
    // Total shimmer elements = avatar circle + 2 text lines + 5 content lines
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
