/**
 * The dashboard has no public URL. Nobody gets a login page at /admin or /admin/login: those paths answer "404 Not Found"
 * unless you already hold a valid session. The sign-in form lives at a private address you set yourself:
 *
 *   ADMIN_ENTRY=<a long random word>   →   https://your-site/enter/<that word>
 *
 * Production fails closed: with ADMIN_ENTRY unset, nobody can reach the sign-in page. In local development an unset
 * ADMIN_ENTRY keeps the plain /admin/login page so a fresh checkout still works.
 * (A secret address is an extra layer, not a replacement for the password, the sign-in throttle and the session checks.)
 */
export function entrySecret(): string | null {
  const v = process.env.ADMIN_ENTRY?.trim();
  return v && /^[A-Za-z0-9_-]{8,}$/.test(v) ? v : null;
}

/** Where to send someone who needs to sign in. */
export function loginPath(): string {
  const s = entrySecret();
  return s ? `/enter/${s}` : "/admin/login";
}

/** True when this path is the private sign-in address (or, in local development with no secret set, the plain login page). */
export function isEntryPath(pathname: string): boolean {
  const s = entrySecret();
  if (s) return pathname === `/enter/${s}`;
  return process.env.NODE_ENV !== "production" && pathname === "/admin/login";
}
