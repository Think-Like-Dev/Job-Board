import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ArrowLeftIcon, PanelLeftIcon } from "lucide-react";

import { Badge } from "@ui/badge";
import { Button } from "@ui/button";

import type { JobDetail } from "@/api/schemas/jobs.schema";
import { formatEnumToStartCase } from "@/lib/utils";
import { JobStatus } from "@/types/job.types";

interface ApplicationsHeaderProps {
  job?: JobDetail;
  candidateCount: number;
  showJobDescription: boolean;
  onToggleJobDescription: () => void;
}

function jobStatusVariant(status: JobStatus) {
  if (status === JobStatus.PUBLISHED) return "default" as const;
  if (status === JobStatus.DRAFT) return "secondary" as const;
  return "outline" as const;
}

/** Job identity, aggregate count and the JD-panel toggle. */
export function ApplicationsHeader({
  job,
  candidateCount,
  showJobDescription,
  onToggleJobDescription,
}: ApplicationsHeaderProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <header className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="min-w-0 truncate text-xl font-semibold">
          {job?.title ?? t("job.applications.title")}
        </h1>
        {job ? (
          <Badge variant={jobStatusVariant(job.status)}>
            {formatEnumToStartCase(job.status)}
          </Badge>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-start gap-2">
        <p className="text-sm text-muted-foreground">
          {t("job.applications.candidateCount", { count: candidateCount })}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/jobs")}
          >
            <ArrowLeftIcon data-icon="inline-start" />
            {t("job.applications.back")}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onToggleJobDescription}
          >
            <PanelLeftIcon data-icon="inline-start" />
            {showJobDescription
              ? t("job.applications.hideJobDescription")
              : t("job.applications.showJobDescription")}
          </Button>
        </div>
      </div>
    </header>
  );
}
