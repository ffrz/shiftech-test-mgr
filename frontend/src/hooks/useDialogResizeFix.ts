import { useEffect } from 'react';

// Workaround for a PrimeReact 10.x Dialog bug: on first mount, the dialog can render
// centered incorrectly (or effectively invisible) until something forces the browser to
// recompute layout — toggling DevTools' device toolbar (which fires a resize event) makes
// it snap into place. Rather than patching every individual Dialog usage across the app,
// watch for any `.p-dialog-mask` node being added to the DOM and dispatch a synthetic
// resize event right after, so PrimeReact's own centering logic re-runs on its own.
export function useDialogResizeFix() {
  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (!(node instanceof HTMLElement)) continue;
          if (node.classList.contains('p-dialog-mask') || node.querySelector?.('.p-dialog-mask')) {
            // Two rAF ticks so this fires after PrimeReact's own enter-transition measurement.
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                window.dispatchEvent(new Event('resize'));
              });
            });
            return;
          }
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);
}
