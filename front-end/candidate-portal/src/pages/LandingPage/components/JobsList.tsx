import {
  Bookmark,
  BookmarkCheck,
  Briefcase,
  ChevronLeftIcon,
  ChevronRightIcon,
  Clock,
  MapPin,
  Share2,
} from 'lucide-react';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useBookmarkedJobIds, useToggleBookmark } from '@api/hooks/useJobs';
import { getErrorMessage } from '@utils/errorMessage';
import type { JobSummary } from '@/types/job.types';
import { EmploymentType } from '@/types/job.types';
import { ApplicationStatus } from '@/types/application.types';
import type { RootState } from '@store/index';
import { AuthModal } from '@components/auth/AuthModal';
import { Card } from '@ui/card';
import { Button } from '@ui/button';
import { Badge } from '@ui/badge';
import { Skeleton } from '@ui/skeleton';
import { formatCompensation, formatIsoDate } from '@/lib/jobFormat';
import { cn } from '@/lib/utils';

const EMPLOYMENT_LABEL_KEYS: Record<EmploymentType, string> = {
  [EmploymentType.FULL_TIME]: 'jobs.employmentType.fullTime',
  [EmploymentType.PART_TIME]: 'jobs.employmentType.partTime',
  [EmploymentType.CONTRACT]: 'jobs.employmentType.contract',
  [EmploymentType.INTERN]: 'jobs.employmentType.intern',
};

interface JobCardProps {
  job: JobSummary;
  isSelected?: boolean;
  onSelect?: (jobId: string) => void;
  applicationStatus?: ApplicationStatus;
}

export function JobCard({
  job,
  isSelected = false,
  onSelect,
  applicationStatus,
}: JobCardProps) {
  const { t } = useTranslation();
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const bookmarkedIds = useBookmarkedJobIds();
  const bookmarkMutation = useToggleBookmark();
  const bookmarked = bookmarkedIds.has(job.id);
  const compensation = formatCompensation(job.compensation);
  const postedAt = job.publishedAt ?? job.createdAt;
  const applied =
    applicationStatus !== undefined &&
    applicationStatus !== ApplicationStatus.DRAFT;
  const draft = applicationStatus === ApplicationStatus.DRAFT;

  const handleShare = (event: React.MouseEvent) => {
    event.stopPropagation();
    const url = `${window.location.origin}/jobs/${job.id}`;
    void navigator.clipboard.writeText(url);
  };

  const handleBookmark = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (!isAuthenticated) return;

    bookmarkMutation.mutate(
      { job, isBookmarked: bookmarked },
      {
        onError: (error) => {
          toast.error(getErrorMessage(error, t('jobs.bookmarkFailed')));
        },
      },
    );
  };

  const bookmarkButton = (
    <Button
      variant="ghost"
      size="icon"
      className="rounded-full text-muted-foreground hover:text-primary"
      onClick={handleBookmark}
      disabled={bookmarkMutation.isPending}
      aria-label={bookmarked ? t('jobs.removeBookmark') : t('jobs.bookmark')}
    >
      {bookmarked ? (
        <BookmarkCheck className="h-5 w-5 fill-primary text-primary" />
      ) : (
        <Bookmark className="h-5 w-5" />
      )}
    </Button>
  );

  return (
    <Card
      onClick={() => onSelect?.(job.id)}
      className={cn(
        'group cursor-pointer gap-3 p-5 transition-shadow hover:shadow-md max-h-55',
        isSelected && 'border-primary bg-primary/5 ring-2 ring-primary',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold transition-colors group-hover:text-primary truncate">
            {job.title}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">{job.category}</p>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full text-muted-foreground hover:text-foreground"
            onClick={handleShare}
            aria-label={t('jobs.share')}
          >
            <Share2 className="h-4 w-4" />
          </Button>
          {isAuthenticated ? (
            bookmarkButton
          ) : (
            <AuthModal>{bookmarkButton}</AuthModal>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <MapPin className="h-4 w-4" />
          {job.location}
        </div>
        {job.yearsOfExperience && (
          <div className="flex items-center gap-1.5">
            <Briefcase className="h-4 w-4" />
            {job.yearsOfExperience}
          </div>
        )}
        {compensation && (
          <div className="flex items-center gap-1.5">
            {compensation}
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <Clock className="h-4 w-4" />
          {formatIsoDate(postedAt)}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary">
          {t(EMPLOYMENT_LABEL_KEYS[job.employmentType])}
        </Badge>
        {job.keywords.slice(0, 3).map((keyword) => (
          <Badge key={keyword} variant="secondary">
            {keyword}
          </Badge>
        ))}
        {applied && <Badge variant="outline">{t('jobs.applied')}</Badge>}
        {draft && <Badge variant="outline">{t('jobs.draft')}</Badge>}
      </div>
    </Card>
  );
}

interface JobsListProps {
  jobs: JobSummary[];
  isLoading: boolean;
  isError?: boolean;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  selectedJobId?: string;
  onSelect: (jobId: string) => void;
  applicationStatusByJobId?: Map<string, ApplicationStatus>;
}

export function JobsList({
  jobs,
  isLoading,
  isError = false,
  currentPage,
  totalPages,
  onPageChange,
  selectedJobId,
  onSelect,
  applicationStatusByJobId,
}: JobsListProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((index) => (
          <Card key={index} className="gap-3 p-5">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
            <div className="flex gap-4 pt-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16" />
            </div>
            <Skeleton className="mt-2 h-12 w-full" />
          </Card>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <Card className="p-10 text-center text-muted-foreground">
        {t('jobs.loadFailed')}
      </Card>
    );
  }

  if (!jobs.length) {
    return (
      <Card className="p-10 text-center text-muted-foreground">
        {t('jobs.empty')}
      </Card>
    );
  }

  return (
    <div className="space-y-4 p-1">
      {jobs.map((job) => (
        <JobCard
          key={job.id}
          job={job}
          isSelected={job.id === selectedJobId}
          onSelect={onSelect}
          applicationStatus={applicationStatusByJobId?.get(job.id)}
        />
      ))}

      <div className="sticky bottom-0 flex items-center justify-between gap-2 border-t bg-background/95 py-3 backdrop-blur">
        <p className="text-sm text-muted-foreground">
          {t('jobs.pageOf', { page: currentPage, total: totalPages })}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
          >
            <ChevronLeftIcon />
            {t('jobs.previous')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(currentPage + 1)}
          >
            {t('jobs.next')}
            <ChevronRightIcon />
          </Button>
        </div>
      </div>
    </div>
  );
}
