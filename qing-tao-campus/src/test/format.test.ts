import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatPrice, formatTime, formatDate, formatCount } from '@/utils/format';

describe('formatPrice', () => {
  it('formats price with yen sign', () => {
    expect(formatPrice(100)).toBe('¥100.00');
    expect(formatPrice(0)).toBe('¥0.00');
    expect(formatPrice(9.9)).toBe('¥9.90');
    expect(formatPrice(100.5)).toBe('¥100.50');
  });
});

describe('formatTime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-02T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows "刚刚" for less than 1 minute ago', () => {
    const date = new Date('2026-06-02T11:59:30Z').toISOString();
    expect(formatTime(date)).toBe('刚刚');
  });

  it('shows minutes ago', () => {
    const date = new Date('2026-06-02T11:30:00Z').toISOString();
    expect(formatTime(date)).toBe('30分钟前');
  });

  it('shows hours ago', () => {
    const date = new Date('2026-06-02T08:00:00Z').toISOString();
    expect(formatTime(date)).toBe('4小时前');
  });

  it('shows days ago', () => {
    const date = new Date('2026-05-31T12:00:00Z').toISOString();
    expect(formatTime(date)).toBe('2天前');
  });

  it('shows month-day for over a week', () => {
    const date = new Date('2026-05-20T12:00:00Z').toISOString();
    expect(formatTime(date)).toBe('5月20日');
  });

  it('shows full date for over a year', () => {
    const date = new Date('2025-01-15T12:00:00Z').toISOString();
    expect(formatTime(date)).toBe('2025-1-15');
  });
});

describe('formatDate', () => {
  it('formats date string correctly', () => {
    // formatDate just reformats — test with a fixed string
    const result = formatDate('2026-06-02T14:30:00');
    // Should contain the date parts
    expect(result).toMatch(/2026-06-02/);
    expect(result).toMatch(/\d{2}:\d{2}/);
  });
});

describe('formatCount', () => {
  it('returns string for small numbers', () => {
    expect(formatCount(0)).toBe('0');
    expect(formatCount(99)).toBe('99');
    expect(formatCount(999)).toBe('999');
  });

  it('formats thousands with k', () => {
    expect(formatCount(1000)).toBe('1.0k');
    expect(formatCount(5500)).toBe('5.5k');
  });

  it('formats ten-thousands with w', () => {
    expect(formatCount(10000)).toBe('1.0w');
    expect(formatCount(12345)).toBe('1.2w');
    expect(formatCount(99999)).toBe('10.0w');
  });
});
