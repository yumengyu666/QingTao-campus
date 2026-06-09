import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PulseDot } from '@/components/ui/PulseDot';

describe('PulseDot', () => {
  it('renders with default props', () => {
    const { container } = render(<PulseDot />);
    const spans = container.querySelectorAll('span');
    expect(spans.length).toBeGreaterThan(0);
  });

  it('renders green color by default', () => {
    render(<PulseDot />);
    const dot = document.querySelector('.bg-emerald-500');
    expect(dot).toBeInTheDocument();
  });

  it('renders red color when specified', () => {
    render(<PulseDot color="red" />);
    const dot = document.querySelector('.bg-rose-500');
    expect(dot).toBeInTheDocument();
  });

  it('renders yellow color when specified', () => {
    render(<PulseDot color="yellow" />);
    const dot = document.querySelector('.bg-amber-500');
    expect(dot).toBeInTheDocument();
  });

  it('renders gray color when specified', () => {
    render(<PulseDot color="gray" />);
    const dot = document.querySelector('.bg-gray-400');
    expect(dot).toBeInTheDocument();
  });

  it('renders without pulse animation when pulse=false', () => {
    render(<PulseDot pulse={false} />);
    const pulseSpan = document.querySelector('.animate-ping');
    expect(pulseSpan).not.toBeInTheDocument();
  });

  it('renders with pulse animation by default', () => {
    render(<PulseDot />);
    const pulseSpan = document.querySelector('.animate-ping');
    expect(pulseSpan).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<PulseDot className="custom-class" />);
    const outer = container.firstElementChild as HTMLElement;
    expect(outer.className).toContain('custom-class');
  });

  it('renders different sizes', () => {
    const { container: sm } = render(<PulseDot size="sm" />);
    expect(sm.querySelector('.w-2.h-2')).toBeInTheDocument();

    const { container: md } = render(<PulseDot size="md" />);
    expect(md.querySelector('.w-3.h-3')).toBeInTheDocument();

    const { container: lg } = render(<PulseDot size="lg" />);
    expect(lg.querySelector('.w-4.h-4')).toBeInTheDocument();
  });
});
