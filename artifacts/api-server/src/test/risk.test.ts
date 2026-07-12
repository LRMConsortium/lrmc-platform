import { describe, it, expect } from "vitest";
import { createMemberUser, createAdminUser, anonymousAgent } from "./helpers";

describe("risk-events routes — access control", () => {
  it("returns 401 for an anonymous GET /risk-events", async () => {
    const res = await anonymousAgent().get("/api/risk-events");
    expect(res.status).toBe(401);
  });

  it("returns 403 for a regular member on GET /risk-events", async () => {
    const member = await createMemberUser("risk-member");
    const res = await member.agent.get("/api/risk-events");
    expect(res.status).toBe(403);
  });

  it("allows an admin to list risk events", async () => {
    const admin = await createAdminUser("risk-admin");
    const res = await admin.agent.get("/api/risk-events");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("returns 401 for an anonymous PATCH /risk-events/:id", async () => {
    const res = await anonymousAgent()
      .patch("/api/risk-events/1")
      .send({ status: "resolved" });
    expect(res.status).toBe(401);
  });

  it("returns 403 for a regular member on PATCH /risk-events/:id", async () => {
    const member = await createMemberUser("risk-patch-member");
    const res = await member.agent
      .patch("/api/risk-events/1")
      .send({ status: "resolved" });
    expect(res.status).toBe(403);
  });

  it("returns 404 (not 401/403) when an admin patches a non-existent risk event", async () => {
    const admin = await createAdminUser("risk-patch-admin");
    const res = await admin.agent
      .patch("/api/risk-events/999999999")
      .send({ status: "resolved" });
    // Admin is authorised; 404 means the row doesn't exist, which is expected.
    expect(res.status).toBe(404);
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});
