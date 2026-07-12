import { describe, it, expect } from "vitest";
import { createMemberUser, createAdminUser, anonymousAgent } from "./helpers";

describe("settlement-obligations routes — access control", () => {
  it("returns 401 for an anonymous GET /settlement-obligations", async () => {
    const res = await anonymousAgent().get("/api/settlement-obligations");
    expect(res.status).toBe(401);
  });

  it("returns 403 for a regular member on GET /settlement-obligations", async () => {
    const member = await createMemberUser("settlement-member");
    const res = await member.agent.get("/api/settlement-obligations");
    expect(res.status).toBe(403);
  });

  it("allows an admin to list settlement obligations", async () => {
    const admin = await createAdminUser("settlement-admin");
    const res = await admin.agent.get("/api/settlement-obligations");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("returns 401 for an anonymous PATCH /settlement-obligations/:id", async () => {
    const res = await anonymousAgent()
      .patch("/api/settlement-obligations/1")
      .send({ status: "completed" });
    expect(res.status).toBe(401);
  });

  it("returns 403 for a regular member on PATCH /settlement-obligations/:id", async () => {
    const member = await createMemberUser("settlement-patch-member");
    const res = await member.agent
      .patch("/api/settlement-obligations/1")
      .send({ status: "completed" });
    expect(res.status).toBe(403);
  });

  it("returns 404 (not 401/403) when an admin patches a non-existent obligation", async () => {
    const admin = await createAdminUser("settlement-patch-admin");
    const res = await admin.agent
      .patch("/api/settlement-obligations/999999999")
      .send({ status: "settled" }); // valid enum value: pending | settled | overdue
    // Admin is authorised; 404 means the row doesn't exist, which is expected.
    expect(res.status).toBe(404);
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});
