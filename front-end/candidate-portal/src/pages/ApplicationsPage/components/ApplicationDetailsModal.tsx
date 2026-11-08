import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@ui/dialog';
import { Button } from '@ui/button';
import { Badge } from '@ui/badge';
import { Textarea } from '@ui/textarea';
import { Label } from '@ui/label';
import { formatDateToLocale, formatDateTimeToLocale } from '@utils/date';
import { openAuthenticatedFile } from '@utils/fileActions';
import { useRespondToOffer } from '@api/hooks/useApplications';
import { toast } from 'sonner';
import type { Application } from '@/types/application.types';
import { ApplicationStatus } from '@/types/application.types';

interface ApplicationDetailsModalProps {
  app: Application | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ApplicationDetailsModal({
  app,
  isOpen,
  onClose,
}: ApplicationDetailsModalProps) {
  const { t } = useTranslation();
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const respondMutation = useRespondToOffer();

  const handleRespond = (accept: boolean, reason?: string) => {
    if (!app) return;
    respondMutation.mutate(
      { id: app.id, payload: { accept, reason } },
      {
        onSuccess: () => {
          toast.success(
            accept
              ? t('applications.details.offerAccepted')
              : t('applications.details.offerRejected'),
          );
          onClose();
        },
      },
    );
  };

  if (!app) return null;

  const details = (app.details ?? {}) as Record<string, unknown>;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-xl">{app.jobTitle}</DialogTitle>
          <div className="mt-2 flex items-center gap-2">
            <Badge variant="secondary">
              {t(`applications.status.${app.status}`)}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {t('applications.appliedOn', {
                date: formatDateToLocale(app.appliedAt ?? app.createdAt),
              })}
            </span>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {app.status === ApplicationStatus.REJECTED && (
            <div className="rounded-md border border-red-500/20 bg-red-500/10 p-4">
              <h4 className="mb-1 font-semibold text-red-700 dark:text-red-400">
                {t('applications.details.applicationUpdate')}
              </h4>
              <p className="text-sm text-red-600 dark:text-red-300">
                {details?.reason as string}
              </p>
            </div>
          )}

          {app.status === ApplicationStatus.INTERVIEW &&
            Boolean(details.interviewRound) && (
            <div className="space-y-3 rounded-md border border-blue-500/20 bg-blue-500/10 p-4">
              <h4 className="font-semibold text-blue-700 dark:text-blue-400">
                {t('applications.details.interviewScheduled', {
                  round: details?.interviewRound as string,
                })}
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="mb-1 block text-muted-foreground">
                    {t('applications.details.dateTime')}
                  </span>
                  <span className="font-medium">
                    {formatDateTimeToLocale(details?.scheduledAt as string)}
                  </span>
                </div>
                <div>
                  <span className="mb-1 block text-muted-foreground">
                    {t('applications.details.mode')}
                  </span>
                  <span className="font-medium">
                    {details?.mode as string}
                  </span>
                </div>
              </div>
              <div className="border-t border-blue-500/20 pt-2">
                <span className="mb-1 block text-sm text-muted-foreground">
                  {t('applications.details.location')}
                </span>
                <span className="break-all text-sm font-medium text-blue-700 dark:text-blue-400">
                  {details?.location as string}
                </span>
              </div>
            </div>
          )}

          {app.status === ApplicationStatus.OFFER_EXTENDED &&
            Boolean(details.offerDeadline) && (
            <div className="space-y-4 rounded-md border border-green-500/20 bg-green-500/10 p-4">
              <h4 className="font-semibold text-green-700 dark:text-green-400">
                {t('applications.details.offerCongratulations')}
              </h4>
              <div className="text-sm">
                <span className="text-muted-foreground">
                  {t('applications.details.offerExtendedOn')}
                </span>
                <span className="font-medium">
                  {formatDateToLocale(details?.offerExtendedAt as string)}
                </span>
              </div>
              <div className="text-sm">
                <span className="font-medium text-destructive">
                  {t('applications.details.respondByLabel')}
                </span>
                <span className="font-medium">
                  {formatDateToLocale(details?.offerDeadline as string)}
                </span>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  className="bg-green-600 text-white hover:bg-green-700"
                  onClick={() => handleRespond(true)}
                  disabled={respondMutation.isPending || showRejectForm}
                >
                  {t('applications.details.acceptOffer')}
                </Button>
                <Button
                  variant="outline"
                  className="border-destructive/20 text-destructive hover:bg-destructive/10"
                  onClick={() => setShowRejectForm(true)}
                  disabled={respondMutation.isPending || showRejectForm}
                >
                  {t('applications.details.declineOffer')}
                </Button>
              </div>

              {showRejectForm && (
                <div className="mt-4 space-y-3 border-t border-green-500/20 pt-4">
                  <Label>
                    {t('applications.details.reasonForDeclining')}{' '}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    placeholder={t('applications.details.reasonPlaceholder')}
                    value={rejectReason}
                    onChange={(event) => setRejectReason(event.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      onClick={() => handleRespond(false, rejectReason)}
                      disabled={!rejectReason.trim()}
                    >
                      {t('applications.details.confirmDecline')}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => setShowRejectForm(false)}
                    >
                      {t('common.cancel')}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

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
                      void openAuthenticatedFile(app.coverLetterFileId as string)
                    }
                  >
                    {app.coverLetterFileName}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('applications.details.close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
