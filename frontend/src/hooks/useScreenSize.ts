import { useEffect, useState } from 'react';

const SM_BREAKPOINT = 600;

interface ScreenSize {
  lt: { sm: boolean };
}

export function useScreenSize(): ScreenSize {
  const [ltSm, setLtSm] = useState(() => window.innerWidth < SM_BREAKPOINT);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${SM_BREAKPOINT - 1}px)`);
    function handler(e: MediaQueryListEvent) { setLtSm(e.matches); }
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return { lt: { sm: ltSm } };
}
