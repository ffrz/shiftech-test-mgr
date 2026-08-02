// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RelativeTime } from './RelativeTime';

const NOW = new Date('2026-08-01T12:00:00Z').getTime();

afterEach(() => {
  vi.useRealTimers();
});

describe('RelativeTime', () => {
  it('renders relative text for recent values', () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    const iso = new Date(NOW - 5 * 60 * 1000).toISOString();
    render(<RelativeTime value={iso} />);
    expect(screen.getByText('5 minutes ago')).toBeInTheDocument();
  });

  it('falls back to an absolute date beyond maxDays', () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    const iso = new Date(NOW - 30 * 24 * 60 * 60 * 1000).toISOString();
    render(<RelativeTime value={iso} />);
    expect(screen.getByText(/\d{2} \w{3} \d{4}/)).toBeInTheDocument();
  });

  it('renders relative text with maxDays=0 for older values', () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    const iso = new Date(NOW - 10 * 24 * 60 * 60 * 1000).toISOString();
    render(<RelativeTime value={iso} maxDays={0} />);
    expect(screen.getByText(/last week|1 week ago|10 days ago|2 weeks ago/)).toBeInTheDocument();
  });

  it('prefixes the display text', () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    const iso = new Date(NOW - 60 * 1000).toISOString();
    render(<RelativeTime value={iso} prefix="Updated " />);
    expect(screen.getByText(/Updated 1 minute ago/)).toBeInTheDocument();
  });

  it('always exposes the exact datetime in the tooltip data attribute', () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    const iso = new Date(NOW - 60 * 1000).toISOString();
    const { container } = render(<RelativeTime value={iso} />);
    const span = container.querySelector('.relative-time');
    expect(span).toHaveAttribute('data-pr-tooltip', expect.stringContaining('2026'));
  });
});
