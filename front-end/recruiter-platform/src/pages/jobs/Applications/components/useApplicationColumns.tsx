import { useTranslation } from "react-i18next";
import { type ColumnDef } from "@tanstack/react-table";

import { Checkbox } from "@ui/checkbox";

import { ApplicationStatusBadge } from "@/components/common/ApplicationStatusBadge";
import { formatIsoDate } from "@/lib/jobFormat";
import type { JobApplicationListItem } from "@/types/application.types";
import { ResumeCell } from "./ResumeCell";
import { SelectAllHeader } from "./SelectAllHeader";
import type { ApplicationSelection } from "./selection.types";

interface UseApplicationColumnsOptions {
  selection: ApplicationSelection;
  onViewResume: (application: JobApplicationListItem) => void;
}

/** Candidate table columns. Sorting is server-side via `meta.sortable`. */
export function useApplicationColumns({
  selection,
  onViewResume,
}: UseApplicationColumnsOptions): ColumnDef<JobApplicationListItem>[] {
  const { t } = useTranslation();

  return [
    {
      id: "select",
      header: () => <SelectAllHeader selection={selection} />,
      cell: ({ row }) => (
        <div
          className="flex items-center"
          onClick={(event) => event.stopPropagation()}
        >
          <Checkbox
            checked={selection.selectedIds.has(row.original.id)}
            onCheckedChange={(checked) =>
              selection.onToggleRow(row.original.id, checked)
            }
            aria-label={t("job.applications.selection.selectCandidate", {
              name: row.original.candidateName,
            })}
          />
        </div>
      ),
    },
    {
      accessorKey: "candidateName",
      header: t("job.applications.columns.candidate"),
      cell: ({ row }) => (
        <span className="font-medium">{row.original.candidateName}</span>
      ),
    },
    {
      id: "contact",
      header: t("job.applications.columns.contact"),
      cell: ({ row }) => (
        <div className="space-y-0.5 text-sm">
          <p className="break-all">{row.original.candidateEmail}</p>
          {row.original.candidatePhone ? (
            <p className="text-muted-foreground">
              {row.original.candidatePhone}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      id: "resume",
      header: t("job.applications.columns.resume"),
      cell: ({ row }) => (
        <ResumeCell
          application={row.original}
          onViewResume={onViewResume}
        />
      ),
    },
    {
      accessorKey: "status",
      header: t("job.applications.columns.status"),
      cell: ({ row }) => (
        <ApplicationStatusBadge status={row.original.status} />
      ),
    },
    {
      id: "aiScore",
      header: t("job.applications.columns.aiScore"),
      cell: () => (
        <span
          className="text-sm text-muted-foreground"
          title={t("job.applications.aiScorePending")}
        >
          —
        </span>
      ),
    },
    {
      accessorKey: "appliedAt",
      header: t("job.applications.columns.appliedAt"),
      meta: { sortable: true, sortKey: "appliedAt" },
      cell: ({ row }) =>
        formatIsoDate(row.original.appliedAt ?? row.original.createdAt),
    },
  ];
}
