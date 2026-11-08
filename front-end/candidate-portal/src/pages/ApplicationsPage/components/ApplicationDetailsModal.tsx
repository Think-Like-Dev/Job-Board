import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@ui/dialog';
import { Button } from '@ui/button';
import { Badge } from '@ui/badge';
import { Label } from '@ui/label';
import { Skeleton } from '@ui/skeleton';
import { Textarea } from '@ui/textarea';
import { formatDateToLocale } from '@utils/date';
import { getErrorMessage } from '@utils/errorMessage';
import { openAuthenticatedFile } from '@utils/fileActions';
import {
  useApplicationDetails,
  useWithdrawApplication,
} from '@api/hooks/useApplications';
import { ApplicationStatus } from '@/types/application.types';

interface ApplicationDetailsModalProps {
  applicationId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ApplicationDetailsModal({
  applicationId,
  isOpen,
  onClose,
}: ApplicationDetailsModalProps) {
  const { t } = useTranslation();
  const { data: app, isLoading, isError } = useApplicationDetails(
    applicationId ?? undefined,
  );
  const withdrawMutation = useWithdrawApplication();
  const [reason, setReason] = useState('');
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);

  const close = () => {
    setReason('');
    setShowWithdrawForm(false);
    onClose();
  };

  const handleWithdraw = () => {
    if (!app) return;
    withdrawMutation.mutate(
      { id: app.id, reason: reason.trim() || undefined },
      {
        onSuccess: () => {
          toast.success(t('applications.withdrawn'));
          close();
        },
        onError: (error) => {
          toast.error(
            getErrorMessage(error, t('applications.withdrawFailed')),
          );
        },
      },
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-150">
        {isLoading && (
          <div className="space-y-4 py-6">
            <DialogTitle className="sr-only">
              {t('applications.loadingDetails')}
            </DialogTitle>
            <Skeleton className="h-7 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="mt-6 h-24 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        )}

        {!isLoading && isError && (
          <>
            <DialogHeader>
              <DialogTitle>
                {t('applications.detailsLoadFailed')}
              </DialogTitle>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={close}>
                {t('applications.details.close')}
              </Button>
            </DialogFooter>
          </>
        )}

        {!isLoading && !isError && app && (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl">{app.jobTitle}</DialogTitle>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant="secondary">
                  {t(`applications.status.${app.status}`)}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {app.status === ApplicationStatus.DRAFT
                    ? t('applications.createdOn', {
                        date: formatDateToLocale(app.createdAt),
                      })
                    : t('applications.appliedOn', {
                        date: formatDateToLocale(
                          app.appliedAt ?? app.createdAt,
                        ),
                      })}
                </span>
              </div>
            </DialogHeader>

            <div className="space-y-6 py-4">
              <div>
                <h4 className="mb-3 border-b pb-2 font-medium">
                  {t('applications.details.yourApplication')}
                </h4>
                <div className="space-y-4 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <span className="text-muted-foreground">
                      {t('applications.details.jobCategory')}
                    </span>
                    <span>{app.jobCategory}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <span className="text-muted-foreground">
                      {t('applications.details.jobLocation')}
                    </span>
                    <span>{app.jobLocation}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <span className="text-muted-foreground">
                      {t('applications.details.resume')}
                    </span>
                    <button
                      type="button"
                      className="text-left text-primary hover:underline"
                      onClick={() => void openAuthenticatedFile(app.resumeFileId)}
                    >
                      {app.resumeFileName}
                    </button>
                  </div>
                  {app.coverLetterFileId && (
                    <div className="grid grid-cols-2 gap-2">
                      <span className="text-muted-foreground">
                        {t('applications.details.coverLetter')}
                      </span>
                      <button
                        type="button"
                        className="text-left text-primary hover:underline"
                        onClick={() =>
                          void openAuthenticatedFile(
                            app.coverLetterFileId as string,
                          )
                        }
                      >
                        {app.coverLetterFileName}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h4 className="mb-3 border-b pb-2 font-medium">
                  {t('applications.statusHistory')}
                </h4>
                {app.statusHistory.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {t('applications.statusHistoryEmpty')}
                  </p>
                ) : (
                  <ol className="space-y-4">
                    {app.statusHistory.map((entry) => (
                      <li key={entry.id} className="flex gap-3 text-sm">
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium">
                              {t(`applications.status.${entry.newStatus}`)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatDateToLocale(entry.createdAt)}
                            </span>
                          </div>
                          {entry.reason && (
                            <p className="mt-1 text-muted-foreground">
                              {entry.reason}
                            </p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </div>

              {app.status === ApplicationStatus.APPLIED && (
                <div className="rounded-md border border-destructive/20 bg-destructive/5 p-4">
                  <h4 className="font-medium">
                    {t('applications.withdrawTitle')}
                  </h4>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t('applications.withdrawDescription')}
                  </p>

                  {showWithdrawForm ? (
                    <div className="mt-4 space-y-3">
                      <Label htmlFor="withdraw-reason">
                        {t('applications.withdrawReason')}
                      </Label>
                      <Textarea
                        id="withdraw-reason"
                        value={reason}
                        onChange={(event) => setReason(event.target.value)}
                        placeholder={t(
                          'applications.withdrawReasonPlaceholder',
                        )}
                      />
                      <div className="flex gap-2">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={handleWithdraw}
                          disabled={withdrawMutation.isPending}
                        >
                          {t('applications.confirmWithdraw')}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowWithdrawForm(false)}
                          disabled={withdrawMutation.isPending}
                        >
                          {t('common.cancel')}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="destructive"
                      size="sm"
                      className="mt-4"
                      onClick={() => setShowWithdrawForm(true)}
                    >
                      {t('applications.withdraw')}
                    </Button>
                  )}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={close}>
                {t('applications.details.close')}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
