import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@api/hooks/queryKeys';
import { fetchFileBlob } from '@api/services/profile.service';

/**
 * Fetches a guarded file through axios and exposes a temporary object URL.
 * A plain cross-origin <img src> would not send the SameSite=Lax session
 * cookie, so profile images must be loaded as authenticated blobs.
 */
export function useAuthenticatedFileUrl(
  fileId?: string | null,
): string | null {
  const { data: blob } = useQuery({
    queryKey: QUERY_KEYS.FILES.CONTENT(fileId ?? ''),
    queryFn: () => fetchFileBlob(fileId as string),
    enabled: Boolean(fileId),
    staleTime: 5 * 60 * 1000,
  });

  const url = useMemo(
    () => (blob ? URL.createObjectURL(blob) : null),
    [blob],
  );

  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url);
    },
    [url],
  );

  return url;
}
