import { fetchFileBlob } from '@api/services/profile.service';

/**
 * Opens a guarded file in a new tab using an authenticated blob fetch.
 * Cross-origin <img>/<a> requests would not send the SameSite=Lax session
 * cookie, so every file preview must go through axios first.
 */
export async function openAuthenticatedFile(fileId: string): Promise<void> {
  // Reserve the tab synchronously so the browser does not treat the
  // post-fetch navigation as a blocked popup.
  const tab = window.open('', '_blank');

  try {
    const blob = await fetchFileBlob(fileId);
    const url = URL.createObjectURL(blob);

    if (tab) {
      tab.location.href = url;
      tab.opener = null;
    } else {
      window.open(url, '_blank', 'noopener');
    }

    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (error) {
    tab?.close();
    throw error;
  }
}
