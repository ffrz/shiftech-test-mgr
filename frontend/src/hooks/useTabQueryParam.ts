import { useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

// Keeps a TabView's active tab in the `tab` query param (by name, not index) so
// switching tabs pushes browser history entries, and links built elsewhere
// (breadcrumbs, notifications) stay valid even if tabs are reordered later.
// Uses a ref to avoid a stale closure when tabNames changes between renders
// (e.g. conditional tabs that appear after async data loads).
export function useTabQueryParam<T extends readonly string[]>(tabNames: T, defaultIndex = 0) {
  const [searchParams, setSearchParams] = useSearchParams();

  const namesRef = useRef(tabNames);
  namesRef.current = tabNames;

  const activeTabIndex = useMemo(() => {
    const raw = searchParams.get('tab');
    const index = raw ? tabNames.indexOf(raw as T[number]) : -1;
    return index >= 0 ? index : defaultIndex;
  }, [searchParams, defaultIndex, tabNames]);

  const setActiveTabIndex = useCallback(
    (index: number) => {
      const names = namesRef.current;
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (index === defaultIndex) {
            next.delete('tab');
          } else {
            next.set('tab', names[index]);
          }
          return next;
        },
        { replace: false },
      );
    },
    [setSearchParams, defaultIndex],
  );

  return [activeTabIndex, setActiveTabIndex] as const;
}
