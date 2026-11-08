import { useMutation, useQuery } from "@tanstack/react-query";

import type { JobApplicationsFilters } from "@/types/application.types";
import {
  getAllJobApplicationIds,
  getJobApplication,
  getJobApplications,
} from "../services/applications.service";
import { QUERY_KEYS } from "./queryKeys";

/** Paginated candidate list for one job. */
export function useGetJobApplications(
  jobId: string,
  filters: JobApplicationsFilters,
) {
  return useQuery({
    queryKey: QUERY_KEYS.APPLICATIONS.LIST(jobId, filters),
    queryFn: () => getJobApplications(jobId, filters),
    enabled: Boolean(jobId),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

/** Full candidate application used by the detail drawer. */
export function useGetJobApplication(id: string | null) {
  return useQuery({
    queryKey: QUERY_KEYS.APPLICATIONS.DETAIL(id ?? ""),
    queryFn: () => getJobApplication(id as string),
    enabled: Boolean(id),
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export interface SelectAllFilteredVariables {
  jobId: string;
  filters: Pick<JobApplicationsFilters, "search" | "status">;
}

/** Resolves every application id matching the active filters. */
export function useSelectAllFilteredApplications() {
  return useMutation({
    mutationFn: ({ jobId, filters }: SelectAllFilteredVariables) =>
      getAllJobApplicationIds(jobId, filters),
  });
}
