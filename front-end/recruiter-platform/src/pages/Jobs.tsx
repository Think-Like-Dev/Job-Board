import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { formatDate } from "date-fns";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  PencilIcon,
  PlusIcon,
} from "lucide-react";
import { type ColumnDef } from "@tanstack/react-table";

import { Button } from "@ui/button";
import type { SliderRange } from "@ui/slider";

import { useGetJobs } from "@/api/hooks/useJobs";
import {
  DataTable,
  type DataTableSorting,
} from "@/components/common/DataTable";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { formatCompensation } from "@/lib/jobFormat";
import { type RootState } from "@/store";
import { type Job, JobStatus } from "@/types/job.types";
import { JobDetailDrawer } from "./jobs/JobDetail/JobDetailDrawer";
import {
  JOB_TAB_STATUS,
  JobTabs,
  type JobTabKey,
} from "./jobs/JobList/JobTabs";
import { JobListToolbar } from "./jobs/JobList/JobListToolbar";
import {
  DEFAULT_SALARY_RANGE,
  type CompensationFilterMode,
} from "./jobs/JobList/compensationFilter";

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 2000;

type DetailMode = "view" | "clone";

const Jobs = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const currentUserId = useSelector(
    (state: RootState) => state.auth.user?.id,
  );

  const [activeTab, setActiveTab] = useState<JobTabKey>("DRAFT");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [compensationMode, setCompensationMode] =
    useState<CompensationFilterMode>("ALL");
  const [salaryRange, setSalaryRange] =
    useState<SliderRange>(DEFAULT_SALARY_RANGE);
  const [sorting, setSorting] = useState<DataTableSorting | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [detailMode, setDetailMode] = useState<DetailMode>("view");

  const debouncedSearch = useDebouncedValue(search, SEARCH_DEBOUNCE_MS);
  // Clearing the search should take effect immediately, not after the debounce.
  const effectiveSearch = search.trim() === "" ? "" : debouncedSearch;

  const compensationFilters =
    compensationMode === "RANGE"
      ? { compensationMin: salaryRange[0], compensationMax: salaryRange[1] }
      : compensationMode === "ALL"
        ? {}
        : { compensationType: compensationMode };

  const { data: jobs, isLoading } = useGetJobs({
    page,
    limit: PAGE_SIZE,
    orderBy: sorting?.sortKey ?? "createdAt",
    orderByDirection: sorting?.direction ?? "DESC",
    status: JOB_TAB_STATUS[activeTab],
    search: effectiveSearch.trim() || undefined,
    ...compensationFilters,
  });

  const pagination = jobs?.pagination;
  const totalPages = Math.max(1, pagination?.totalPages ?? 1);

  useEffect(() => {
    setPage(1);
  }, [activeTab, effectiveSearch, compensationMode, salaryRange, sorting]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(Math.max(1, totalPages));
    }
  }, [page, totalPages]);

  const columns: Array<ColumnDef<Partial<Job>>> = [
    { accessorKey: "code", header: t("job.list.code") },
    { accessorKey: "title", header: t("job.list.title") },
    { accessorKey: "category", header: t("job.list.category") },
    {
      accessorKey: "compensation",
      header: t("job.list.compensation"),
      meta: { sortable: true },
      cell: ({ row }) =>
        formatCompensation(row.original.compensation) ||
        t("jobForm.review.notProvided"),
    },
    { accessorKey: "location", header: t("job.list.location") },
    {
      accessorKey: "createdAt",
      header: t("job.list.createdAt"),
      meta: { sortable: true },
      cell: ({ getValue }) => {
        const value = getValue() as string | undefined;
        return value ? formatDate(value, "dd-MM-yyyy") : "-";
      },
    },
    {
      accessorKey: "updatedAt",
      header: t("job.list.updatedAt"),
      meta: { sortable: true },
      cell: ({ getValue }) => {
        const value = getValue() as string | undefined;
        return value ? formatDate(value, "dd-MM-yyyy") : "-";
      },
    },
    {
      id: "actions",
      header: t("job.actions"),
      cell: ({ row }) => {
        const job = row.original;
        const isOwner = !job.createdBy || job.createdBy === currentUserId;
        const canEdit = job.status === JobStatus.DRAFT && isOwner;
        return (
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={!canEdit || !job.id}
              title={canEdit ? t("job.edit") : t("job.editDisabled")}
              aria-label={canEdit ? t("job.edit") : t("job.editDisabled")}
              onClick={(event) => {
                event.stopPropagation();
                if (canEdit && job.id) navigate(`/jobs/${job.id}/edit`);
              }}
            >
              <PencilIcon className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={!job.id}
              title={t("job.clone")}
              aria-label={t("job.clone")}
              onClick={(event) => {
                event.stopPropagation();
                if (!job.id) return;
                setDetailMode("clone");
                setSelectedJobId(job.id);
              }}
            >
              <CopyIcon className="size-4" />
            </Button>
          </div>
        );
      },
    },
  ];

  const handleTabChange = (tab: JobTabKey) => {
    setActiveTab(tab);
  };

  const handleRowClick = (job: Partial<Job>) => {
    if (!job.id) return;
    setDetailMode("view");
    setSelectedJobId(job.id);
  };

  const isFiltered =
    search.trim() !== "" || compensationMode !== "ALL" || sorting !== null;

  const clearFilters = () => {
    setSearch("");
    setCompensationMode("ALL");
    setSalaryRange(DEFAULT_SALARY_RANGE);
    setSorting(null);
  };

  return (
    <section className="flex flex-1 flex-col gap-4 bg-muted/50 p-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">{t("job.listTitle")}</h1>
        <Button type="button" onClick={() => navigate("/jobs/new")}>
          <PlusIcon data-icon="inline-start" />
          {t("job.createJob")}
        </Button>
      </div>

      <JobTabs value={activeTab} onChange={handleTabChange} />

      <JobListToolbar
        search={search}
        onSearchChange={setSearch}
        compensationMode={compensationMode}
        onCompensationModeChange={setCompensationMode}
        salaryRange={salaryRange}
        onSalaryRangeChange={setSalaryRange}
        onClear={clearFilters}
        isFiltered={isFiltered}
      />

      <DataTable
        data={jobs?.data?.length ? jobs.data : []}
        columns={columns}
        isLoading={isLoading}
        emptyMessage={t("job.list.empty")}
        onRowClick={handleRowClick}
        sorting={sorting}
        onSortingChange={setSorting}
      />

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
            onClick={() => setPage((current) => Math.max(1, current - 1))}
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

      <JobDetailDrawer
        jobId={selectedJobId}
        mode={detailMode}
        currentUserId={currentUserId}
        onClose={() => setSelectedJobId(null)}
        onEdit={(id) => navigate(`/jobs/${id}/edit`)}
        onViewApplications={(id) => navigate(`/jobs/${id}/applications`)}
        onCloneConfirm={(id) => navigate(`/jobs/new?cloneFrom=${id}`)}
      />
    </section>
  );
};

export default Jobs;
