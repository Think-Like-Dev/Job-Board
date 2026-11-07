import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from '../../../components/ui/sheet';
import { Button } from '../../../components/ui/button';
import {
  Bookmark,
  BookmarkCheck,
  Briefcase,
  CalendarClock,
  DollarSign,
  MapPin,
  Share2,
  Users,
} from 'lucide-react';
import { useJobDetails } from '@api/hooks/useJobs';
import { ApplyWorkflowModal } from './ApplyWorkflowModal';
import { Skeleton } from '@ui/skeleton';
import { Badge } from '@ui/badge';
import { useSelector } from 'react-redux';
import type { RootState } from '@store/index';
import { AuthModal } from '@components/auth/AuthModal';
import { useLocalBookmarks } from '@/hooks/useLocalBookmarks';
import { formatCompensation, formatIsoDate } from '@/lib/jobFormat';
import { WorkMode } from '@/types/job.types';

const WORK_MODE_LABELS: Record<WorkMode, string> = {
  [WorkMode.ON_SITE]: 'On-site',
  [WorkMode.HYBRID]: 'Hybrid',
  [WorkMode.REMOTE]: 'Remote',
};

interface JobDetailsDrawerProps {
  jobId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function JobDetailsDrawer({
  jobId,
  isOpen,
  onClose,
}: JobDetailsDrawerProps) {
  const navigate = useNavigate();
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const { isBookmarked, toggleBookmark } = useLocalBookmarks();

  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [hasApplied, setHasApplied] = useState(false); // Simulated until applications exist

  const { data: job, isLoading } = useJobDetails(jobId);
  const bookmarked = job ? isBookmarked(job.id) : false;

  const handleClose = () => {
    navigate('/');
    onClose();
  };

  const handleShare = () => {
    const url = `${window.location.origin}/jobs/${jobId}`;
    void navigator.clipboard.writeText(url);
  };

  const postedAt = job?.publishedAt ?? job?.createdAt;
  const compensation = formatCompensation(job?.compensation);

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-xl overflow-y-auto p-0"
        >
          {isLoading || !job ? (
            <div className="p-8 space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-32 w-full mt-8" />
            </div>
          ) : (
            <div className="flex flex-col h-full">
              <div className="p-6 border-b shrink-0 bg-muted/30">
                <div className="flex justify-between items-start gap-4">
                  <div className="min-w-0">
                    <SheetTitle className="text-2xl font-bold">
                      {job.title}
                    </SheetTitle>
                    <p className="text-muted-foreground mt-1 text-lg">
                      {job.category}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleShare}
                      aria-label="Share job"
                    >
                      <Share2 className="w-5 h-5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleBookmark(job)}
                      aria-label={
                        bookmarked ? 'Remove bookmark' : 'Bookmark job'
                      }
                    >
                      {bookmarked ? (
                        <BookmarkCheck className="w-6 h-6 fill-primary text-primary" />
                      ) : (
                        <Bookmark className="w-6 h-6" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 mt-6">
                  <div className="flex items-center gap-1.5 text-sm font-medium">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    {job.location}
                  </div>
                  {job.yearsOfExperience && (
                    <div className="flex items-center gap-1.5 text-sm font-medium">
                      <Briefcase className="w-4 h-4 text-muted-foreground" />
                      {job.yearsOfExperience}
                    </div>
                  )}
                  {compensation && (
                    <div className="flex items-center gap-1.5 text-sm font-medium">
                      <DollarSign className="w-4 h-4 text-muted-foreground" />
                      {compensation}
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-sm font-medium">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    {job.vacancies} vacancy{job.vacancies === 1 ? '' : 's'}
                  </div>
                </div>

                {(job.workMode.length > 0 || job.workShiftTiming.length > 0) && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {job.workMode.map((mode) => (
                      <Badge key={mode} variant="secondary">
                        {WORK_MODE_LABELS[mode]}
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

              <div className="p-6 flex-1 space-y-6">
                <section>
                  <h3 className="text-lg font-semibold mb-2">
                    Job Description
                  </h3>
                  <p className="whitespace-pre-line text-foreground/80">
                    {job.description}
                  </p>
                </section>

                {job.responsibilities && (
                  <section>
                    <h3 className="text-lg font-semibold mb-2">
                      Responsibilities
                    </h3>
                    <p className="whitespace-pre-line text-foreground/80">
                      {job.responsibilities}
                    </p>
                  </section>
                )}

                {job.skills.length > 0 && (
                  <section>
                    <h3 className="text-lg font-semibold mb-2">
                      Required Skills
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
                    <h3 className="text-lg font-semibold mb-2">Benefits</h3>
                    <ul className="list-disc pl-5 space-y-1 text-foreground/80">
                      {job.benefits.map((benefit) => (
                        <li key={benefit}>{benefit}</li>
                      ))}
                    </ul>
                  </section>
                )}

                {job.hiringProcess && job.hiringProcess.length > 0 && (
                  <section>
                    <h3 className="text-lg font-semibold mb-2">
                      Hiring Process
                    </h3>
                    <ol className="list-decimal pl-5 space-y-1 text-foreground/80">
                      {job.hiringProcess.map((step, index) => (
                        <li key={`${step}-${index}`}>{step}</li>
                      ))}
                    </ol>
                  </section>
                )}
              </div>

              <div className="p-6 border-t shrink-0 bg-background sticky bottom-0 flex gap-4 items-center justify-between">
                <div className="text-sm text-muted-foreground space-y-1">
                  {postedAt && <div>Posted {formatIsoDate(postedAt)}</div>}
                  {job.lastApplicationDate && (
                    <div className="flex items-center gap-1.5">
                      <CalendarClock className="w-4 h-4" />
                      Apply by {formatIsoDate(job.lastApplicationDate)}
                    </div>
                  )}
                </div>

                {hasApplied ? (
                  <Button disabled size="lg" className="px-8 w-full sm:w-auto">
                    Applied
                  </Button>
                ) : isAuthenticated ? (
                  <Button
                    size="lg"
                    className="px-8 w-full sm:w-auto"
                    onClick={() => setIsApplyModalOpen(true)}
                  >
                    Apply Now
                  </Button>
                ) : (
                  <AuthModal>
                    <Button size="lg" className="px-8 w-full sm:w-auto">
                      Apply Now
                    </Button>
                  </AuthModal>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {isAuthenticated && jobId && (
        <ApplyWorkflowModal
          jobId={jobId}
          isOpen={isApplyModalOpen}
          onClose={() => setIsApplyModalOpen(false)}
          onApplied={() => {
            setHasApplied(true);
            setIsApplyModalOpen(false);
          }}
        />
      )}
    </>
  );
}
