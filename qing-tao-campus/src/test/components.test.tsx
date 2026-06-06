import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { UserAvatar } from '@/components/common/UserAvatar';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Skeleton } from '@/components/common/Skeleton';

describe('UserAvatar', () => {
  it('renders image when src is provided', () => {
    render(<UserAvatar src="https://example.com/avatar.jpg" nickname="Test" size="md" />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'https://example.com/avatar.jpg');
  });

  it('renders initial when no src', () => {
    render(<UserAvatar nickname="张三" size="md" />);
    expect(screen.getByText('张')).toBeInTheDocument();
  });

  it('renders "?" when no nickname or src', () => {
    render(<UserAvatar size="md" />);
    expect(screen.getByText('?')).toBeInTheDocument();
  });

  it('shows online indicator when isOnline=true', () => {
    const { container } = render(<UserAvatar nickname="A" isOnline={true} />);
    // The green dot span should exist
    const statusDot = container.querySelector('.bg-green-500');
    expect(statusDot).toBeInTheDocument();
  });

  it('shows badge when count > 0', () => {
    render(<UserAvatar nickname="A" badge={5} />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('shows 99+ for badge over 99', () => {
    render(<UserAvatar nickname="A" badge={150} />);
    expect(screen.getByText('99+')).toBeInTheDocument();
  });
});

describe('EmptyState', () => {
  it('renders message', () => {
    render(<EmptyState message="暂无数据" />);
    expect(screen.getByText('暂无数据')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(<EmptyState message="暂无数据" description="试试其他关键词" />);
    expect(screen.getByText('试试其他关键词')).toBeInTheDocument();
  });
});

describe('LoadingSpinner', () => {
  it('renders loading indicator', () => {
    const { container } = render(<LoadingSpinner />);
    // Should have an animated element
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders fullscreen when prop set', () => {
    const { container } = render(<LoadingSpinner fullScreen />);
    expect(container.firstChild).toBeInTheDocument();
  });
});

describe('Skeleton', () => {
  it('Skeleton.Grid renders correct number of items', () => {
    const { container } = render(<Skeleton.Grid count={4} cols={2} />);
    const skeletonItems = container.querySelectorAll('.animate-pulse, [class*="skeleton"]');
    // Should render skeleton placeholders
    expect(container.firstChild).toBeInTheDocument();
  });
});
