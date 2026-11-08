import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useBookmarks } from '@api/hooks/useJobs';
import { JobCard } from '../../LandingPage/components/JobsList';
import { Button } from '@ui/button';
import { Card } from '@ui/card';
import { Skeleton } from '@ui/skeleton';
import type { JobSummary } from '@/types/job.types';

export function BookmarksTab() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: bookmarkedJobs, isLoading, isError, refetch } = useBookmarks();

  if (isLoading) {
    return (
      <div className="mt-6 space-y-4">
        {[1, 2].map((index) => (
          <div key={index} className="h-48 rounded-md border p-6">
            <Skeleton className="mb-4 h-6 w-1/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="mt-2 h-4 w-5/6" />
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <Card className="mt-6 flex flex-col items-center gap-3 p-10 text-center text-muted-foreground">
        <p>{t('applications.bookmarksLoadFailed')}</p>
        <Button variant="outline" size="sm" onClick={() => void refetch()}>
          {t('common.tryAgain')}
        </Button>
      </Card>
    );
  }

  if (!bookmarkedJobs || bookmarkedJobs.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        {t('applications.bookmarksEmpty')}
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      {bookmarkedJobs.map((job: JobSummary) => (
        <JobCard
          key={job.id}
          job={job}
          onSelect={(jobId) => navigate(`/jobs/${jobId}`)}
        />
      ))}
    </div>
  );
}
