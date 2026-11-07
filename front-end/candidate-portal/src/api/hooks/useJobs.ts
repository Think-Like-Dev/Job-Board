import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from './queryKeys';
import { getJobs, getJobDetails } from '../services/job.service';
import type { JobFilters, JobSummary } from '@/types/job.types';
import { useLocalBookmarks } from '@/hooks/useLocalBookmarks';

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

/**
 * UI-only bookmarks. The backend bookmark module is deferred, so this reads
 * and writes local storage instead of calling the reserved bookmark routes.
 */
export function useBookmarks() {
  const { bookmarks } = useLocalBookmarks();
  return { data: bookmarks, isLoading: false };
}

export function useToggleBookmark() {
  const { toggleBookmark } = useLocalBookmarks();
  return { mutate: (job: JobSummary) => toggleBookmark(job), isPending: false };
}
