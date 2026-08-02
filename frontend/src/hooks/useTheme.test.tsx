// @vitest-environment jsdom
import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, beforeEach } from 'vitest';
import { ThemeProvider, useThemeContext } from './useTheme';

beforeEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove('dark');
});

function renderTheme() {
  return renderHook(() => useThemeContext(), { wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider> });
}

describe('useThemeContext', () => {
  it('defaults to system mode', () => {
    const { result } = renderTheme();
    expect(result.current.mode).toBe('system');
  });

  it('restores a stored mode from localStorage', () => {
    localStorage.setItem('theme-mode.v1', 'dark');
    const { result } = renderTheme();
    expect(result.current.mode).toBe('dark');
    expect(result.current.resolvedMode).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('setMode persists to localStorage and applies the theme class', () => {
    const { result } = renderTheme();
    act(() => result.current.setMode('dark'));
    expect(localStorage.getItem('theme-mode.v1')).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(result.current.resolvedMode).toBe('dark');
  });

  it('setMode back to light removes the dark class', () => {
    localStorage.setItem('theme-mode.v1', 'dark');
    const { result } = renderTheme();
    act(() => result.current.setMode('light'));
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(result.current.resolvedMode).toBe('light');
  });

  it('rejects unknown stored values and falls back to system', () => {
    localStorage.setItem('theme-mode.v1', 'neon');
    const { result } = renderTheme();
    expect(result.current.mode).toBe('system');
  });
});
