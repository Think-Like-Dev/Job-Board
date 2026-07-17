import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from './queryKeys';
import { getProfile, updateProfile } from '../services/profile.service';
import type { UpdateProfilePayload } from '../../types/profile.types';

export function useProfile() {
  return useQuery({
    queryKey: QUERY_KEYS.PROFILE.ME,
    queryFn: getProfile,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (payload: UpdateProfilePayload) => updateProfile(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PROFILE.ME });
    },
  });
}
