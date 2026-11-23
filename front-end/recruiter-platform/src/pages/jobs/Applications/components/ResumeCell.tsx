import { useTranslation } from "react-i18next";
import { DownloadIcon, EyeIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@ui/button";

import { downloadAuthenticatedFile } from "@/lib/fileActions";
import type { JobApplicationListItem } from "@/types/application.types";

interface ResumeCellProps {
  application: JobApplicationListItem;
  onViewResume: (application: JobApplicationListItem) => void;
}

/** Resume filename with guarded view/download actions. */
export function ResumeCell({
  application,
  onViewResume,
}: ResumeCellProps) {
  const { t } = useTranslation();
  const fileName = application.resumeFileName?.trim();

  const handleError = () => toast.error(t("job.applications.fileError"));

  return (
    <div
      className="flex items-center gap-1"
      onClick={(event) => event.stopPropagation()}
    >
      <span
        className="max-w-40 truncate text-sm"
        title={fileName || t("job.applications.noResume")}
      >
        {fileName || t("job.applications.noResume")}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        disabled={!application.resumeFileId}
        aria-label={t("job.applications.viewResume")}
        title={t("job.applications.viewResume")}
        onClick={() => onViewResume(application)}
      >
        <EyeIcon />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        disabled={!application.resumeFileId}
        aria-label={t("job.applications.downloadResume")}
        title={t("job.applications.downloadResume")}
        onClick={() => {
          void downloadAuthenticatedFile(
            application.resumeFileId,
            application.resumeFileName,
          ).catch(handleError);
        }}
      >
        <DownloadIcon />
      </Button>
    </div>
  );
}
