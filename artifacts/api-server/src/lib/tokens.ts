import crypto from "crypto";

const VERIFY_TTL_MS = 1000 * 60 * 60 * 24; // 24h
const RESET_TTL_MS = 1000 * 60 * 60; // 1h

export function generateRawToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

export function expiryFor(purpose: "verify_email" | "reset_password"): Date {
  const ttl = purpose === "verify_email" ? VERIFY_TTL_MS : RESET_TTL_MS;
  return new Date(Date.now() + ttl);
}
