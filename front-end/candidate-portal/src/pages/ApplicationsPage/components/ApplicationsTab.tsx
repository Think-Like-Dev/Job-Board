import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  useApplications,
  useDeleteDraft,
} from '@api/hooks/useApplications';
import { getErrorMessage } from '@utils/errorMessage';
import { Button } from '@ui/button';
import { Card } from '@ui/card';
import { Skeleton } from '@ui/skeleton';
import { ApplicationCard } from './ApplicationCard';
import { ApplicationDetailsModal } from './ApplicationDetailsModal';
import type { Application } from '@/types/application.types';

const PAGE_SIZE = 10;

export function ApplicationsTab() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useApplications({
    page,
    limit: PAGE_SIZE,
  });
  const deleteMutation = useDeleteDraft();

  const applications = data?.data ?? [];
  const pagination = data?.pagination;
  const totalPages = Math.max(1, pagination?.totalPages ?? 1);

  const handleContinue = (app: Application) => {
    navigate(`/jobs/${app.jobId}`);
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id, {
      onSuccess: () => {
        toast.success(t('applications.draftDeleted'));
        // If the deleted draft was the last item on the page, step back.
        if (applications.length === 1 && page > 1) {
          setPage((current) => current - 1);
        }
      },
      onError: (error) => {
        toast.error(getErrorMessage(error, t('applications.deleteFailed')));
      },
    });
  };

  if (isLoading) {
    return (
      <div className="mt-6 space-y-4">
        {[1, 2].map((index) => (
          <div
            key={index}
            className="flex h-32 flex-col justify-between rounded-md border p-6"
          >
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-4 w-1/4" />
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <Card className="mt-6 flex flex-col items-center gap-3 p-10 text-center text-muted-foreground">
        <p>{t('applications.loadFailed')}</p>
        <Button variant="outline" size="sm" onClick={() => void refetch()}>
          {t('common.tryAgain')}
        </Button>
      </Card>
    );
  }

  if (applications.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center text-muted-foreground">
        <p>{t('applications.empty')}</p>
        {page > 1 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            {t('applications.previous')}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      {applications.map((app) => (
        <ApplicationCard
          key={app.id}
          app={app}
          onClick={() => setSelectedId(app.id)}
          onContinue={handleContinue}
          onDelete={handleDelete}
          isDeleting={deleteMutation.isPending}
        />
      ))}

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-2 border-t pt-4">
          <p className="text-sm text-muted-foreground">
            {t('applications.pageOf', { page, total: totalPages })}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              {t('applications.previous')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() =>
                setPage((current) => Math.min(totalPages, current + 1))
              }
            >
              {t('applications.next')}
            </Button>
          </div>
        </div>
      )}

      <ApplicationDetailsModal
        applicationId={selectedId}
        isOpen={Boolean(selectedId)}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}
