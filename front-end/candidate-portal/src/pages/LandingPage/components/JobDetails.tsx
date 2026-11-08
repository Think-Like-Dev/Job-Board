import { useState } from 'react';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import {
  Bookmark,
  BookmarkCheck,
  Briefcase,
  CalendarClock,
  DollarSign,
  MapPin,
  Share2,
  Users,
  X,
} from 'lucide-react';
import {
  useBookmarkedJobIds,
  useJobDetails,
  useToggleBookmark,
} from '@api/hooks/useJobs';
import { useApplicationForJob } from '@api/hooks/useApplications';
import { getErrorMessage } from '@utils/errorMessage';
import { toast } from 'sonner';
import { formatCompensation, formatIsoDate } from '@/lib/jobFormat';
import { WorkMode } from '@/types/job.types';
import { ApplicationStatus } from '@/types/application.types';
import type { RootState } from '@store/index';
import { Badge } from '@ui/badge';
import { Button } from '@ui/button';
import { Skeleton } from '@ui/skeleton';
import { cn } from '@/lib/utils';
import { AuthModal } from '@components/auth/AuthModal';
import { ApplyWorkflowModal } from './ApplyWorkflowModal';

const WORK_MODE_KEYS: Record<WorkMode, string> = {
  [WorkMode.ON_SITE]: 'jobs.workMode.onSite',
  [WorkMode.HYBRID]: 'jobs.workMode.hybrid',
  [WorkMode.REMOTE]: 'jobs.workMode.remote',
};

interface JobDetailsProps {
  jobId: string;
  /** Shown only in the mobile drawer; the desktop pane has no close button. */
  onClose?: () => void;
  className?: string;
}

