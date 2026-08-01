// @vitest-environment jsdom
import { render, screen, cleanup } from '@testing-library/react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { RelativeTime } from '../../components/ui/RelativeTime';

vi.mock('../../helpers/dateFormatter', () => ({
  formatDate: vi.fn((iso: string) => `[date]${iso}`),
  formatDateTime: vi.fn((iso: string) => `[datetime]${iso}`),
  formatRelativeTime: vi.fn((iso: string) => `[relative]${iso}`),
}));

afterEach(() => {
  cleanup();
});

const ONE_MIN_AGO = new Date(Date.now() - 60 * 1000).toISOString();

describe('RelativeTime', () => {
  it('renders relative time within maxDays', () => {
    render(<RelativeTime value={ONE_MIN_AGO} maxDays={999} />);
    expect(screen.getByText(`[relative]${ONE_MIN_AGO}`)).toBeInTheDocument();
  });

  it('renders absolute date when age >= maxDays', () => {
    const oldDate = '2025-01-01T00:00:00Z';
    render(<RelativeTime value={oldDate} />);
    expect(screen.getByText(`[date]${oldDate}`)).toBeInTheDocument();
  });

  it('renders with maxDays=0 (always relative)', () => {
    render(<RelativeTime value={ONE_MIN_AGO} maxDays={0} />);
    expect(screen.getByText(`[relative]${ONE_MIN_AGO}`)).toBeInTheDocument();
  });

  it('renders with prefix', () => {
    render(<RelativeTime value={ONE_MIN_AGO} maxDays={999} prefix="Updated " />);
    expect(screen.getByText(`Updated [relative]${ONE_MIN_AGO}`)).toBeInTheDocument();
  });

  it('renders tooltip with full datetime', () => {
    const { container } = render(<RelativeTime value={ONE_MIN_AGO} />);
    const span = container.querySelector('span[data-pr-tooltip]');
    expect(span?.getAttribute('data-pr-tooltip')).toBe(`[datetime]${ONE_MIN_AGO}`);
  });

  it('applies className', () => {
    const { container } = render(<RelativeTime value={ONE_MIN_AGO} className="my-custom" />);
    expect(container.querySelector('.my-custom')).toBeTruthy();
  });

  it('generates unique id for each instance', () => {
    const { container } = render(
      <>
        <RelativeTime value={ONE_MIN_AGO} />
        <RelativeTime value={new Date(Date.now() - 120 * 1000).toISOString()} />
      </>,
    );
    const spans = container.querySelectorAll('span[data-pr-tooltip]');
    expect(spans).toHaveLength(2);
    expect(spans[0].id).not.toBe(spans[1].id);
  });
});
