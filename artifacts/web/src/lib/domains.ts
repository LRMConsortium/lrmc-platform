// Production domain map for LRMC's three linked properties. All three point at
// this same deployment; navigation between them uses absolute cross-domain
// links only when actually running on the production main domain, so local
// dev / Replit preview keeps working with plain relative routes.
export const MAIN_DOMAIN = "lrmconsortium.africa";
export const CORPORATE_DOMAIN = "africalrmc.com";
export const USUSU_DOMAIN = "africaususu.com";

const PRODUCTION_MAIN_HOSTS = [MAIN_DOMAIN, `www.${MAIN_DOMAIN}`];

/**
 * Build a link to `path` on `targetDomain`. Returns a plain relative path
 * (same-app navigation) unless the visitor is currently on the production
 * main domain, in which case it returns an absolute cross-domain URL so the
 * browser's address bar reflects the correct brand (africalrmc.com /
 * africaususu.com) for that section.
 */
export function crossDomainHref(targetDomain: string, path: string): string {
  if (typeof window === "undefined") return path;
  const host = window.location.hostname;
  if (host.replace(/^www\./, "") === targetDomain) return path;
  if (PRODUCTION_MAIN_HOSTS.includes(host)) return `https://${targetDomain}${path}`;
  return path;
}
