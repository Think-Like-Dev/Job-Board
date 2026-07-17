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

export function ApplicationCard({ app, onClick }: ApplicationCardProps) {
  const getStatusColor = (status: ApplicationStatus): string => {
    switch (status) {
      case ApplicationStatus.OFFER_EXTENDED:
      case ApplicationStatus.OFFER_ACCEPTED:
        return 'bg-green-500/10 text-green-700 dark:text-green-400';
      case ApplicationStatus.REJECTED:
      case ApplicationStatus.OFFER_REJECTED:
        return 'bg-red-500/10 text-red-700 dark:text-red-400';
      case ApplicationStatus.INTERVIEW_SCHEDULED:
        return 'bg-blue-500/10 text-blue-700 dark:text-blue-400';
      case ApplicationStatus.IN_REVIEW:
        return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400';
      case ApplicationStatus.WITHDRAWN:
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-secondary text-secondary-foreground';
    }
  };

  const details = app.details as Record<string, unknown>;

  return (
    <Card
      onClick={onClick}
      className="p-6 hover:shadow-md transition-shadow cursor-pointer group"
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold group-hover:text-primary transition-colors">
            {app.jobTitle}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">Applied on {formatDateToLocale(app.appliedAt)}</p>
        </div>
        <Badge variant="outline" className={getStatusColor(app.status)}>
          {app.status}
        </Badge>
      </div>

      {app.status === ApplicationStatus.INTERVIEW_SCHEDULED && (
        <div className="bg-muted/50 rounded-md p-3 text-sm flex justify-between items-center mt-4">
          <div>
            <span className="font-medium">Round {details?.interviewRound as string}</span>
            <span className="text-muted-foreground mx-2">•</span>
            <span>{formatDateToLocale(details?.scheduledAt as string)}</span>
          </div>
          <Button variant="outline" size="sm">View Details</Button>
        </div>
      )}

      {app.status === ApplicationStatus.OFFER_EXTENDED && (
        <div className="bg-muted/50 rounded-md p-3 text-sm flex justify-between items-center mt-4">
          <div>
            <span className="font-medium">Action Required: </span>
            <span className="text-muted-foreground">Respond by {formatDateToLocale(details?.offerDeadline as string)}</span>
          </div>
          <Button variant="default" size="sm" className="bg-green-600 hover:bg-green-700 text-white">
            View Offer
          </Button>
        </div>
      )}
    </Card>
  );
}
