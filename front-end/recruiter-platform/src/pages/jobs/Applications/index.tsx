import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  Loader2,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@ui/button";

import { useGetJobApplications, useSelectAllFilteredApplications } from "@/api/hooks/useJobApplications";
import { useGetJobById } from "@/api/hooks/useJobs";
import {
  DataTable,
  type DataTableSorting,
} from "@/components/common/DataTable";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useIsDesktopPanel } from "@/hooks/useIsDesktopPanel";
import type {
  ApplicationStatus,
  JobApplicationListItem,
} from "@/types/application.types";
import { ApplicationsHeader } from "./components/ApplicationsHeader";
import { ApplicationsToolbar } from "./components/ApplicationsToolbar";
import { CandidatePanel } from "./components/CandidatePanel";
import {
  DocumentViewerPanel,
  type DocumentViewerTarget,
} from "@/components/common/DocumentViewerPanel";
import { JobDescriptionPanel } from "./components/JobDescriptionPanel";
import type { ApplicationSelection } from "./components/selection.types";
import { useApplicationColumns } from "./components/useApplicationColumns";

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 400;
const DEFAULT_SORTING: DataTableSorting = {
  sortKey: "appliedAt",
  direction: "DESC",
};

/**
 * Candidate management screen for one job. The job-description pane, the
 * candidate panel and the document viewer are mutually exclusive, and the
 * table keeps its filters and scroll position. Panels are inline on desktop
 * and full-covering sheets below 861px.
 */
