import { useTranslation } from "react-i18next";

import { Button } from "@ui/button";

import type { JobDetail } from "@/api/schemas/jobs.schema";

interface JobCloneConfirmProps {
  job: JobDetail;
  onCancel: () => void;
  onConfirm: () => void;
}

/** Footer shown when the detail popup is opened from the Clone action. */
export function JobCloneConfirm({
  job,
  onCancel,
  onConfirm,
}: JobCloneConfirmProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        {t("job.cloneConfirm.message", { title: job.title })}
      </p>
      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          {t("common.cancel")}
        </Button>
        <Button type="button" onClick={onConfirm}>
          {t("job.cloneConfirm.confirm")}
        </Button>
      </div>
    </div>
  );
}
