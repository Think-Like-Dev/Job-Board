import { useMediaQuery } from "./useMediaQuery";

/**
 * The applications workspace switches between inline side panels on desktop
 * and full-covering sheets on mobile. 861px is the agreed breakpoint, so the
 * Tailwind classes in the workspace must use `min-[861px]:` rather than `lg:`.
 */
export const PANEL_DESKTOP_QUERY = "(min-width: 861px)";

export function useIsDesktopPanel(): boolean {
  return useMediaQuery(PANEL_DESKTOP_QUERY);
}