const Applications = () => {
  const { t } = useTranslation();
  const { id: jobId = "" } = useParams<{ id: string }>();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ApplicationStatus | undefined>(
    undefined,
  );
  const [sorting, setSorting] = useState<DataTableSorting | null>(
    DEFAULT_SORTING,
  );
  // Desktop opens the job description inline; mobile starts with the table
  // uncovered and opens every panel as a sheet on demand.
  const isDesktopPanel = useIsDesktopPanel();
  const [showJobDescription, setShowJobDescription] = useState(isDesktopPanel);
  const [selectedApplicationId, setSelectedApplicationId] = useState<
    string | null
  >(null);
  const [viewerTarget, setViewerTarget] = useState<DocumentViewerTarget | null>(
    null,
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set<string>(),
  );

  const debouncedSearch = useDebouncedValue(search, SEARCH_DEBOUNCE_MS);
  // Clearing the search should take effect immediately, not after the debounce.
  const effectiveSearch = search.trim() === "" ? "" : debouncedSearch;

  const jobQuery = useGetJobById(jobId);
  const job = jobQuery.data?.data;

  const filters = {
    page,
    limit: PAGE_SIZE,
    search: effectiveSearch.trim() || undefined,
    status,
    sortBy: sorting ? `${sorting.sortKey}:${sorting.direction}` : undefined,
  };

  const applicationsQuery = useGetJobApplications(jobId, filters);
  const selectAllMutation = useSelectAllFilteredApplications();
  const applications = applicationsQuery.data?.data ?? [];
  const pagination = applicationsQuery.data?.pagination;
  const totalPages = Math.max(1, pagination?.totalPages ?? 1);
  // Prefer the job's aggregate (unfiltered) count so the header stays stable
  // when a status filter is applied.
  const candidateCount = job?.totalApplications ?? pagination?.total ?? 0;

  useEffect(() => {
    setPage(1);
  }, [effectiveSearch, status, sorting]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(Math.max(1, totalPages));
    }
  }, [page, totalPages]);

  // A different filter describes a different candidate set, so stale
  // selections from the previous filter must not survive.
  useEffect(() => {
    setSelectedIds(new Set<string>());
  }, [jobId, effectiveSearch, status]);

  // The layout switches at 861px. Desktop shows the JD inline by default;
  // mobile starts uncovered and opens panels as sheets on demand.
  useEffect(() => {
    setShowJobDescription(isDesktopPanel);
    setSelectedApplicationId(null);
    setViewerTarget(null);
  }, [isDesktopPanel]);

  const isFiltered = search.trim() !== "" || status !== undefined;

  const clearFilters = () => {
    setSearch("");
    setStatus(undefined);
  };

  const clearSelection = () => setSelectedIds(new Set<string>());

  const pageIds = applications.map((application) => application.id);
  const selectedOnPageCount = pageIds.filter((id) =>
    selectedIds.has(id),
  ).length;
  const isAllCurrentPageSelected =
    pageIds.length > 0 && selectedOnPageCount === pageIds.length;
  const isSomeCurrentPageSelected =
    selectedOnPageCount > 0 && !isAllCurrentPageSelected;

  const toggleRow = (id: string, checked: boolean) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const toggleCurrentPage = (checked: boolean) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      for (const id of pageIds) {
        if (checked) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  };

  const selectAllFiltered = () => {
    selectAllMutation.mutate(
      {
        jobId,
        filters: { search: filters.search, status: filters.status },
      },
      {
        onSuccess: (ids) => setSelectedIds(new Set(ids)),
        onError: () =>
          toast.error(t("job.applications.selection.selectAllFailed")),
      },
    );
  };

  const selection: ApplicationSelection = {
    selectedIds,
    filteredCount: pagination?.total ?? applications.length,
    isAllCurrentPageSelected,
    isSomeCurrentPageSelected,
    isSelectingAll: selectAllMutation.isPending,
    onToggleRow: toggleRow,
    onToggleCurrentPage: toggleCurrentPage,
    onSelectAllFiltered: selectAllFiltered,
    onClear: clearSelection,
  };

  const openDocument = (target: DocumentViewerTarget) => {
    setShowJobDescription(false);
    setSelectedApplicationId(null);
    setViewerTarget(target);
  };

  const openResume = (application: JobApplicationListItem) =>
    openDocument({
      fileId: application.resumeFileId,
      fileName: application.resumeFileName,
    });

  const openCandidate = (application: JobApplicationListItem) => {
    setShowJobDescription(false);
    setViewerTarget(null);
    setSelectedApplicationId(application.id);
  };

  const toggleJobDescription = () => {
    setSelectedApplicationId(null);
    setViewerTarget(null);
    setShowJobDescription((current) => !current);
  };

  const columns = useApplicationColumns({
    selection,
    onViewResume: openResume,
  });

  return (
    <section className="flex h-[calc(100dvh-4rem)] min-h-0 flex-col gap-4 bg-muted/50 p-4">
      <ApplicationsHeader
        job={job}
        candidateCount={candidateCount}
        onToggleJobDescription={toggleJobDescription}
      />

      {applicationsQuery.isError ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border bg-background p-8 text-center">
          <p className="text-sm font-medium">
            {t("job.applications.loadFailedTitle")}
          </p>
          <p className="text-sm text-muted-foreground">
            {t("job.applications.loadFailed")}
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => void applicationsQuery.refetch()}
          >
            {t("job.applications.retry")}
          </Button>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-4 min-[861px]:flex-row">
          <JobDescriptionPanel
            open={showJobDescription}
            job={job}
            isLoading={jobQuery.isLoading}
            onClose={() => setShowJobDescription(false)}
          />

          <div className="flex min-h-0 flex-1 flex-col gap-3 rounded-lg border bg-background p-3">
            <ApplicationsToolbar
              search={search}
              onSearchChange={setSearch}
              status={status}
              onStatusChange={setStatus}
              onClear={clearFilters}
              isFiltered={isFiltered}
            />

            {selectAllMutation.isPending ? (
              <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-1.5 text-sm text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" />
                {t("job.applications.selection.selectingAll")}
              </div>
            ) : selectedIds.size > 0 ? (
              <div className="flex items-center justify-between gap-2 rounded-md border bg-muted/40 px-3 py-1.5 text-sm">
                <span>
                  {t("job.applications.selection.selected", {
                    count: selectedIds.size,
                  })}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearSelection}
                >
                  <XIcon data-icon="inline-start" />
                  {t("job.applications.selection.clear")}
                </Button>
              </div>
            ) : null}

            <div className="min-h-0 flex-1 overflow-auto">
              <DataTable
                data={applications}
                columns={columns}
                isLoading={applicationsQuery.isLoading}
                emptyMessage={t("job.applications.empty")}
                onRowClick={openCandidate}
                sorting={sorting}
                onSortingChange={setSorting}
                containerClassName="border-0"
              />
            </div>

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
            applicationId={selectedApplicationId}
            onClose={() => setSelectedApplicationId(null)}
            onViewDocument={openDocument}
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

export default Applications;
