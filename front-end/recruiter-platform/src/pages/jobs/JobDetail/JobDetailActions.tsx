import { useTranslation } from "react-i18next";
import {
  ArchiveIcon,
  Loader2,
  PencilIcon,
  SendIcon,
  Trash2Icon,
  UsersIcon,
} from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@ui/alert-dialog";
import { Button } from "@ui/button";

import type { JobDetail } from "@/api/schemas/jobs.schema";
import { JobStatus } from "@/types/job.types";
import { useJobActions } from "./useJobActions";

interface JobDetailActionsProps {
  job: JobDetail;
  isOwner: boolean;
  onEdit: (jobId: string) => void;
  onViewApplications: (jobId: string) => void;
  onDeleted: () => void;
}

/** Status-aware action bar and confirmation dialogs for the job drawer. */
export function JobDetailActions({
  job,
  isOwner,
  onEdit,
  onViewApplications,
  onDeleted,
}: JobDetailActionsProps) {
  const { t } = useTranslation();
  const actions = useJobActions({ job, onDeleted });

  if (!isOwner) {
    return (
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {t("job.detail.readOnly")}
        </p>
        {job.status !== JobStatus.DRAFT && (
          <Button
            type="button"
            variant="outline"
            onClick={() => onViewApplications(job.id)}
          >
            <UsersIcon data-icon="inline-start" />
            {t("job.detail.actions.viewApplications")}
          </Button>
        )}
      </div>
    );
  }

  if (job.status === JobStatus.ARCHIVED) {
    return (
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {t("job.detail.archivedReadOnly")}
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={() => onViewApplications(job.id)}
        >
          <UsersIcon data-icon="inline-start" />
          {t("job.detail.actions.viewApplications")}
        </Button>
      </div>
    );
  }

  const busy =
    actions.isPublishing ||
    actions.isDeleting ||
    actions.isCheckingArchive;

  return (
    <>
      <div className="flex flex-wrap items-center justify-end gap-2">
        {job.status === JobStatus.DRAFT && (
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => onEdit(job.id)}
              disabled={busy}
            >
              <PencilIcon data-icon="inline-start" />
              {t("job.detail.actions.edit")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={actions.requestDelete}
              disabled={busy}
            >
              <Trash2Icon data-icon="inline-start" />
              {t("job.detail.actions.delete")}
            </Button>
            <Button type="button" onClick={actions.publish} disabled={busy}>
              {actions.isPublishing ? (
                <Loader2 className="animate-spin" data-icon="inline-start" />
              ) : (
                <SendIcon data-icon="inline-start" />
              )}
              {actions.isPublishing
                ? t("job.publishing")
                : t("job.detail.actions.publish")}
            </Button>
          </>
        )}

        {job.status === JobStatus.PUBLISHED && (
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => onViewApplications(job.id)}
              disabled={busy}
            >
              <UsersIcon data-icon="inline-start" />
              {t("job.detail.actions.viewApplications")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={actions.requestArchive}
              disabled={busy}
            >
              {actions.isCheckingArchive || actions.isArchiving ? (
                <Loader2 className="animate-spin" data-icon="inline-start" />
              ) : (
                <ArchiveIcon data-icon="inline-start" />
              )}
              {actions.isArchiving
                ? t("job.archiving")
                : t("job.detail.actions.archive")}
            </Button>
          </>
        )}
      </div>

      <AlertDialog
        open={actions.dialog === "archive-warning"}
        onOpenChange={(open) => {
          if (!open) actions.setDialog(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("job.detail.dialogs.archiveTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("job.detail.dialogs.archiveDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actions.isArchiving}>
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={actions.confirmArchive}
              disabled={actions.isArchiving}
            >
              {actions.isArchiving
                ? t("job.archiving")
                : t("job.detail.actions.archive")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={actions.dialog === "delete"}
        onOpenChange={(open) => {
          if (!open) actions.setDialog(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("job.detail.dialogs.deleteTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("job.detail.dialogs.deleteDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actions.isDeleting}>
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={actions.confirmDelete}
              disabled={actions.isDeleting}
            >
              {actions.isDeleting
                ? t("common.deleting")
                : t("job.detail.actions.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
