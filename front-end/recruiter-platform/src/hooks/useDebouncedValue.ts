import { useEffect, useState } from "react";

/**
 * Returns a value that only updates after `delayMs` of stability. Used by the
 * job search so the API is called only after the user stops typing.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
