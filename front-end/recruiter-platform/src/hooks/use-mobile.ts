import { useMediaQuery } from "./useMediaQuery";

const MOBILE_BREAKPOINT = 768;

/**
 * True below the desktop breakpoint. Kept as its own hook because the
 * sidebar and the candidate panels share the same cutoff.
 */
export function useIsMobile() {
  return useMediaQuery(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
}
