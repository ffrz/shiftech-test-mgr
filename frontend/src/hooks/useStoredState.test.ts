// @vitest-environment jsdom
import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { useStoredState } from './useStoredState';

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

describe('useStoredState', () => {
  it('initializes from localStorage when a matching value exists', () => {
    localStorage.setItem('k1', JSON.stringify({ a: 1 }));
    const { result } = renderHook(() => useStoredState<{ a: number }>('k1', { a: 0 }));
    expect(result.current[0]).toEqual({ a: 1 });
  });

  it('falls back to defaultValue when nothing is stored', () => {
    const { result } = renderHook(() => useStoredState<string>('k2', 'default'));
    expect(result.current[0]).toBe('default');
  });

  it('falls back to defaultValue when the stored value has the wrong shape', () => {
    localStorage.setItem('k3', JSON.stringify({ a: 1 }));
    const { result } = renderHook(() => useStoredState<string>('k3', 'default'));
    expect(result.current[0]).toBe('default');
  });

  it('falls back to defaultValue when the stored value is invalid JSON', () => {
    localStorage.setItem('k4', 'not-json{{{');
    const { result } = renderHook(() => useStoredState<string>('k4', 'default'));
    expect(result.current[0]).toBe('default');
  });

  it('persists a new value to localStorage', () => {
    const { result } = renderHook(() => useStoredState<string>('k5', 'old'));
    act(() => result.current[1]('new'));
    expect(result.current[0]).toBe('new');
    expect(JSON.parse(localStorage.getItem('k5')!)).toBe('new');
  });

  it('supports functional updates against the previous state', () => {
    const { result } = renderHook(() => useStoredState<number>('k6', 0));
    act(() => result.current[1]((prev) => prev + 1));
    act(() => result.current[1]((prev) => prev + 1));
    expect(result.current[0]).toBe(2);
    expect(JSON.parse(localStorage.getItem('k6')!)).toBe(2);
  });
});
