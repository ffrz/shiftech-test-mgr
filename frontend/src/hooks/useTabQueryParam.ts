import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

// Keeps a TabView's active tab in the `tab` query param so switching tabs
// pushes browser history entries, letting the Back button move between tabs.
export function useTabQueryParam(defaultIndex = 0) {
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTabIndex = useMemo(() => {
    const raw = Number(searchParams.get('tab'));
    return Number.isInteger(raw) && raw >= 0 ? raw : defaultIndex;
  }, [searchParams, defaultIndex]);

  const setActiveTabIndex = useCallback(
    (index: number) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (index === defaultIndex) {
            next.delete('tab');
          } else {
            next.set('tab', String(index));
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
