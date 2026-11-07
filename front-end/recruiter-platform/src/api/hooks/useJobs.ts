import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  CreateJobRequest,
  JobFilters,
  PatchJobRequest,
  UpdateJobRequest,
} from "../schemas/jobs.schema";
import {
  createJob,
  deleteJob,
  getArchivePreview,
  getJobs,
  getJobById,
  patchJob,
  updateJob,
} from "../services/jobs.service";
import { QUERY_KEYS } from "./queryKeys";

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

export interface PatchJobVariables extends PatchJobRequest {
  id: string;
}

export function usePatchJobStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["patch", QUERY_KEYS.JOBS.ALL],
    mutationFn: ({ id, ...payload }: PatchJobVariables) =>
      patchJob(id, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.JOBS.ALL });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.JOBS.DETAIL(variables.id),
      });
    },
  });
}

export function useArchivePreview() {
  return useMutation({
    mutationKey: ["archive-preview", QUERY_KEYS.JOBS.ALL],
    mutationFn: (id: string) => getArchivePreview(id),
  });
}

export function useDeleteJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["delete", QUERY_KEYS.JOBS.ALL],
    mutationFn: (id: string) => deleteJob(id),
    onSuccess: () => {
      // The drawer closes itself; only the list needs refreshing. Refetching
      // the deleted detail here would flash an error during the close.
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.JOBS.LISTS });
    },
  });
}

export interface UpdateJobVariables {
  id: string;
  payload: UpdateJobRequest;
}

export function useUpdateJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["update", QUERY_KEYS.JOBS.ALL],
    mutationFn: ({ id, payload }: UpdateJobVariables) =>
      updateJob(id, payload),
    onSuccess: (updatedJob, variables) => {
      queryClient.setQueryData(
        QUERY_KEYS.JOBS.DETAIL(variables.id),
        updatedJob,
      );
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.JOBS.ALL });
    },
  });
}
