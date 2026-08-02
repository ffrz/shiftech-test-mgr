// @vitest-environment jsdom
import { renderHook, act } from '@testing-library/react';
import { MemoryRouter, useSearchParams } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { useTabQueryParam } from './useTabQueryParam';

const TABS = ['plans', 'cases', 'issues'] as const;

// Probe reads searchParams from the SAME router instance so the test can assert
// what was actually written to the URL (a second renderHook gets its own router).
function Probe({ children }: { children: (url: URLSearchParams) => void }) {
  const [params] = useSearchParams();
  return <>{children(params)}</>;
}

function renderTabParam(initialEntry?: string) {
  const probeResult: { params: URLSearchParams | null } = { params: null };
  const utils = renderHook(() => useTabQueryParam(TABS, 0), {
    wrapper: ({ children }) => (
      <MemoryRouter initialEntries={[initialEntry ?? '/']}>
        {children}
        <Probe>{(params) => { probeResult.params = params; return null; }}</Probe>
      </MemoryRouter>
    ),
  });
  return { ...utils, getParams: () => probeResult.params };
}

describe('useTabQueryParam', () => {
  it('returns the default index when no tab query param is present', () => {
    const { result } = renderTabParam();
    expect(result.current[0]).toBe(0);
  });

  it('reads the active tab from the query param', () => {
    const { result } = renderTabParam('/?tab=cases');
    expect(result.current[0]).toBe(1);
  });

  it('falls back to default when the query param does not match any tab name', () => {
    const { result } = renderTabParam('/?tab=unknown');
    expect(result.current[0]).toBe(0);
  });

  it('writes the tab name into the query param', () => {
    const { result, getParams } = renderTabParam();
    act(() => result.current[1](2));
    expect(result.current[0]).toBe(2);
    expect(getParams()!.get('tab')).toBe('issues');
  });

  it('removes the query param when setting the default index', () => {
    const { result, getParams } = renderTabParam('/?tab=issues');
    act(() => result.current[1](0));
    expect(result.current[0]).toBe(0);
    expect(getParams()!.get('tab')).toBeNull();
  });
});
