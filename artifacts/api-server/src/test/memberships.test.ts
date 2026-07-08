import { describe, it, expect } from "vitest";
import { createMemberUser, createAdminUser } from "./helpers";

async function createMembership(agent: Awaited<ReturnType<typeof createMemberUser>>["agent"]) {
  const res = await agent.post("/api/memberships").send({ type: "property_owner" });
  expect(res.status).toBe(201);
  return res.body.id as number;
}

describe("memberships status validation", () => {
  it("rejects an invalid status value with 400", async () => {
    const admin = await createAdminUser("admin");
    const member = await createMemberUser("member");
    const membershipId = await createMembership(member.agent);

    const res = await admin.agent
      .patch(`/api/memberships/${membershipId}`)
      .send({ status: "hacked" });

    expect(res.status).toBe(400);
  });

  it("accepts a valid status value (active)", async () => {
    const admin = await createAdminUser("admin");
    const member = await createMemberUser("member");
    const membershipId = await createMembership(member.agent);

    const res = await admin.agent
      .patch(`/api/memberships/${membershipId}`)
      .send({ status: "active" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("active");
  });

  it("accepts a valid status value (rejected)", async () => {
    const admin = await createAdminUser("admin");
    const member = await createMemberUser("member");
    const membershipId = await createMembership(member.agent);

    const res = await admin.agent
      .patch(`/api/memberships/${membershipId}`)
      .send({ status: "rejected" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("rejected");
  });
});
