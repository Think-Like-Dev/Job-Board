import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@api/apiClient';
import { API_ENDPOINTS } from '@api/endpoints.config';
import { ApplicationCard } from './ApplicationCard';
import { ApplicationDetailsModal } from './ApplicationDetailsModal';
import { Skeleton } from '@ui/skeleton';

export function ApplicationsTab() {
  const [selectedApp, setSelectedApp] = useState<any>(null);

  const { data: applications, isLoading } = useQuery({
    queryKey: ['applications'],
    queryFn: async () => {
      const res = await apiClient.get(API_ENDPOINTS.APPLICATIONS.GET_ALL);
      return res as any[];
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-4 mt-6">
        {[1, 2].map((i) => (
          <div key={i} className="border rounded-md p-6 h-32 flex flex-col justify-between">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-4 w-1/4" />
          </div>
        ))}
      </div>
    );
  }

  if (!applications || applications.length === 0) {
    return <div className="text-center py-12 text-muted-foreground">No applications found.</div>;
  }

  return (
    <div className="mt-6 space-y-4">
      {applications.map((app) => (
        <ApplicationCard 
          key={app.id} 
          app={app} 
          onClick={() => setSelectedApp(app)} 
        />
      ))}

      <ApplicationDetailsModal
        isOpen={!!selectedApp}
        app={selectedApp}
        onClose={() => setSelectedApp(null)}
      />
    </div>
  );
}
