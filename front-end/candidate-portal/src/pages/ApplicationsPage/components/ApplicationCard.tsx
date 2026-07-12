import { Card } from '@ui/card';
import { Badge } from '@ui/badge';
import { Button } from '@ui/button';
import { formatDateToLocale } from '@utils/date';

export function ApplicationCard({ app, onClick }: { app: any, onClick: () => void }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Offer Extended':
      case 'Offer Accepted':
        return 'bg-green-500/10 text-green-700 dark:text-green-400';
      case 'Rejected':
      case 'Offer Rejected':
        return 'bg-red-500/10 text-red-700 dark:text-red-400';
      case 'Interview Scheduled':
        return 'bg-blue-500/10 text-blue-700 dark:text-blue-400';
      default:
        return 'bg-secondary text-secondary-foreground';
    }
  };

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

      {app.status === 'Interview Scheduled' && (
        <div className="bg-muted/50 rounded-md p-3 text-sm flex justify-between items-center mt-4">
          <div>
            <span className="font-medium">Round {app.details.interviewRound}</span>
            <span className="text-muted-foreground mx-2">•</span>
            <span>{formatDateToLocale(app.details.scheduledAt)}</span>
          </div>
          <Button variant="outline" size="sm">View Details</Button>
        </div>
      )}

      {app.status === 'Offer Extended' && (
        <div className="bg-muted/50 rounded-md p-3 text-sm flex justify-between items-center mt-4">
          <div>
            <span className="font-medium">Action Required: </span>
            <span className="text-muted-foreground">Respond by {formatDateToLocale(app.details.offerDeadline)}</span>
          </div>
          <Button variant="default" size="sm" className="bg-green-600 hover:bg-green-700 text-white">View Offer</Button>
        </div>
      )}
    </Card>
  );
}
