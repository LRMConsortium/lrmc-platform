import { describe, it, expect } from "vitest";
import { createMemberUser, createAdminUser } from "./helpers";

async function createRecord(agent: Awaited<ReturnType<typeof createMemberUser>>["agent"]) {
  const res = await agent.post("/api/youth-employment-records").send({
    program: "Authz Test Program",
  });
  expect(res.status).toBe(201);
  return res.body.id as number;
}

describe("youth-employment-records authorization and scoping", () => {
  it("only returns the caller's own records for non-admins", async () => {
    const owner = await createMemberUser("youth-owner");
    const otherUser = await createMemberUser("other-user");
    const recordId = await createRecord(owner.agent);
    await createRecord(otherUser.agent);

    const res = await otherUser.agent.get("/api/youth-employment-records");
    expect(res.status).toBe(200);
    expect((res.body as Array<{ id: number }>).some((r) => r.id === recordId)).toBe(false);

    const ownRes = await owner.agent.get("/api/youth-employment-records");
    expect(ownRes.status).toBe(200);
    expect((ownRes.body as Array<{ id: number }>).some((r) => r.id === recordId)).toBe(true);
  });

  it("lets an admin see records from all users", async () => {
    const owner = await createMemberUser("youth-owner");
    const admin = await createAdminUser("admin");
    const recordId = await createRecord(owner.agent);

    const res = await admin.agent.get("/api/youth-employment-records");
    expect(res.status).toBe(200);
    expect((res.body as Array<{ id: number }>).some((r) => r.id === recordId)).toBe(true);
  });

  it("rejects a non-owner PATCH with 403", async () => {
    const owner = await createMemberUser("youth-owner");
    const stranger = await createMemberUser("stranger");
    const recordId = await createRecord(owner.agent);

    const res = await stranger.agent
      .patch(`/api/youth-employment-records/${recordId}`)
      .send({ status: "placed" });

    expect(res.status).toBe(403);
  });

  it("allows the owner to PATCH their own record", async () => {
    const owner = await createMemberUser("youth-owner");
    const recordId = await createRecord(owner.agent);

    const res = await owner.agent
      .patch(`/api/youth-employment-records/${recordId}`)
      .send({ status: "placed" });

    expect(res.status).toBe(200);
  });

  it("allows an admin to PATCH someone else's record", async () => {
    const owner = await createMemberUser("youth-owner");
    const admin = await createAdminUser("admin");
    const recordId = await createRecord(owner.agent);

    const res = await admin.agent
      .patch(`/api/youth-employment-records/${recordId}`)
      .send({ status: "placed" });

    expect(res.status).toBe(200);
  });
});
