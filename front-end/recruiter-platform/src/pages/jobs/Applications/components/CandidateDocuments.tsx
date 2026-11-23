import { useTranslation } from "react-i18next";
import { DownloadIcon, EyeIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@ui/button";

import { downloadAuthenticatedFile } from "@/lib/fileActions";
import type { DocumentViewerTarget } from "@/components/common/DocumentViewerPanel";

interface DocumentRowProps {
  label: string;
  fileId: string;
  fileName?: string | null;
  onView: (target: DocumentViewerTarget) => void;
}

function DocumentRow({
  label,
  fileId,
  fileName,
  onView,
}: DocumentRowProps) {
  const { t } = useTranslation();
  const handleError = () => toast.error(t("job.applications.fileError"));

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3">
      <div className="min-w-0">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {label}
        </p>
        <p className="truncate text-sm" title={fileName ?? undefined}>
          {fileName?.trim() || t("job.applications.noResume")}
        </p>
      </div>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onView({ fileId, fileName: fileName ?? undefined })}
        >
          <EyeIcon data-icon="inline-start" />
          {t("job.applications.drawer.documents.view")}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            void downloadAuthenticatedFile(fileId, fileName ?? undefined).catch(
              handleError,
            );
          }}
        >
          <DownloadIcon data-icon="inline-start" />
          {t("job.applications.drawer.documents.download")}
        </Button>
      </div>
    </div>
  );
}

interface CandidateDocumentsProps {
  resumeFileId: string;
  resumeFileName: string;
  coverLetterFileId?: string;
  coverLetterFileName?: string;
  onViewDocument: (target: DocumentViewerTarget) => void;
}

/** Resume and optional cover letter with guarded preview/download actions. */
export function CandidateDocuments({
  resumeFileId,
  resumeFileName,
  coverLetterFileId,
  coverLetterFileName,
  onViewDocument,
}: CandidateDocumentsProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-2">
      <DocumentRow
        label={t("job.applications.drawer.documents.resume")}
        fileId={resumeFileId}
        fileName={resumeFileName}
        onView={onViewDocument}
      />
      {coverLetterFileId ? (
        <DocumentRow
          label={t("job.applications.drawer.documents.coverLetter")}
          fileId={coverLetterFileId}
          fileName={coverLetterFileName}
          onView={onViewDocument}
        />
      ) : null}
    </div>
  );
}
