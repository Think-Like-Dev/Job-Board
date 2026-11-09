import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  UploadIcon,
} from "lucide-react";

import { Button } from "@ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/tooltip";

import { useGetCandidates } from "@/api/hooks/useCandidates";
import {
  DataTable,
  type DataTableSorting,
} from "@/components/common/DataTable";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import type { CandidateListItem } from "@/api/schemas/candidates.schema";
import { CandidateCreateDialog } from "./components/CandidateCreateDialog";
import { CandidateOverviewDialog } from "./components/CandidateOverviewDialog";
import { CandidatesToolbar } from "./components/CandidatesToolbar";
import {
  DEFAULT_CANDIDATE_SORT,
  type CandidateSortValue,
} from "./components/candidateSort";
import { useCandidateColumns } from "./components/useCandidateColumns";

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 400;

const SORT_TO_TABLE: Record<
  CandidateSortValue,
  DataTableSorting
> = {
  "createdAt:DESC": { sortKey: "createdAt", direction: "DESC" },
  "createdAt:ASC": { sortKey: "createdAt", direction: "ASC" },
  "experience:DESC": { sortKey: "experience", direction: "DESC" },
  "experience:ASC": { sortKey: "experience", direction: "ASC" },
};

const TABLE_TO_SORT: Record<string, CandidateSortValue> = {
  "createdAt:DESC": "createdAt:DESC",
  "createdAt:ASC": "createdAt:ASC",
  "experience:DESC": "experience:DESC",
  "experience:ASC": "experience:ASC",
};

/**
 * Recruiter candidate directory. Row click opens the detail page; the eye
 * action opens an overview-only popup. Bulk import and bulk resume upload are
 * visible but disabled until that flow is built.
 */
const Candidates = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] =
    useState<CandidateSortValue>(DEFAULT_CANDIDATE_SORT);
  const [overviewId, setOverviewId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const debouncedSearch = useDebouncedValue(search, SEARCH_DEBOUNCE_MS);
  // Clearing the search should take effect immediately, not after the debounce.
  const effectiveSearch = search.trim() === "" ? "" : debouncedSearch;

  const filters = {
    page,
    limit: PAGE_SIZE,
    search: effectiveSearch.trim() || undefined,
    sortBy,
  };

  const candidatesQuery = useGetCandidates(filters);
  const candidates = candidatesQuery.data?.data ?? [];
  const pagination = candidatesQuery.data?.pagination;
  const totalPages = Math.max(1, pagination?.totalPages ?? 1);
  const total = pagination?.total ?? 0;

  useEffect(() => {
    setPage(1);
  }, [effectiveSearch, sortBy]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(Math.max(1, totalPages));
    }
  }, [page, totalPages]);

  const sorting = SORT_TO_TABLE[sortBy];
  const handleSortingChange = (next: DataTableSorting | null) => {
    if (!next) {
      setSortBy(DEFAULT_CANDIDATE_SORT);
      return;
    }
    const value = TABLE_TO_SORT[`${next.sortKey}:${next.direction}`];
    setSortBy(value ?? DEFAULT_CANDIDATE_SORT);
  };

  const columns = useCandidateColumns({
    onViewOverview: (candidate: CandidateListItem) =>
      setOverviewId(candidate.id),
  });

  const isFiltered = search.trim() !== "" || sortBy !== DEFAULT_CANDIDATE_SORT;

  const clearFilters = () => {
    setSearch("");
    setSortBy(DEFAULT_CANDIDATE_SORT);
  };

  const bulkActions = (
    <div className="flex items-center gap-2">
      <Tooltip>
        <TooltipTrigger
          render={
            <span className="inline-flex" tabIndex={0} aria-disabled="true" />
          }
        >
          <Button type="button" variant="outline" disabled>
            <UploadIcon data-icon="inline-start" />
            {t("candidate.list.bulkImport")}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{t("candidate.list.bulkImportTooltip")}</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger
          render={
            <span className="inline-flex" tabIndex={0} aria-disabled="true" />
          }
        >
          <Button type="button" variant="outline" disabled>
            <UploadIcon data-icon="inline-start" />
            {t("candidate.list.bulkResume")}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{t("candidate.list.bulkResumeTooltip")}</TooltipContent>
      </Tooltip>
    </div>
  );

  return (
    <section className="flex flex-1 flex-col gap-4 bg-muted/50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">{t("candidate.list.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("candidate.list.total", { count: total })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {bulkActions}
          <Button type="button" onClick={() => setIsCreateOpen(true)}>
            <PlusIcon data-icon="inline-start" />
            {t("candidate.list.addCandidate")}
          </Button>
        </div>
      </div>

      <CandidatesToolbar
        search={search}
        onSearchChange={setSearch}
        sortBy={sortBy}
        onSortChange={setSortBy}
        onClear={clearFilters}
        isFiltered={isFiltered}
      />

      {candidatesQuery.isError ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border bg-background p-8 text-center">
          <p className="text-sm font-medium">
            {t("candidate.list.loadFailedTitle")}
          </p>
          <p className="text-sm text-muted-foreground">
            {t("candidate.list.loadFailed")}
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => void candidatesQuery.refetch()}
          >
            {t("candidate.list.retry")}
          </Button>
        </div>
      ) : (
        <DataTable
          data={candidates}
          columns={columns}
          isLoading={candidatesQuery.isLoading}
          emptyMessage={t("candidate.list.empty")}
          onRowClick={(candidate) => navigate(`/candidates/${candidate.id}`)}
          sorting={sorting}
          onSortingChange={handleSortingChange}
        />
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

      <CandidateOverviewDialog
        candidateId={overviewId}
        onClose={() => setOverviewId(null)}
      />

      <CandidateCreateDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onCreated={(id) => navigate(`/candidates/${id}`)}
      />
    </section>
  );
};

export default Candidates;
