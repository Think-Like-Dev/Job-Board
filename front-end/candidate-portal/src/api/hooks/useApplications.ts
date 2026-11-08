import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from './queryKeys';
import {
  applyForJob,
  deleteApplication,
  getApplicationDetails,
  getApplications,
  withdrawApplication,
} from '../services/application.service';
import type {
  ApplicationQueryParams,
  ApplyPayload,
} from '@/types/application.types';

export function useApplications(
  params: ApplicationQueryParams = {},
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: QUERY_KEYS.APPLICATIONS.MY(params),
    queryFn: () => getApplications(params),
    enabled: options.enabled ?? true,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

/**
 * The candidate's application for one job, used by the job detail pane to
 * decide between Apply Now, Continue Draft, and Applied.
 */
export function useApplicationForJob(jobId?: string) {
  return useQuery({
    queryKey: QUERY_KEYS.APPLICATIONS.JOB(jobId ?? ''),
    queryFn: () => getApplications({ jobId, limit: 1 }),
    enabled: Boolean(jobId),
    select: (response) => response.data[0] ?? null,
    staleTime: 60 * 1000,
  });
}

export function useApplicationDetails(id?: string) {
  return useQuery({
    queryKey: QUERY_KEYS.APPLICATIONS.DETAIL(id ?? ''),
    queryFn: () => getApplicationDetails(id as string),
    enabled: Boolean(id),
  });
}

export function useApplyForJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ jobId, payload }: { jobId: string; payload: ApplyPayload }) =>
      applyForJob(jobId, payload),
    onSuccess: (_result, variables) => {
      // Covers the list, per-job probe, and detail queries.
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.APPLICATIONS.ALL });
      // Applying can replace the central resume/cover letter.
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PROFILE.ME });
      // The job card/statistics may change after applying.
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.JOBS.ALL });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.JOBS.DETAIL(variables.jobId),
      });
    },
  });
}

export function useWithdrawApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      withdrawApplication(id, reason),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.APPLICATIONS.ALL });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.APPLICATIONS.DETAIL(variables.id),
      });
    },
  });
}

export function useDeleteDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteApplication(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.APPLICATIONS.ALL });
    },
  });
}

