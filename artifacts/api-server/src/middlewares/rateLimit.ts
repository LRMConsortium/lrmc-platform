import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import type { Request } from "express";

// Combine IP with the email in the request body so that:
// - a single IP hammering many different emails is still throttled per-IP
// - a distributed attacker rotating IPs against one victim email is still
//   throttled per-email
function ipAndEmailKey(req: Request): string {
  const email =
    typeof req.body?.email === "string" ? req.body.email.toLowerCase() : "";
  return `${ipKeyGenerator(req.ip ?? "")}:${email}`;
}

// Login: allow a handful of genuine mistyped-password retries, but stop
// credential-stuffing / brute-force scripts.
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: ipAndEmailKey,
  message: { error: "Too many login attempts. Please try again later." },
});

// Forgot-password / resend-verification: these always return the same
// generic response regardless of whether the account exists, but without a
// limit an attacker could still spam a victim's inbox or exhaust the email
// provider's quota.
export const emailActionRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: ipAndEmailKey,
  message: {
    error: "Too many requests. Please try again later.",
  },
});

// Verify-email / reset-password: these take an opaque token directly in the
// body (no email to key on), so a script could otherwise brute-force valid
// tokens by guessing. Key on IP only; a generous limit still allows a
// legitimate user a few retries (e.g. pasting a stale link) without being
// blocked.
export const tokenActionRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => ipKeyGenerator(req.ip ?? ""),
  message: {
    error: "Too many requests. Please try again later.",
  },
});
