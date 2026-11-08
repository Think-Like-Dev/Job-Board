import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { QUERY_KEYS } from './queryKeys';
import {
  addBookmark,
  getBookmarks,
  getJobs,
  getJobDetails,
  removeBookmark,
} from '../services/job.service';
import type { JobFilters, JobSummary } from '@/types/job.types';
import type { RootState } from '@store/index';

export function useJobsList(filters: JobFilters) {
  return useQuery({
    queryKey: QUERY_KEYS.JOBS.LIST(filters),
    queryFn: () => getJobs(filters),
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
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

/** The candidate's saved jobs, shared by the landing page and Saved Jobs tab. */
export function useBookmarks() {
  const isAuthenticated = useSelector(
    (state: RootState) => state.auth.isAuthenticated,
  );

  return useQuery({
    queryKey: QUERY_KEYS.JOBS.BOOKMARKS,
    queryFn: getBookmarks,
    enabled: isAuthenticated,
    staleTime: 2 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });
}

/** Id lookup used by job cards and the detail pane. */
export function useBookmarkedJobIds(): Set<string> {
  const { data } = useBookmarks();

  return useMemo(
    () => new Set((data ?? []).map((job) => job.id)),
    [data],
  );
}

interface ToggleBookmarkVariables {
  job: JobSummary;
  isBookmarked: boolean;
}

/**
 * Saves/removes a bookmark with an optimistic cache update so the icon and the
 * Saved Jobs list react immediately. The server response is the source of
 * truth, so the query is invalidated on settle.
 */
export function useToggleBookmark() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ job, isBookmarked }: ToggleBookmarkVariables) =>
      isBookmarked ? removeBookmark(job.id) : addBookmark(job.id),
    onMutate: async ({ job, isBookmarked }) => {
      await queryClient.cancelQueries({
        queryKey: QUERY_KEYS.JOBS.BOOKMARKS,
      });

      const previous = queryClient.getQueryData<JobSummary[]>(
        QUERY_KEYS.JOBS.BOOKMARKS,
      );

      queryClient.setQueryData<JobSummary[]>(
        QUERY_KEYS.JOBS.BOOKMARKS,
        (current = []) =>
          isBookmarked
            ? current.filter((item) => item.id !== job.id)
            : [job, ...current.filter((item) => item.id !== job.id)],
      );

      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          QUERY_KEYS.JOBS.BOOKMARKS,
          context.previous,
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.JOBS.BOOKMARKS,
      });
    },
  });
}
