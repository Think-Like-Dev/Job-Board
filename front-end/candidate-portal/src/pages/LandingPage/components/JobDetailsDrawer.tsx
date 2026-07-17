import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sheet, SheetContent, SheetTitle } from '../../../components/ui/sheet';
import { Button } from '../../../components/ui/button';
import { Bookmark, BookmarkCheck, MapPin, Briefcase, DollarSign, Share2 } from 'lucide-react';
import { useJobDetails, useToggleBookmark } from '@api/hooks/useJobs';
import { ApplyWorkflowModal } from './ApplyWorkflowModal';
import { Skeleton } from '@ui/skeleton';
import { useSelector } from 'react-redux';
import type { RootState } from '@store/index';
import { AuthModal } from '@components/auth/AuthModal';

interface JobDetailsDrawerProps {
  jobId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function JobDetailsDrawer({ jobId, isOpen, onClose }: JobDetailsDrawerProps) {
  const navigate = useNavigate();
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [hasApplied, setHasApplied] = useState(false); // Simulate application state

  const { data: job, isLoading } = useJobDetails(jobId);

  const toggleBookmark = useToggleBookmark();

  const handleClose = () => {
    navigate('/');
    onClose();
  };

  const handleShare = () => {
    const url = `${window.location.origin}/jobs/${jobId}`;
    navigator.clipboard.writeText(url);
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto p-0">
          {isLoading || !job ? (
            <div className="p-8 space-y-4">
               <Skeleton className="h-8 w-3/4" />
               <Skeleton className="h-4 w-1/2" />
               <Skeleton className="h-32 w-full mt-8" />
            </div>
          ) : (
            <div className="flex flex-col h-full">
              <div className="p-6 border-b shrink-0 bg-muted/30">
                <div className="flex justify-between items-start">
                  <div>
                    <SheetTitle className="text-2xl font-bold">{job.title}</SheetTitle>
                    <p className="text-muted-foreground mt-1 text-lg">{job.category}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={handleShare}>
                      <Share2 className="w-5 h-5" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => toggleBookmark.mutate(jobId)}>
                      {job?.isBookmarked ? (
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
                  <div className="flex items-center gap-1.5 text-sm font-medium">
                    <Briefcase className="w-4 h-4 text-muted-foreground" />
                    {job.experience}
                  </div>
                  <div className="flex items-center gap-1.5 text-sm font-medium">
                    <DollarSign className="w-4 h-4 text-muted-foreground" />
                    {job.salaryRange}
                  </div>
                </div>
              </div>

              <div className="p-6 flex-1">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <h3 className="text-lg font-semibold mb-2">Job Description</h3>
                  <p>{job.description}</p>
                  
                  <h4 className="font-semibold mt-6 mb-2">Responsibilities</h4>
                  <ul>
                    <li>Build scalable and maintainable frontend applications.</li>
                    <li>Collaborate with cross-functional teams.</li>
                    <li>Participate in code reviews and architecture discussions.</li>
                  </ul>
                </div>
              </div>

              <div className="p-6 border-t shrink-0 bg-background sticky bottom-0 flex gap-4 items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Posted {new Date(job.postedAt).toLocaleDateString()}
                </div>
                
                {hasApplied ? (
                  <Button disabled size="lg" className="px-8 w-full sm:w-auto">
                    Applied
                  </Button>
                ) : isAuthenticated ? (
                  <Button size="lg" className="px-8 w-full sm:w-auto" onClick={() => setIsApplyModalOpen(true)}>
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
