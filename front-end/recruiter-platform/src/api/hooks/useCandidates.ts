import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  CandidateApplicationFilters,
  CandidateFilters,
} from "../schemas/candidates.schema";
import {
  createCandidate,
  getCandidate,
  getCandidateApplications,
  getCandidates,
} from "../services/candidates.service";
import { QUERY_KEYS } from "./queryKeys";

export function useGetCandidates(filters: CandidateFilters) {
  return useQuery({
    queryKey: QUERY_KEYS.CANDIDATES.LIST(filters),
    queryFn: () => getCandidates(filters),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useGetCandidate(id: string | null) {
  return useQuery({
    queryKey: QUERY_KEYS.CANDIDATES.DETAIL(id ?? ""),
    queryFn: () => getCandidate(id as string),
    enabled: Boolean(id),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useGetCandidateApplications(
  id: string,
  filters: CandidateApplicationFilters,
) {
  return useQuery({
    queryKey: QUERY_KEYS.CANDIDATES.APPLICATIONS(id, filters),
    queryFn: () => getCandidateApplications(id, filters),
    enabled: Boolean(id),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useCreateCandidate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["candidates", "create"],
    mutationFn: (payload: FormData) => createCandidate(payload),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CANDIDATES.LISTS });
      queryClient.setQueryData(
        QUERY_KEYS.CANDIDATES.DETAIL(response.data.id),
        response,
      );
    },
  });
}
