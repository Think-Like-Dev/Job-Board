import { useTranslation } from 'react-i18next';
import { Card } from '@ui/card';
import { Badge } from '@ui/badge';
import { Button } from '@ui/button';
import { formatDateToLocale } from '@utils/date';
import type { Application } from '@/types/application.types';
import { ApplicationStatus } from '@/types/application.types';

interface ApplicationCardProps {
  app: Application;
  onClick: () => void;
}

function statusLabelKey(status: ApplicationStatus): string {
  return `applications.status.${status}`;
}

export function ApplicationCard({ app, onClick }: ApplicationCardProps) {
  const { t } = useTranslation();

  const getStatusColor = (status: ApplicationStatus): string => {
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
  };

  const details = (app.details ?? {}) as Record<string, unknown>;

  return (
    <Card
      onClick={onClick}
      className="group cursor-pointer p-6 transition-shadow hover:shadow-md"
    >
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold transition-colors group-hover:text-primary">
            {app.jobTitle}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('applications.appliedOn', {
              date: formatDateToLocale(app.appliedAt ?? app.createdAt),
            })}
          </p>
        </div>
        <Badge variant="outline" className={getStatusColor(app.status)}>
          {t(statusLabelKey(app.status))}
        </Badge>
      </div>

      {app.status === ApplicationStatus.INTERVIEW &&
        Boolean(details.interviewRound) && (
        <div className="mt-4 flex items-center justify-between rounded-md bg-muted/50 p-3 text-sm">
          <div>
            <span className="font-medium">
              {t('applications.interviewRound', {
                round: details?.interviewRound as string,
              })}
            </span>
            <span className="mx-2 text-muted-foreground">•</span>
            <span>
              {formatDateToLocale(details?.scheduledAt as string)}
            </span>
          </div>
          <Button variant="outline" size="sm">
            {t('common.view')}
          </Button>
        </div>
      )}

      {app.status === ApplicationStatus.OFFER_EXTENDED &&
        Boolean(details.offerDeadline) && (
        <div className="mt-4 flex items-center justify-between rounded-md bg-muted/50 p-3 text-sm">
          <div>
            <span className="font-medium">
              {t('applications.actionRequired')}
            </span>
            <span className="text-muted-foreground">
              {t('applications.respondBy', {
                date: formatDateToLocale(details?.offerDeadline as string),
              })}
            </span>
          </div>
          <Button
            variant="default"
            size="sm"
            className="bg-green-600 text-white hover:bg-green-700"
          >
            {t('applications.viewOffer')}
          </Button>
        </div>
      )}
    </Card>
  );
}
