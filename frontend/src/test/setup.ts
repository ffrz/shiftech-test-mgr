import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// vitest doesn't run with `globals: true`, so @testing-library/react cannot
// auto-register its own cleanup. Do it here so component/hook tests that render
// into the jsdom document are isolated from each other.
afterEach(() => {
  cleanup();
});

// jsdom ships no matchMedia implementation; useTheme (and any component relying
// on prefers-color-scheme) needs one. Default to light / no change listener.
// Only applies in jsdom environments — node-environment suites (helpers/services)
// have no `window` at all.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
}

