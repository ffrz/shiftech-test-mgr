import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

// Keeps a TabView's active tab in the `tab` query param (by name, not index) so
// switching tabs pushes browser history entries, and links built elsewhere
// (breadcrumbs, notifications) stay valid even if tabs are reordered later.
export function useTabQueryParam<T extends readonly string[]>(tabNames: T, defaultIndex = 0) {
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTabIndex = useMemo(() => {
    const raw = searchParams.get('tab');
    const index = raw ? tabNames.indexOf(raw as T[number]) : -1;
    return index >= 0 ? index : defaultIndex;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, defaultIndex]);

  const setActiveTabIndex = useCallback(
    (index: number) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (index === defaultIndex) {
            next.delete('tab');
          } else {
            next.set('tab', tabNames[index]);
          }
          return next;
        },
        { replace: false },
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setSearchParams, defaultIndex],
  );

  return [activeTabIndex, setActiveTabIndex] as const;
}
