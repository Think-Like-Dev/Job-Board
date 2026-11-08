import { useTranslation } from 'react-i18next';
import { Sheet, SheetContent, SheetTitle } from '@ui/sheet';
import { JobDetails } from './JobDetails';

interface JobDetailsDrawerProps {
  jobId: string;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Mobile-only drawer. The desktop layout renders `JobDetails` directly in the
 * right pane, so both views share the same detail component.
 */
export function JobDetailsDrawer({
  jobId,
  isOpen,
  onClose,
}: JobDetailsDrawerProps) {
  const { t } = useTranslation();

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="left"
        showCloseButton={false}
        className="gap-0 p-0 data-[side=left]:min-w-full"
      >
        <SheetTitle className="sr-only">{t('jobs.details')}</SheetTitle>
        {jobId ? <JobDetails jobId={jobId} onClose={onClose} /> : null}
      </SheetContent>
    </Sheet>
  );
}
