import { useCallback, useEffect, useRef, useState } from 'react';
import { DATA_TABLE_SCROLL_HEIGHT } from '../components/ui/dataTablePaginator';

// Space reserved below the table so rows and the paginator stay reachable without
// scrolling the page itself: the DataTable shell (header row + internal paginator)
// plus the layout-main bottom padding. Tuned to the app's dense `size="small"` tables.
const DEFAULT_BOTTOM_RESERVE = 100;

type UseTableHeightOptions = {
  /** State that changes the vertical space above the table — detail section collapsed/
   * expanded, filter toolbar toggled, tab switched, bulk bar shown, ... — triggers a re-measure. */
  deps?: ReadonlyArray<unknown>;
  /** When false the hook keeps `fallbackHeight` untouched — pass the mobile flag so
   * desktop keeps the existing fixed scrollHeight and only small screens fill the viewport. */
  enabled?: boolean;
  /** Extra px reserved below the table (the shell's header + paginator + page padding). */
  bottomReserve?: number;
  /** Initial/fallback value rendered before the first successful measure. */
  fallbackHeight?: string;
};

/**
 * Reusable full-height table sizing — the React counterpart of amanah-pos'
 * `useTableHeight` composable. Attach `containerRef` to a wrapper around a
 * PrimeReact DataTable and pass `tableHeight` to its `scrollHeight` so the body
 * always fills the remaining viewport (no page-level scroll needed to reach rows
 * or the paginator). Re-measures on first render, on window resize, and whenever
 * any value in `deps` changes.
 */
export function useTableHeight({
  deps = [],
  enabled = true,
  bottomReserve = DEFAULT_BOTTOM_RESERVE,
  fallbackHeight = DATA_TABLE_SCROLL_HEIGHT,
}: UseTableHeightOptions = {}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tableHeight, setTableHeight] = useState(fallbackHeight);

  const measure = useCallback(() => {
    if (!enabled) {
      setTableHeight(fallbackHeight);
      return;
    }
    const el = containerRef.current;
    // Hidden nodes (PrimeReact TabView keeps inactive panels mounted as
    // display:none) report no client rects — skip and keep the fallback value.
    if (!el || el.getClientRects().length === 0) return;
    const top = el.getBoundingClientRect().top;
    if (!Number.isFinite(top)) return;
    // Always fill exactly the remaining viewport. On mobile the detail card +
    // filter toolbar together can leave far less than the desktop's
    // `clamp(20rem, 60vh, 42rem)` height below the table; the fallback clamp is
    // taller than what's actually left there, so it would overflow the page and
    // bring back a page-level scrollbar. Fitting the remaining space instead
    // keeps the table bottom (and its paginator) reachable without page scroll.
    const px = Math.max(0, Math.floor(window.innerHeight - top - bottomReserve));
    setTableHeight(`${px}px`);
  }, [enabled, bottomReserve, fallbackHeight]);

  useEffect(() => {
    measure();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [measure, ...deps]);

  useEffect(() => {
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure]);

  return { containerRef, tableHeight };
}