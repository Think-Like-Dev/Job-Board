import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from './queryKeys';
import {
  getApplications,
  applyForJob,
  respondToOffer,
} from '../services/application.service';
import type { ApplyPayload, OfferResponsePayload } from '@/types/application.types';

export function useApplications() {
  return useQuery({
    queryKey: QUERY_KEYS.APPLICATIONS.ALL,
    queryFn: getApplications,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useApplyForJob() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ jobId, payload }: { jobId: string; payload: ApplyPayload }) =>
      applyForJob(jobId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.APPLICATIONS.ALL });
    },
  });
}

export function useRespondToOffer() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: OfferResponsePayload }) =>
      respondToOffer(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.APPLICATIONS.ALL });
    },
  });
}
