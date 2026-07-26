import { useState, useCallback, useEffect, useRef } from 'react';

function readFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const stored = localStorage.getItem(key);
    if (stored !== null) {
      return JSON.parse(stored) as T;
    }
  } catch {
    // ignore
  }
  return defaultValue;
}

export function useStoredState<T>(key: string, defaultValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  const keyRef = useRef(key);

  const [state, setState] = useState<T>(() => readFromStorage(key, defaultValue));

  useEffect(() => {
    if (keyRef.current !== key) {
      keyRef.current = key;
      setState(readFromStorage(key, defaultValue));
    }
  }, [key, defaultValue]);

  const setStoredState = useCallback(
    (value: T | ((prev: T) => T)) => {
      setState((prev) => {
        const next = typeof value === 'function' ? (value as (prev: T) => T)(prev) : value;
        try {
          localStorage.setItem(key, JSON.stringify(next));
        } catch {
          // ignore
        }
        return next;
      });
    },
    [key],
  );

  return [state, setStoredState];
}
