import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  CreateJobRequest,
  JobFilters,
  UpdateJobRequest,
} from "../schemas/jobs.schema";
import {
  createJob,
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

export function useGetJobById(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.JOBS.DETAIL(id),
    queryFn: () => getJobById(id),
    enabled: !!id,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

export function useCreateJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["create", QUERY_KEYS.JOBS.ALL],
    mutationFn: (payload: CreateJobRequest) => createJob(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.JOBS.ALL });
    },
  });
}

export function usePatchJobStatus(id: string, status: JobStatus) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["patch", QUERY_KEYS.JOBS.DETAIL(id)],
    mutationFn: () => patchJob(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.JOBS.ALL });
    },
  });
}

export function useUpdateJob(id: string, payload: UpdateJobRequest) {
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
