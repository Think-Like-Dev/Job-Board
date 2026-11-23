import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { DownloadIcon, FileWarningIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@ui/button";

import { QUERY_KEYS } from "@/api/hooks/queryKeys";
import { useObjectUrl } from "@/hooks/useObjectUrl";
import {
  downloadAuthenticatedFile,
  fetchAuthenticatedFileBlob,
} from "@/lib/fileActions";
import { ResponsiveSidePanel } from "./ResponsiveSidePanel";

export interface DocumentViewerTarget {
  fileId: string;
  fileName?: string;
}

interface DocumentViewerPanelProps {
  target: DocumentViewerTarget | null;
  onClose: () => void;
}

const PREVIEWABLE_EXTENSIONS = /\.(pdf|png|jpe?g|gif|webp|svg|bmp|txt)$/i;
const IMAGE_EXTENSIONS = /\.(png|jpe?g|gif|webp|svg|bmp)$/i;

function isPreviewable(blob: Blob | undefined, fileName?: string): boolean {
  if (!blob) return false;
  return (
    blob.type === "application/pdf" ||
    blob.type.startsWith("image/") ||
    blob.type.startsWith("text/") ||
    PREVIEWABLE_EXTENSIONS.test(fileName ?? "")
  );
}

function isImageBlob(blob: Blob | undefined, fileName?: string): boolean {
  if (!blob) return false;
  return (
    blob.type.startsWith("image/") || IMAGE_EXTENSIONS.test(fileName ?? "")
  );
}

/**
 * Document preview pane. Files are fetched as authenticated blobs, so PDFs and
 * images render in place without exposing the session-guarded URL. Inline on
 * desktop, full-width sheet on mobile.
 */
export function DocumentViewerPanel({
  target,
  onClose,
}: DocumentViewerPanelProps) {
  const { t } = useTranslation();
  const {
    data: blob,
    isLoading,
    isError,
  } = useQuery({
    queryKey: QUERY_KEYS.FILES.BLOB(target?.fileId ?? ""),
    queryFn: () => fetchAuthenticatedFileBlob(target?.fileId as string),
    enabled: Boolean(target?.fileId),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const url = useObjectUrl(blob);
  const canPreview = isPreviewable(blob, target?.fileName);
  const isImage = isImageBlob(blob, target?.fileName);

  const handleDownload = () => {
    if (!target) return;
    void downloadAuthenticatedFile(target.fileId, target.fileName).catch(() =>
      toast.error(t("job.applications.viewer.loadFailed")),
    );
  };

  const headerActions = (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleDownload}
      disabled={!target}
      aria-label={t("job.applications.viewer.download")}
      title={t("job.applications.viewer.download")}
    >
      <DownloadIcon data-icon="inline-start" />
      <span className="hidden min-[861px]:inline">
        {t("job.applications.viewer.download")}
      </span>
    </Button>
  );

  return (
    <ResponsiveSidePanel
      open={Boolean(target)}
      onClose={onClose}
      title={target?.fileName?.trim() || t("job.applications.viewer.title")}
      description={t("job.applications.viewer.description")}
      closeLabel={t("common.close")}
      headerActions={headerActions}
      widthClassName="w-[30rem]"
      fillHeight
      bodyClassName="bg-muted/30"
    >
      {isLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="animate-spin" />
        </div>
      ) : isError || !blob ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
          <FileWarningIcon className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {t("job.applications.viewer.loadFailed")}
          </p>
        </div>
      ) : !canPreview || !url ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
          <FileWarningIcon className="size-8 text-muted-foreground" />
          <p className="max-w-md text-sm text-muted-foreground">
            {t("job.applications.viewer.previewUnavailable")}
          </p>
          <Button type="button" variant="outline" onClick={handleDownload}>
            <DownloadIcon data-icon="inline-start" />
            {t("job.applications.viewer.download")}
          </Button>
        </div>
      ) : isImage ? (
        <div className="flex flex-1 items-center justify-center overflow-auto rounded-md bg-background p-2">
          <img
            src={url}
            alt={target?.fileName ?? ""}
            className="max-h-full max-w-full object-contain"
          />
        </div>
      ) : (
        <iframe
          src={url}
          title={target?.fileName ?? t("job.applications.viewer.title")}
          className="min-h-0 w-full flex-1 rounded-md border bg-background"
        />
      )}
    </ResponsiveSidePanel>
  );
}
