import { useBookmarks } from '@api/hooks/useJobs';
import { JobCard } from '../../LandingPage/components/JobsList';
import { Skeleton } from '@ui/skeleton';
import type { Job } from '@/types/job.types';

export function BookmarksTab() {
  const { data: bookmarkedJobs, isLoading } = useBookmarks();

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

  if (!bookmarkedJobs || bookmarkedJobs.length === 0) {
    return <div className="text-center py-12 text-muted-foreground">No bookmarked jobs found.</div>;
  }

  return (
    <div className="mt-6 space-y-4">
      {bookmarkedJobs.map((job: Job) => (
        <JobCard key={job.id} job={job} />
      ))}
    </div>
  );
}