/** Shared job detail UI used by the desktop right pane and the mobile drawer. */
export function JobDetails({ jobId, onClose, className }: JobDetailsProps) {
  const { t } = useTranslation();
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const bookmarkedIds = useBookmarkedJobIds();
  const bookmarkMutation = useToggleBookmark();
  const { data: job, isLoading, isError } = useJobDetails(jobId);
  const { data: application } = useApplicationForJob(
    isAuthenticated ? jobId : undefined,
  );
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);

  const bookmarked = job ? bookmarkedIds.has(job.id) : false;
  const postedAt = job?.publishedAt ?? job?.createdAt;
  const compensation = formatCompensation(job?.compensation);
  const applicationStatus = application?.status;
  const hasApplied = Boolean(
    applicationStatus && applicationStatus !== ApplicationStatus.DRAFT,
  );
  const hasDraft = applicationStatus === ApplicationStatus.DRAFT;

  const handleShare = () => {
    const url = `${window.location.origin}/jobs/${jobId}`;
    void navigator.clipboard.writeText(url);
  };

  const handleBookmark = () => {
    if (!job || !isAuthenticated) return;

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
      onClick={handleBookmark}
      disabled={bookmarkMutation.isPending}
      aria-label={bookmarked ? t('jobs.removeBookmark') : t('jobs.bookmark')}
    >
      {bookmarked ? (
        <BookmarkCheck className="h-6 w-6 fill-primary text-primary" />
      ) : (
        <Bookmark className="h-6 w-6" />
      )}
    </Button>
  );

  if (isError) {
    return (
      <div
        className={cn(
          'flex h-full items-center justify-center p-8 text-center text-muted-foreground',
          className,
        )}
      >
        {t('jobs.loadFailed')}
      </div>
    );
  }

  if (isLoading || !job) {
    return (
      <div className={cn('space-y-4 p-8', className)}>
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="mt-8 h-32 w-full" />
      </div>
    );
  }

  return (
    <div className={cn('flex h-full min-h-0 flex-col', className)}>
      <div className="shrink-0 border-b bg-muted/30 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-2xl font-bold">{job.title}</h2>
            <p className="mt-1 text-lg text-muted-foreground">
              {job.category}
            </p>
          </div>
          <div className="flex shrink-0 gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleShare}
              aria-label={t('jobs.share')}
            >
              <Share2 className="h-5 w-5" />
            </Button>
            {isAuthenticated ? (
              bookmarkButton
            ) : (
              <AuthModal>{bookmarkButton}</AuthModal>
            )}
            {onClose && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                aria-label={t('common.close')}
              >
                <X className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-4">
          <div className="flex items-center gap-1.5 text-sm font-medium">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            {job.location}
          </div>
          {job.yearsOfExperience && (
            <div className="flex items-center gap-1.5 text-sm font-medium">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              {job.yearsOfExperience}
            </div>
          )}
          {compensation && (
            <div className="flex items-center gap-1.5 text-sm font-medium">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              {compensation}
            </div>
          )}
          <div className="flex items-center gap-1.5 text-sm font-medium">
            <Users className="h-4 w-4 text-muted-foreground" />
            {t('jobs.vacancies', { count: job.vacancies })}
          </div>
        </div>

        {(job.workMode.length > 0 || job.workShiftTiming.length > 0) && (
          <div className="mt-4 flex flex-wrap gap-2">
            {job.workMode.map((mode) => (
              <Badge key={mode} variant="secondary">
                {t(WORK_MODE_KEYS[mode])}
              </Badge>
            ))}
            {job.workShiftTiming.map((shift) => (
              <Badge key={shift} variant="secondary">
                {shift}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-6">
        <section>
          <h3 className="mb-2 text-lg font-semibold">
            {t('jobs.description')}
          </h3>
          <p className="whitespace-pre-line text-foreground/80">
            {job.description}
          </p>
        </section>

        {job.responsibilities && (
          <section>
            <h3 className="mb-2 text-lg font-semibold">
              {t('jobs.responsibilities')}
            </h3>
            <p className="whitespace-pre-line text-foreground/80">
              {job.responsibilities}
            </p>
          </section>
        )}

        {job.skills.length > 0 && (
          <section>
            <h3 className="mb-2 text-lg font-semibold">
              {t('jobs.requiredSkills')}
            </h3>
            <div className="flex flex-wrap gap-2">
              {job.skills.map((skill) => (
                <Badge key={skill} variant="secondary">
                  {skill}
                </Badge>
              ))}
            </div>
          </section>
        )}

        {job.benefits && job.benefits.length > 0 && (
          <section>
            <h3 className="mb-2 text-lg font-semibold">{t('jobs.benefits')}</h3>
            <ul className="list-disc space-y-1 pl-5 text-foreground/80">
              {job.benefits.map((benefit) => (
                <li key={benefit}>{benefit}</li>
              ))}
            </ul>
          </section>
        )}

        {job.hiringProcess && job.hiringProcess.length > 0 && (
          <section>
            <h3 className="mb-2 text-lg font-semibold">
              {t('jobs.hiringProcess')}
            </h3>
            <ol className="list-decimal space-y-1 pl-5 text-foreground/80">
              {job.hiringProcess.map((step, index) => (
                <li key={`${step}-${index}`}>{step}</li>
              ))}
            </ol>
          </section>
        )}
      </div>

      <div className="sticky bottom-0 flex shrink-0 items-center justify-between gap-4 border-t bg-background p-6">
        <div className="space-y-1 text-sm text-muted-foreground">
          {postedAt && (
            <div>{t('jobs.postedOn', { date: formatIsoDate(postedAt) })}</div>
          )}
          {job.lastApplicationDate && (
            <div className="flex items-center gap-1.5">
              <CalendarClock className="h-4 w-4" />
              {t('jobs.applyBy', {
                date: formatIsoDate(job.lastApplicationDate),
              })}
            </div>
          )}
        </div>

        {hasApplied ? (
          <Button disabled size="lg" className="w-1/2 px-8 sm:w-auto">
            {t('jobs.applied')}
          </Button>
        ) : isAuthenticated ? (
          <Button
            size="lg"
            className="w-1/2 px-8 sm:w-auto"
            onClick={() => setIsApplyModalOpen(true)}
          >
            {hasDraft ? t('jobs.continueDraft') : t('jobs.applyNow')}
          </Button>
        ) : (
          <AuthModal>
            <Button size="lg" className="w-1/2 px-8 sm:w-auto">
              {t('jobs.applyNow')}
            </Button>
          </AuthModal>
        )}
      </div>

      {isAuthenticated && isApplyModalOpen && (
        <ApplyWorkflowModal
          jobId={jobId}
          isOpen={isApplyModalOpen}
          coverLetterRequired={job.applicationSettings?.coverLetterRequired}
          draft={hasDraft ? application : null}
          onClose={() => setIsApplyModalOpen(false)}
          onApplied={() => setIsApplyModalOpen(false)}
        />
      )}
    </div>
  );
}
