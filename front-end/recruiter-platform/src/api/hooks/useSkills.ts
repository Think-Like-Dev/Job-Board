import { useQuery } from "@tanstack/react-query";

import { searchSkills } from "../services/skills.service";
import { QUERY_KEYS } from "./queryKeys";

/** Canonical skill autocomplete. Waits for at least two characters. */
export function useSearchSkills(term: string) {
  const trimmed = term.trim();

  return useQuery({
    queryKey: QUERY_KEYS.SKILLS.SEARCH(trimmed),
    queryFn: () => searchSkills(trimmed),
    enabled: trimmed.length >= 2,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
