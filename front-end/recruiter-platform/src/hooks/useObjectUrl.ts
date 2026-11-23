import { useEffect, useMemo } from "react";

/**
 * Creates an object URL for a blob and revokes it when the blob changes or
 * the component unmounts. Use for authenticated file previews.
 *
 * The URL is derived from the blob during render (not written from an
 * effect), so the first paint already shows the current file.
 */
export function useObjectUrl(blob?: Blob): string | null {
  const url = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob]);

  useEffect(() => {
    if (!url) return;
    return () => URL.revokeObjectURL(url);
  }, [url]);

  return url;
}
