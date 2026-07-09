import type { RequestHandler } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";

/**
 * Confirms the session's userId still maps to a live, current session.
 * A password reset bumps the user's sessionVersion, which invalidates every
 * previously issued session (including the one performing the reset, once
 * re-authenticated) without needing to enumerate a session store.
 */
async function isSessionStillValid(req: Parameters<RequestHandler>[0]) {
  if (!req.session.userId) return false;

  const [user] = await db
    .select({ sessionVersion: usersTable.sessionVersion })
    .from(usersTable)
    .where(eq(usersTable.id, req.session.userId));

  return !!user && user.sessionVersion === req.session.sessionVersion;
}

export const requireAuth: RequestHandler = async (req, res, next) => {
  if (!req.session.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  if (!(await isSessionStillValid(req))) {
    req.session.destroy(() => {});
    res.status(401).json({ error: "Session expired, please sign in again" });
    return;
  }
  next();
};

export const requireAdmin: RequestHandler = async (req, res, next) => {
  if (!req.session.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  if (!(await isSessionStillValid(req))) {
    req.session.destroy(() => {});
    res.status(401).json({ error: "Session expired, please sign in again" });
    return;
  }
  if (req.session.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
};
