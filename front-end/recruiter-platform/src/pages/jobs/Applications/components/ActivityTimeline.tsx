import { useTranslation } from "react-i18next";

import { formatDateTimeToLocale } from "@/lib/date";
import {
  ApplicationStatus,
  type JobApplicationDetail,
} from "@/types/application.types";
import { ApplicationStatusBadge } from "./ApplicationStatusBadge";

interface TimelineEntry {
  id: string;
  label: string;
  date?: string | null;
  reason?: string | null;
  status?: ApplicationStatus;
}

function buildEntries(
  application: JobApplicationDetail,
  appliedLabel: string,
): TimelineEntry[] {
  const entries: TimelineEntry[] = [];

  if (application.appliedAt) {
    entries.push({
      id: "applied",
      label: appliedLabel,
      date: application.appliedAt,
    });
  }

  for (const change of application.statusHistory) {
    // The initial APPLIED row duplicates the "Applied" node above.
    if (
      change.newStatus === ApplicationStatus.APPLIED &&
      change.oldStatus == null
    ) {
      continue;
    }
    entries.push({
      id: change.id,
      label: "",
      date: change.createdAt,
      reason: change.reason,
      status: change.newStatus,
    });
  }

  return entries.sort((a, b) => {
    const aTime = a.date ? new Date(a.date).getTime() : 0;
    const bTime = b.date ? new Date(b.date).getTime() : 0;
    return aTime - bTime;
  });
}

/** Vertical recruitment activity timeline. */
export function ActivityTimeline({
  application,
}: {
  application: JobApplicationDetail;
}) {
  const { t } = useTranslation();
  const entries = buildEntries(
    application,
    t("job.applications.drawer.timeline.applied"),
  );

  if (!entries.length) {
    return (
      <p className="text-sm text-muted-foreground">
        {t("job.applications.drawer.timeline.empty")}
      </p>
    );
  }

  return (
    <ol className="relative space-y-4 border-s ps-4">
      {entries.map((entry) => (
        <li key={entry.id} className="relative">
          <span className="absolute -start-[1.28rem] top-1 size-2.5 rounded-full border-2 border-background bg-primary" />
          <div className="flex flex-wrap items-center gap-2">
            {entry.status ? (
              <ApplicationStatusBadge status={entry.status} />
            ) : (
              <span className="text-sm font-medium">{entry.label}</span>
            )}
            <span className="text-xs text-muted-foreground">
              {entry.date ? formatDateTimeToLocale(entry.date) : ""}
            </span>
          </div>
          {entry.reason ? (
            <p className="mt-1 text-sm text-muted-foreground">{entry.reason}</p>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
