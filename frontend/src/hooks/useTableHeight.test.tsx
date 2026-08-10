// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useTableHeight } from './useTableHeight';
import { DATA_TABLE_SCROLL_HEIGHT } from '../components/ui/dataTablePaginator';

function Harness({ n }: { n: number }) {
  const { containerRef, tableHeight } = useTableHeight({ enabled: true, deps: [n] });
  return <div ref={containerRef} data-testid="tbl">{tableHeight}</div>;
}

// jsdom elements report zero/no rects; attach own measurement methods so the hook
// sees a real layout (top px) the same way a browser would after paint.
function patchRect(el: HTMLElement, top: number) {
  const rect = { width: 100, height: 100, top, bottom: top + 100, left: 0, right: 100, x: 0, y: top, toJSON: () => ({}) } as DOMRect;
  Object.defineProperty(el, 'getClientRects', { configurable: true, value: () => [rect] as unknown as DOMRectList });
  Object.defineProperty(el, 'getBoundingClientRect', { configurable: true, value: () => rect });
}

describe('useTableHeight', () => {
  it('keeps the static fallback height when disabled (desktop defaults)', () => {
    function HarnessDisabled() {
      const { containerRef, tableHeight } = useTableHeight({ enabled: false });
      return <div ref={containerRef} data-testid="tbl">{tableHeight}</div>;
    }
    render(<HarnessDisabled />);
    expect(screen.getByTestId('tbl').textContent).toBe(DATA_TABLE_SCROLL_HEIGHT);
  });

  it('fills the remaining viewport when enabled', () => {
    Object.defineProperty(window, 'innerHeight', { configurable: true, writable: true, value: 800 });
    const { rerender } = render(<Harness n={0} />);
    // No rects on first pass -> falls back (hidden/inactive tab).
    expect(screen.getByTestId('tbl').textContent).toBe(DATA_TABLE_SCROLL_HEIGHT);

    // Now the node is laid out; force a re-measure via a deps change.
    patchRect(screen.getByTestId('tbl'), 50);
    rerender(<Harness n={1} />);
    // 800 - 50 (top) - 100 (default bottom reserve) = 650
    expect(screen.getByTestId('tbl').textContent).toBe('650px');
  });

  it('shrinks to the remaining space instead of the desktop clamp when the detail card + filters leave little room', () => {
    Object.defineProperty(window, 'innerHeight', { configurable: true, writable: true, value: 800 });
    const { rerender } = render(<Harness n={0} />);
    // Expanded detail + filter opened: the table's top is pushed far down.
    patchRect(screen.getByTestId('tbl'), 720);
    rerender(<Harness n={1} />);
    // 800 - 720 - 100 = -20 -> clamped to 0, NOT the ~60vh desktop clamp (which is
    // taller than the leftover space and would overflow the page).
    expect(screen.getByTestId('tbl').textContent).toBe('0px');
  });

  it('skips hidden nodes (no client rects) and keeps the fallback', () => {
    render(<Harness n={0} />);
    expect(screen.getByTestId('tbl').textContent).toBe(DATA_TABLE_SCROLL_HEIGHT);
  });
});