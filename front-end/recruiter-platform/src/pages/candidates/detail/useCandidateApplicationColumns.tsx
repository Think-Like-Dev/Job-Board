import { useTranslation } from "react-i18next";
import { EyeIcon } from "lucide-react";
import { type ColumnDef } from "@tanstack/react-table";

import { Button } from "@ui/button";

import type { CandidateApplicationListItem } from "@/api/schemas/candidates.schema";
import { ApplicationStatusBadge } from "@/components/common/ApplicationStatusBadge";
import { formatIsoDate } from "@/lib/jobFormat";

interface CandidateApplicationColumnsOptions {
  onViewApplication: (application: CandidateApplicationListItem) => void;
}

/** Applications of one candidate across every job. Read-only. */
export function useCandidateApplicationColumns({
  onViewApplication,
}: CandidateApplicationColumnsOptions): ColumnDef<CandidateApplicationListItem>[] {
  const { t } = useTranslation();

  return [
    {
      id: "job",
      header: t("candidate.applications.columns.job"),
      cell: ({ row }) => (
        <div className="space-y-0.5">
          <p className="font-medium">{row.original.jobTitle}</p>
          <p className="text-xs text-muted-foreground">{row.original.jobCode}</p>
        </div>
      ),
    },
    {
      id: "department",
      header: t("candidate.applications.columns.department"),
      cell: ({ row }) => (
        <span className="text-sm">{row.original.jobDepartment ?? "—"}</span>
      ),
    },
    {
      id: "location",
      header: t("candidate.applications.columns.location"),
      cell: ({ row }) => (
        <span className="text-sm">{row.original.jobLocation}</span>
      ),
    },
    {
      accessorKey: "status",
      header: t("candidate.applications.columns.status"),
      cell: ({ row }) => (
        <ApplicationStatusBadge status={row.original.status} />
      ),
    },
    {
      accessorKey: "appliedAt",
      header: t("candidate.applications.columns.appliedAt"),
      cell: ({ row }) =>
        formatIsoDate(row.original.appliedAt ?? row.original.createdAt),
    },
    {
      id: "actions",
      header: t("candidate.applications.columns.actions"),
      cell: ({ row }) => (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={t("candidate.applications.view")}
          title={t("candidate.applications.view")}
          onClick={(event) => {
            event.stopPropagation();
            onViewApplication(row.original);
          }}
        >
          <EyeIcon />
        </Button>
      ),
    },
  ];
}
