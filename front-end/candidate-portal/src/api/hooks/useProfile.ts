import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from './queryKeys';
import {
  deleteFile,
  getProfile,
  updateProfile,
  uploadProfileFile,
  type ProfileFileType,
} from '../services/profile.service';
import type { UpdateProfilePayload } from '../../types/profile.types';

export function useProfile() {
  return useQuery({
    queryKey: QUERY_KEYS.PROFILE.ME,
    queryFn: getProfile,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateProfilePayload) => updateProfile(payload),
    onSuccess: (profile) => {
      queryClient.setQueryData(QUERY_KEYS.PROFILE.ME, profile);
    },
  });
}

export function useUploadProfileFile() {
  return useMutation({
    mutationKey: ['profile', 'upload'],
    mutationFn: ({
      file,
      fileType,
    }: {
      file: File;
      fileType: ProfileFileType;
    }) => uploadProfileFile(file, fileType),
  });
}

export function useDeleteFile() {
  return useMutation({
    mutationFn: (fileId: string) => deleteFile(fileId),
  });
}
