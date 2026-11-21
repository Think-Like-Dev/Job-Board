/**
 * Joins the configured recruiter-app base URL with a path.
 *
 * Invitation and password-reset emails are the only places that build an
 * absolute link, so they share this helper instead of each trimming slashes on
 * its own. Keeping it in one place is what makes a port/config change a
 * single-line edit.
 */
export function appUrl(baseUrl: string, path: string): string {
  const base = baseUrl.trim().replace(/\/+$/, '');
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${base}${suffix}`;
}
