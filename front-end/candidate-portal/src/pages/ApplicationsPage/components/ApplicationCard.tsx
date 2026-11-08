import { useTranslation } from 'react-i18next';
import { Card } from '@ui/card';
import { Badge } from '@ui/badge';
import { Button } from '@ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@ui/alert-dialog';
import { formatDateToLocale } from '@utils/date';
import type { Application } from '@/types/application.types';
import { ApplicationStatus } from '@/types/application.types';

interface ApplicationCardProps {
  app: Application;
  onClick: () => void;
  onContinue: (app: Application) => void;
  onDelete: (id: string) => void;
  isDeleting?: boolean;
}

function statusLabelKey(status: ApplicationStatus): string {
  return `applications.status.${status}`;
}

function statusColor(status: ApplicationStatus): string {
  switch (status) {
    case ApplicationStatus.OFFER_EXTENDED:
    case ApplicationStatus.OFFER_ACCEPTED:
      return 'bg-green-500/10 text-green-700 dark:text-green-400';
    case ApplicationStatus.REJECTED:
    case ApplicationStatus.OFFER_REJECTED:
    case ApplicationStatus.AUTO_REJECTED:
      return 'bg-red-500/10 text-red-700 dark:text-red-400';
    case ApplicationStatus.INTERVIEW:
      return 'bg-blue-500/10 text-blue-700 dark:text-blue-400';
    case ApplicationStatus.IN_REVIEW:
    case ApplicationStatus.SHORTLISTED:
      return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400';
    case ApplicationStatus.WITHDRAWN:
      return 'bg-muted text-muted-foreground';
    default:
      return 'bg-secondary text-secondary-foreground';
  }
}

export function ApplicationCard({
  app,
  onClick,
  onContinue,
  onDelete,
  isDeleting = false,
}: ApplicationCardProps) {
  const { t } = useTranslation();
  const isDraft = app.status === ApplicationStatus.DRAFT;

  return (
    <Card
      onClick={onClick}
      className="group cursor-pointer p-6 transition-shadow hover:shadow-md"
    >
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-semibold transition-colors group-hover:text-primary">
            {app.jobTitle}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {isDraft
              ? t('applications.createdOn', {
                  date: formatDateToLocale(app.createdAt),
                })
              : t('applications.appliedOn', {
                  date: formatDateToLocale(app.appliedAt ?? app.createdAt),
                })}
          </p>
        </div>
        <Badge variant="outline" className={statusColor(app.status)}>
          {t(statusLabelKey(app.status))}
        </Badge>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
        <span>{app.jobCategory}</span>
        <span>{app.jobLocation}</span>
      </div>

      {isDraft && (
        <div
          className="mt-4 flex flex-wrap gap-2"
          onClick={(event) => event.stopPropagation()}
        >
          <Button size="sm" onClick={() => onContinue(app)}>
            {t('applications.continueDraft')}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button variant="outline" size="sm" disabled={isDeleting} />
              }
            >
              {t('applications.deleteDraft')}
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {t('applications.deleteDraftTitle')}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {t('applications.deleteDraftDescription')}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  onClick={() => onDelete(app.id)}
                >
                  {t('applications.confirmDeleteDraft')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </Card>
  );
}
