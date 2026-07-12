import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@api/apiClient';
import { API_ENDPOINTS } from '@api/endpoints.config';
import { JobCard } from '../../LandingPage/components/JobsList';
import { Skeleton } from '@ui/skeleton';

export function BookmarksTab() {
  const { data: jobs, isLoading } = useQuery({
    queryKey: ['jobs'],
    queryFn: async () => {
      const res = await apiClient.get(API_ENDPOINTS.JOBS.GET_ALL);
      return res as any[];
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-4 mt-6">
        {[1, 2].map((i) => (
          <div key={i} className="border rounded-md p-6 h-48">
            <Skeleton className="h-6 w-1/3 mb-4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6 mt-2" />
          </div>
        ))}
      </div>
    );
  }

  const bookmarkedJobs = jobs?.filter(job => job.isBookmarked) || [];

  if (bookmarkedJobs.length === 0) {
    return <div className="text-center py-12 text-muted-foreground">No bookmarked jobs found.</div>;
  }

  return (
    <div className="mt-6 space-y-4">
      {bookmarkedJobs.map((job) => (
        <JobCard key={job.id} job={job} />
      ))}
    </div>
  );
}
