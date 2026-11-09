import { useTranslation } from "react-i18next";

import { Badge } from "@ui/badge";

import { applicationStatusBadgeVariant } from "@/lib/applicationStatus";
import type { ApplicationStatus } from "@/types/application.types";

interface ApplicationStatusBadgeProps {
  status: ApplicationStatus;
}

/** Status pill shared by the candidate table, drawer and timeline. */
export function ApplicationStatusBadge({
  status,
}: ApplicationStatusBadgeProps) {
  const { t } = useTranslation();

  return (
    <Badge variant={applicationStatusBadgeVariant(status)}>
      {t(`job.applications.status.${status}`)}
    </Badge>
  );
}
