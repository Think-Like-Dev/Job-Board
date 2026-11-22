import { useCallback, useSyncExternalStore } from "react";

/**
 * Subscribes to a CSS media query and reports whether it currently matches.
 *
 * The browser is the external store, so no state has to be written from an
 * effect: the first paint reads `matches` synchronously, and every change is
 * delivered by the media query's `change` event.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const mediaQuery = window.matchMedia(query);
      mediaQuery.addEventListener("change", onStoreChange);
      return () => mediaQuery.removeEventListener("change", onStoreChange);
    },
    [query],
  );

  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query]);

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
