/**
 * Base URL of the web frontend, used to build links inside emails
 * (verification, password reset). The web artifact is mounted at "/".
 */
export function getWebBaseUrl(): string {
  if (process.env.WEB_ORIGIN) {
    return process.env.WEB_ORIGIN.replace(/\/$/, "");
  }
  if (process.env.REPLIT_DEV_DOMAIN) {
    return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  }
  return "http://localhost:22333";
}
