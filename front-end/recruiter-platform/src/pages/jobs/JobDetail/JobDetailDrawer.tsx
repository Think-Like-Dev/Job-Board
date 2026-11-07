import { useTranslation } from "react-i18next";
import { Loader2, XIcon } from "lucide-react";

import { Button } from "@ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@ui/dialog";

import { useGetJobById } from "@/api/hooks/useJobs";
import { JobCloneConfirm } from "./JobCloneConfirm";
import { JobDetailActions } from "./JobDetailActions";
import { JobDetailContent } from "./JobDetailContent";

export type JobDetailMode = "view" | "clone";

interface JobDetailDrawerProps {
  jobId: string | null;
  mode: JobDetailMode;
  currentUserId?: string;
  onClose: () => void;
  onEdit: (jobId: string) => void;
  onViewApplications: (jobId: string) => void;
  onCloneConfirm: (jobId: string) => void;
}

/** Centered, content-sized job detail popup with lifecycle actions. */
export function JobDetailDrawer({
  jobId,
  mode,
  currentUserId,
  onClose,
  onEdit,
  onViewApplications,
  onCloneConfirm,
}: JobDetailDrawerProps) {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useGetJobById(jobId ?? "");
  const job = data?.data;

  return (
    <Dialog
      open={Boolean(jobId)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[85vh] w-full max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl"
      >
        <DialogHeader className="flex flex-row items-start justify-between gap-4 border-b p-4">
          <div className="min-w-0 space-y-1">
            <DialogTitle className="truncate">
              {job?.title ?? t("job.detail.title")}
            </DialogTitle>
            <DialogDescription>
              {job?.code ?? t("job.detail.loading")}
            </DialogDescription>
          </div>
          <DialogClose
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={t("common.close")}
              />
            }
          >
            <XIcon className="size-4" />
          </DialogClose>
        </DialogHeader>

        {isLoading ? (
          <div className="flex min-h-40 flex-1 items-center justify-center p-8">
            <Loader2 className="animate-spin" />
          </div>
        ) : isError || !job ? (
          <div className="flex min-h-40 flex-1 flex-col items-center justify-center gap-1 p-8 text-center">
            <p className="text-sm font-medium">
              {t("job.detail.loadFailedTitle")}
            </p>
            <p className="text-sm text-muted-foreground">
              {t("job.detail.loadFailed")}
            </p>
          </div>
        ) : (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <JobDetailContent job={job} />
            </div>
            <div className="shrink-0 border-t p-4">
              {mode === "clone" ? (
                <JobCloneConfirm
                  job={job}
                  onCancel={onClose}
                  onConfirm={() => onCloneConfirm(job.id)}
                />
              ) : (
                <JobDetailActions
                  job={job}
                  isOwner={
                    !job.createdBy || job.createdBy === currentUserId
                  }
                  onEdit={onEdit}
                  onViewApplications={onViewApplications}
                  onDeleted={onClose}
                />
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
