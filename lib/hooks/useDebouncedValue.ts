'use client';

import { useEffect, useState } from 'react';

/** Returns `value` only after it stopped changing for `delay` ms (use for search boxes). */
export function useDebouncedValue<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
