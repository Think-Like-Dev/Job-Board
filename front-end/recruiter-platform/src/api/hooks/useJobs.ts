import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { JobFilters, UpdateJobRequest } from "../schemas/jobs.schema";
import {
  getJobs,
  getJobById,
  patchJob,
  updateJob,
} from "../services/jobs.service";
import { QUERY_KEYS } from "./queryKeys";
import type { JobStatus } from "@/types/job.types";

export function useGetJobs(filters: JobFilters) {
  return useQuery({
    queryKey: QUERY_KEYS.JOBS.LIST(filters),
    queryFn: () => getJobs(filters),
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });
}

export function useGetJobById(id: number) {
  return useQuery({
    queryKey: QUERY_KEYS.JOBS.DETAIL(id),
    queryFn: () => getJobById(id),
    enabled: !!id,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

export function usePatchJobStatus(id: number, status: JobStatus) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["patch", QUERY_KEYS.JOBS.DETAIL(id)],
    mutationFn: () => patchJob(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.JOBS.ALL });
    },
  });
}

export function useUpdateJob(id: number, payload: UpdateJobRequest) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["update", QUERY_KEYS.JOBS.DETAIL(id)],
    mutationFn: () => updateJob(id, payload),
    onSuccess: (updatedJob) => {
      queryClient.setQueryData(QUERY_KEYS.JOBS.DETAIL(id), updatedJob);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.JOBS.ALL });
    },
  });
}
