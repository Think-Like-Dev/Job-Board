import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
  useArchivePreview,
  useDeleteJob,
  usePatchJobStatus,
} from "@/api/hooks/useJobs";
import { ApiError } from "@/api/httpClient";
import type { JobDetail } from "@/api/schemas/jobs.schema";
import { JobStatus } from "@/types/job.types";

export type JobActionDialog = "archive-warning" | "delete" | null;

interface UseJobActionsOptions {
  job: JobDetail;
  onDeleted: () => void;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError && error.message) {
    return error.message;
  }
  return fallback;
}

/**
 * Owns the detail-drawer mutations and confirmation state so the action bar
 * stays presentational.
 */
export function useJobActions({ job, onDeleted }: UseJobActionsOptions) {
  const { t } = useTranslation();
  const patchJobStatus = usePatchJobStatus();
  const archivePreview = useArchivePreview();
  const deleteJob = useDeleteJob();
  const [dialog, setDialog] = useState<JobActionDialog>(null);

  const publish = () => {
    patchJobStatus.mutate(
      { id: job.id, status: JobStatus.PUBLISHED },
      {
        onSuccess: () => toast.success(t("job.detail.toasts.published")),
        onError: (error) =>
          toast.error(
            getErrorMessage(error, t("job.detail.toasts.publishFailed")),
          ),
      },
    );
  };

  const archive = (acknowledge: boolean) => {
    patchJobStatus.mutate(
      {
        id: job.id,
        status: JobStatus.ARCHIVED,
        ...(acknowledge ? { acknowledgeNoConfirmedOffers: true } : {}),
      },
      {
        onSuccess: () => {
          setDialog(null);
          toast.success(t("job.detail.toasts.archived"));
        },
        onError: (error) => {
          setDialog(null);
          toast.error(
            getErrorMessage(error, t("job.detail.toasts.archiveFailed")),
          );
        },
      },
    );
  };

  const requestArchive = async () => {
    try {
      const preview = await archivePreview.mutateAsync(job.id);
      if (preview.data.requiresNoConfirmedOffersAcknowledgement) {
        setDialog("archive-warning");
        return;
      }
      archive(false);
    } catch (error) {
      toast.error(
        getErrorMessage(error, t("job.detail.toasts.archiveFailed")),
      );
    }
  };

  const requestDelete = () => setDialog("delete");

  const confirmDelete = () => {
    deleteJob.mutate(job.id, {
      onSuccess: () => {
        setDialog(null);
        toast.success(t("job.detail.toasts.deleted"));
        onDeleted();
      },
      onError: (error) => {
        setDialog(null);
        toast.error(
          getErrorMessage(error, t("job.detail.toasts.deleteFailed")),
        );
      },
    });
  };

  return {
    dialog,
    setDialog,
    publish,
    requestArchive,
    confirmArchive: () => archive(true),
    requestDelete,
    confirmDelete,
    isPublishing: patchJobStatus.isPending,
    isArchiving: patchJobStatus.isPending,
    isDeleting: deleteJob.isPending,
    isCheckingArchive: archivePreview.isPending,
  };
}
