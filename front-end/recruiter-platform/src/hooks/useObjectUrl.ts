import { useEffect, useState } from "react";

/**
 * Creates an object URL for a blob and revokes it when the blob changes or
 * the component unmounts. Use for authenticated file previews.
 */
export function useObjectUrl(blob?: Blob): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!blob) {
      setUrl(null);
      return;
    }

    const next = URL.createObjectURL(blob);
    setUrl(next);

    return () => URL.revokeObjectURL(next);
  }, [blob]);

  return url;
}
