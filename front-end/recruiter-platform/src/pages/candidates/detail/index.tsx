import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { Button } from "@ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ui/select";

import { useGetCandidate, useGetCandidateApplications } from "@/api/hooks/useCandidates";
import type { CandidateApplicationListItem } from "@/api/schemas/candidates.schema";
import { DataTable } from "@/components/common/DataTable";
import {
  DocumentViewerPanel,
  type DocumentViewerTarget,
} from "@/components/common/DocumentViewerPanel";
import { CandidatePanel } from "@pages/jobs/Applications/components/CandidatePanel";
import { useIsDesktopPanel } from "@/hooks/useIsDesktopPanel";
import {
  APPLICATION_FILTER_STATUSES,
  type ApplicationStatus,
} from "@/types/application.types";
import { CandidateOverviewPanel } from "@/pages/candidates/components/CandidateOverviewPanel";
import { CandidateDetailHeader } from "./CandidateDetailHeader";
import { useCandidateApplicationColumns } from "./useCandidateApplicationColumns";

const PAGE_SIZE = 10;
const ALL_STATUSES = "ALL";

/**
 * Candidate profile with application history. The overview and an application
 * detail panel are mutually exclusive on the left; the document viewer is a
 * separate pane. Below 861px every panel is a full-screen sheet and the
 * applications table is the base view.
 */
const CandidateDetail = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id = "" } = useParams<{ id: string }>();
  const isDesktopPanel = useIsDesktopPanel();

  const [showOverview, setShowOverview] = useState(isDesktopPanel);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<ApplicationStatus | undefined>(
    undefined,
  );
  const [selectedApplication, setSelectedApplication] =
    useState<CandidateApplicationListItem | null>(null);
  const [viewerTarget, setViewerTarget] = useState<DocumentViewerTarget | null>(
    null,
  );

  const candidateQuery = useGetCandidate(id);
  const candidate = candidateQuery.data?.data;

  const applicationsQuery = useGetCandidateApplications(id, {
    page,
    limit: PAGE_SIZE,
    status,
  });
  const applications = applicationsQuery.data?.data ?? [];
  const pagination = applicationsQuery.data?.pagination;
  const totalPages = Math.max(1, pagination?.totalPages ?? 1);
  const totalApplications = pagination?.total ?? 0;

  useEffect(() => {
    setPage(1);
  }, [status]);

  useEffect(() => {
    if (page > totalPages) setPage(Math.max(1, totalPages));
  }, [page, totalPages]);

  // The layout switches at 861px. Desktop opens the overview inline; mobile
  // starts on the table and opens panels as sheets on demand.
  useEffect(() => {
    setShowOverview(isDesktopPanel);
    setSelectedApplication(null);
    setViewerTarget(null);
  }, [isDesktopPanel]);

  const openDocument = (target: DocumentViewerTarget) => {
    // The application detail and the document preview share the right-hand
    // slot, so opening one closes the other.
    setSelectedApplication(null);
    setViewerTarget(target);
  };

  const toggleOverview = () => {
    setSelectedApplication(null);
    setViewerTarget(null);
    setShowOverview((current) => !current);
  };

  const openApplication = (application: CandidateApplicationListItem) => {
    // Selecting an application always closes the left profile and the
    // document viewer; the detail panel takes the right-hand slot.
    setViewerTarget(null);
    setShowOverview(false);
    setSelectedApplication(application);
  };

  const columns = useCandidateApplicationColumns({
    onViewApplication: openApplication,
  });

  return (
    <section className="flex h-[calc(100dvh-4rem)] min-h-0 flex-col gap-2 bg-muted/50 p-4">
      <CandidateDetailHeader
        candidate={candidate}
        isLoading={candidateQuery.isLoading}
        onBack={() => navigate("/candidates")}
        onToggleOverview={toggleOverview}
      />

      {candidateQuery.isError ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border bg-background p-8 text-center">
          <p className="text-sm font-medium">
            {t("candidate.detail.loadFailedTitle")}
          </p>
          <p className="text-sm text-muted-foreground">
            {t("candidate.detail.loadFailed")}
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => void candidateQuery.refetch()}
          >
            {t("candidate.detail.retry")}
          </Button>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-4 min-[861px]:flex-row">
          <CandidateOverviewPanel
            open={showOverview}
            candidate={candidate}
            isLoading={candidateQuery.isLoading}
            onClose={() => setShowOverview(false)}
            onViewDocument={openDocument}
          />

          <div className="flex min-h-0 flex-1 flex-col gap-3 rounded-lg border bg-background p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="space-y-0.5">
                <h2 className="text-sm font-semibold">
                  {t("candidate.applications.title")}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {t("candidate.applications.total", {
                    count: totalApplications,
                  })}
                </p>
              </div>
              <Select
                value={status ?? ALL_STATUSES}
                onValueChange={(value) =>
                  setStatus(
                    value === ALL_STATUSES
                      ? undefined
                      : (value as ApplicationStatus),
                  )
                }
              >
                <SelectTrigger
                  className="w-full sm:w-48"
                  aria-label={t("candidate.applications.statusFilter")}
                >
                  <SelectValue>
                    {status
                      ? t(`job.applications.status.${status}`)
                      : t("candidate.applications.allStatuses")}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_STATUSES}>
                    {t("candidate.applications.allStatuses")}
                  </SelectItem>
                  {APPLICATION_FILTER_STATUSES.map((option) => (
                    <SelectItem key={option} value={option}>
                      {t(`job.applications.status.${option}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {applicationsQuery.isError ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-md border p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  {t("candidate.applications.loadFailed")}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void applicationsQuery.refetch()}
                >
                  {t("candidate.applications.retry")}
                </Button>
              </div>
            ) : (
              <div className="min-h-0 flex-1 overflow-auto">
                <DataTable
                  data={applications}
                  columns={columns}
                  isLoading={applicationsQuery.isLoading}
                  emptyMessage={t("candidate.applications.empty")}
                  onRowClick={openApplication}
                  containerClassName="border-0"
                />
              </div>
            )}

            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">
                {t("job.pagination.pageOf", { page, total: totalPages })}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() =>
                    setPage((current) => Math.max(1, current - 1))
                  }
                >
                  <ChevronLeftIcon data-icon="inline-start" />
                  {t("job.pagination.previous")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((current) => current + 1)}
                >
                  {t("job.pagination.next")}
                  <ChevronRightIcon data-icon="inline-end" />
                </Button>
              </div>
            </div>
          </div>

          <CandidatePanel
            applicationId={selectedApplication?.id ?? null}
            onClose={() => setSelectedApplication(null)}
            onViewDocument={openDocument}
            title={t("candidate.applications.panelTitle")}
            description={
              selectedApplication
                ? `${selectedApplication.jobTitle} · ${selectedApplication.jobCode}`
                : undefined
            }
          />

          <DocumentViewerPanel
            target={viewerTarget}
            onClose={() => setViewerTarget(null)}
          />
        </div>
      )}
    </section>
  );
};

export default CandidateDetail;
