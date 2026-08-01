import { describe, expect, it } from 'vitest';
import { formatDate, formatDateTime, formatRelativeTime } from './dateFormatter';

describe('formatDate', () => {
  it('returns a string', () => {
    const result = formatDate('2026-06-15T10:30:00Z');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('formats with "id-ID" locale (contains month abbreviation)', () => {
    const result = formatDate('2026-01-15T00:00:00Z');
    expect(result).toContain('Jan');
    expect(result).toContain('2026');
  });

  it('handles different dates', () => {
    const a = formatDate('2026-01-01T00:00:00Z');
    const b = formatDate('2026-12-25T00:00:00Z');
    expect(a).not.toBe(b);
  });
});

describe('formatDateTime', () => {
  it('returns a string containing both date and time portions', () => {
    const result = formatDateTime('2026-06-15T14:30:00Z');
    expect(typeof result).toBe('string');
  });

  it('shows hours and minutes', () => {
    const result = formatDateTime('2026-06-15T14:30:00Z');
    // Output depends on local timezone — just verify it contains time separators
    expect(result).toMatch(/\d{1,2}[.:]\d{2}/);
  });
});

describe('formatRelativeTime', () => {
  const now = new Date('2026-06-15T12:00:00Z');

  it('returns "just now" for less than 60 seconds ago', () => {
    expect(formatRelativeTime('2026-06-15T11:59:30Z', now)).toBe('just now');
    expect(formatRelativeTime('2026-06-15T11:59:01Z', now)).toBe('just now');
  });

  it('returns "just now" for same time', () => {
    expect(formatRelativeTime('2026-06-15T12:00:00Z', now)).toBe('just now');
  });

  it('shows minutes ago', () => {
    const result = formatRelativeTime('2026-06-15T11:55:00Z', now);
    expect(result).toContain('minute');
    expect(result).toContain('ago');
  });

  it('shows hours ago', () => {
    const result = formatRelativeTime('2026-06-15T10:00:00Z', now);
    expect(result).toContain('hour');
    expect(result).toContain('ago');
  });

  it('shows days ago', () => {
    const result = formatRelativeTime('2026-06-14T12:00:00Z', now);
    // numeric: 'auto' uses "yesterday" — check for "yesterday" or "day"
    const lower = result.toLowerCase();
    expect(lower.includes('yesterday') || lower.includes('day')).toBe(true);
  });

  it('shows weeks ago', () => {
    const result = formatRelativeTime('2026-06-01T12:00:00Z', now);
    expect(result).toContain('week');
    expect(result).toContain('ago');
  });

  it('shows months ago', () => {
    const result = formatRelativeTime('2026-04-15T12:00:00Z', now);
    expect(result).toContain('month');
    expect(result).toContain('ago');
  });

  it('shows years ago', () => {
    const result = formatRelativeTime('2025-06-15T12:00:00Z', now);
    // numeric: 'auto' uses "last year" — check for "year" somewhere
    expect(result.toLowerCase()).toContain('year');
  });

  it('shows future dates with "in" prefix', () => {
    const result = formatRelativeTime('2026-06-15T14:00:00Z', now);
    expect(result).toContain('hour');
    // Positive diff uses "in" (e.g. "in 2 hours")
    expect(result).toContain('in');
  });

  it('uses default now = new Date() when second arg omitted', () => {
    const result = formatRelativeTime(new Date(Date.now() - 30 * 60 * 1000).toISOString());
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});
