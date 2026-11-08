import { API_ENDPOINTS } from "@/api/endpoints.config";
import { api } from "@/api/httpClient";

/**
 * Fetches a guarded file as a blob. The session cookie is HttpOnly and
 * SameSite, so a plain `<a href>`/`<img src>` cannot read the file; every
 * preview or download must go through the authenticated axios client first.
 */
export async function fetchAuthenticatedFileBlob(
  fileId: string,
  download = false,
): Promise<Blob> {
  return api.get<Blob>(API_ENDPOINTS.FILES.CONTENT(fileId), {
    params: download ? { download: true } : undefined,
    responseType: "blob",
  });
}

/** Downloads a guarded file through an authenticated blob fetch. */
export async function downloadAuthenticatedFile(
  fileId: string,
  filename?: string,
): Promise<void> {
  const blob = await fetchAuthenticatedFileBlob(fileId, true);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename?.trim() || "download";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
