import { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { useJobsList } from '@api/hooks/useJobs';
import { useApplications } from '@api/hooks/useApplications';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import type { RootState } from '@store/index';
import type { JobFilters } from '@/types/job.types';
import { ApplicationStatus } from '@/types/application.types';
import { Card } from '@ui/card';
import { JobsList } from './JobsList';
import { JobDetails } from './JobDetails';
import { JobDetailsDrawer } from './JobDetailsDrawer';

interface JobBrowserProps {
  filters: JobFilters;
  initialJobId?: string;
  onPageChange: (page: number) => void;
}

/**
 * Glassdoor-style browsing surface: two independently scrollable panes on
 * desktop, list + left drawer on mobile. The detail UI is shared.
 */
export function JobBrowser({
  filters,
  initialJobId,
  onPageChange,
}: JobBrowserProps) {
  const { t } = useTranslation();
  const isDesktop = useMediaQuery('(min-width: 861px)');
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const { data, isLoading, isError } = useJobsList(filters);

  const jobs = data?.data ?? [];
  const pagination = data?.pagination;
  const currentPage = pagination?.page ?? filters.page ?? 1;
  const totalPages = Math.max(1, pagination?.totalPages ?? 1);

  // Desktop remembers the clicked job; the first result is the default. On
  // mobile the list is shown first and the drawer only opens after a tap.
  const [selectedJobId, setSelectedJobId] = useState<string | undefined>(
    initialJobId,
  );
  const [drawerJobId, setDrawerJobId] = useState<string | undefined>(
    initialJobId,
  );
  const desktopJobId = selectedJobId ?? jobs[0]?.id;

  // One list request powers the "Applied"/"Draft" badges on every card.
  const { data: applicationsResponse } = useApplications(
    { limit: 100 },
    { enabled: isAuthenticated },
  );

  const applicationStatusByJobId = useMemo(() => {
    const map = new Map<string, ApplicationStatus>();
    for (const application of applicationsResponse?.data ?? []) {
      map.set(application.jobId, application.status);
    }
    return map;
  }, [applicationsResponse]);

  const handleSelect = (jobId: string) => {
    if (isDesktop) {
      setSelectedJobId(jobId);
    } else {
      setDrawerJobId(jobId);
    }
  };

  const list = (
    <JobsList
      jobs={jobs}
      isLoading={isLoading}
      isError={isError}
      currentPage={currentPage}
      totalPages={totalPages}
      onPageChange={onPageChange}
      selectedJobId={isDesktop ? desktopJobId : drawerJobId}
      onSelect={handleSelect}
      applicationStatusByJobId={applicationStatusByJobId}
    />
  );

  if (isDesktop) {
    return (
      <div className="flex w-full gap-3 lg:h-[calc(100vh-6rem)] lg:min-h-150">
        <div className=" h-full flex-2/5 w-fit max-w-95 overflow-y-auto pr-2">
          {list}
        </div>
        <div className="h-full min-h-0 flex-3/5 container overflow-hidden p-1">
          {desktopJobId ? (
            <JobDetails
              jobId={desktopJobId}
              className="h-full rounded-xl border bg-card"
            />
          ) : (
            <Card className="flex h-full items-center justify-center p-10 text-center text-muted-foreground">
              {t('jobs.selectJob')}
            </Card>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      {list}
      <JobDetailsDrawer
        jobId={drawerJobId ?? ''}
        isOpen={Boolean(drawerJobId)}
        onClose={() => setDrawerJobId(undefined)}
      />
    </>
  );
}
