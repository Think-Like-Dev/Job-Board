import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { QUERY_KEYS } from './queryKeys';
import { getJobs, getJobDetails, toggleBookmark } from '../services/job.service';
import type { Job, JobFilters } from '@/types/job.types';

export function useJobsList(filters: JobFilters) {
  return useQuery({
    queryKey: QUERY_KEYS.JOBS.LIST(filters),
    queryFn: () => getJobs(filters),
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

export function useJobDetails(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.JOBS.DETAIL(id),
    queryFn: () => getJobDetails(id),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    enabled: !!id,
  });
}

export function useBookmarks() {
  return useQuery({
    queryKey: QUERY_KEYS.JOBS.BOOKMARKS,
    queryFn: async () => {
      const jobs = await getJobs({});
      return jobs.filter((job) => job.isBookmarked);
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });
}

export function useToggleBookmark() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (jobId: string) => toggleBookmark(jobId),
    onMutate: async (jobId) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.JOBS.ALL });
      const previousJob = queryClient.getQueryData<Job>(QUERY_KEYS.JOBS.DETAIL(jobId));
      queryClient.setQueryData<Job>(QUERY_KEYS.JOBS.DETAIL(jobId), (old) => {
        if (!old) return old;
        return { ...old, isBookmarked: !old.isBookmarked };
      });
      return { previousJob, jobId };
    },
    onError: (_err, _newJob, context) => {
      if (context?.previousJob) {
        queryClient.setQueryData(QUERY_KEYS.JOBS.DETAIL(context.jobId), context.previousJob);
      }
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.JOBS.ALL });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.JOBS.DETAIL(variables) });
    },
  });
}
