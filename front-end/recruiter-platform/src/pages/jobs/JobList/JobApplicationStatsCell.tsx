import { useTranslation } from "react-i18next";

import type { Job } from "@/types/job.types";

/**
 * Aggregate application counts shown in the recruiter job table. The backend
 * already orders `candidateStatusCounts` by workflow importance and caps it at
 * three statuses.
 */
export function JobApplicationStatsCell({ job }: { job: Partial<Job> }) {
  const { t } = useTranslation();
  const total = job.totalApplications ?? 0;
  const counts = job.candidateStatusCounts ?? [];

  if (!total) {
    return (
      <span className="text-sm text-muted-foreground">
        {t("job.list.noApplications")}
      </span>
    );
  }

  return (
    <div className="space-y-0.5 text-xs">
      <p className="font-medium">
        {t("job.list.totalApplications", { count: total })}
      </p>
      {counts.map((entry) => (
        <p key={entry.status} className="text-muted-foreground">
          {t(`job.applications.status.${entry.status}`)}: {entry.count}
        </p>
      ))}
    </div>
  );
}
