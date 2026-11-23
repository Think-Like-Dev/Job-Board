import { useTranslation } from "react-i18next";
import { EyeIcon } from "lucide-react";
import { type ColumnDef } from "@tanstack/react-table";

import { Badge } from "@ui/badge";
import { Button } from "@ui/button";

import type { CandidateListItem } from "@/api/schemas/candidates.schema";
import {
  candidateDisplayName,
  candidateInitials,
  formatExperienceMonths,
} from "@/lib/candidateFormat";
import { formatIsoDate } from "@/lib/jobFormat";
import { CandidateSkillsCell } from "./CandidateSkillsCell";

interface UseCandidateColumnsOptions {
  onViewOverview: (candidate: CandidateListItem) => void;
}

/** Candidate directory columns. Sorting is server-side via `meta.sortable`. */
export function useCandidateColumns({
  onViewOverview,
}: UseCandidateColumnsOptions): ColumnDef<CandidateListItem>[] {
  const { t } = useTranslation();

  return [
    {
      id: "candidate",
      header: t("candidate.list.columns.candidate"),
      cell: ({ row }) => {
        const candidate = row.original;
        return (
          <div className="flex items-center gap-2">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
              {candidateInitials(candidate)}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">
                {candidateDisplayName(candidate)}
              </span>
              {candidate.createdBy ? (
                <Badge variant="secondary">
                  {t("candidate.source.recruiter")}
                </Badge>
              ) : null}
            </div>
          </div>
        );
      },
    },
    {
      id: "contact",
      header: t("candidate.list.columns.contact"),
      cell: ({ row }) => (
        <div className="space-y-0.5 text-sm">
          <p className="break-all">{row.original.email}</p>
          {row.original.phone ? (
            <p className="text-muted-foreground">{row.original.phone}</p>
          ) : null}
        </div>
      ),
    },
    {
      id: "location",
      header: t("candidate.list.columns.location"),
      cell: ({ row }) => (
        <span className="text-sm">{row.original.currentLocation ?? "—"}</span>
      ),
    },
    {
      id: "skills",
      header: t("candidate.list.columns.skills"),
      cell: ({ row }) => <CandidateSkillsCell skills={row.original.skills} />,
    },
    {
      id: "experience",
      header: t("candidate.list.columns.experience"),
      meta: { sortable: true, sortKey: "experience" },
      cell: ({ row }) => (
        <span className="text-sm">
          {formatExperienceMonths(row.original.totalExperienceMonths, t)}
        </span>
      ),
    },
    {
      id: "applications",
      header: t("candidate.list.columns.applications"),
      cell: ({ row }) => (
        <span className="text-sm">{row.original.totalApplicationsCount}</span>
      ),
    },
    {
      id: "createdAt",
      header: t("candidate.list.columns.registeredAt"),
      meta: { sortable: true, sortKey: "createdAt" },
      cell: ({ row }) =>
        row.original.createdAt ? formatIsoDate(row.original.createdAt) : "—",
    },
    {
      id: "actions",
      header: t("candidate.list.columns.actions"),
      cell: ({ row }) => (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t("candidate.list.viewOverview")}
          title={t("candidate.list.viewOverview")}
          onClick={(event) => {
            event.stopPropagation();
            onViewOverview(row.original);
          }}
        >
          <EyeIcon className="size-4" />
        </Button>
      ),
    },
  ];
}
