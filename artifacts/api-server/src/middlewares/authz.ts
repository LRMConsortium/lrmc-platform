import type { Request } from "express";

/**
 * Returns true if the current session user owns the resource (matches `ownerId`)
 * or is an admin. Use this before mutating/deleting resources fetched by id.
 */
export function isOwnerOrAdmin(req: Request, ownerId: number | null | undefined): boolean {
  if (req.session.role === "admin") {
    return true;
  }
  return ownerId != null && ownerId === req.session.userId;
}
