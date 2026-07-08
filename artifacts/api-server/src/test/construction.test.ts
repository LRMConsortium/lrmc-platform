import { describe, it, expect } from "vitest";
import { createMemberUser, createAdminUser } from "./helpers";

async function createContractor(agent: Awaited<ReturnType<typeof createMemberUser>>["agent"]) {
  const res = await agent.post("/api/construction-contractors").send({
    companyName: "Authz Test Builders",
    specialty: "Testing",
  });
  expect(res.status).toBe(201);
  return res.body.id as number;
}

async function createProject(
  agent: Awaited<ReturnType<typeof createMemberUser>>["agent"],
  contractorId: number,
) {
  const res = await agent.post("/api/construction-projects").send({
    contractorId,
    title: "Authz Test Project",
    location: "Bijilo",
    budgetCents: 500000,
  });
  expect(res.status).toBe(201);
  return res.body.id as number;
}

describe("construction-projects authorization", () => {
  it("rejects a PATCH from a user who isn't the contractor's owner with 403", async () => {
    const owner = await createMemberUser("contractor-owner");
    const stranger = await createMemberUser("stranger");
    const contractorId = await createContractor(owner.agent);
    const projectId = await createProject(owner.agent, contractorId);

    const res = await stranger.agent
      .patch(`/api/construction-projects/${projectId}`)
      .send({ status: "in_progress" });

    expect(res.status).toBe(403);
  });

  it("allows the contractor's owning user to PATCH the project", async () => {
    const owner = await createMemberUser("contractor-owner");
    const contractorId = await createContractor(owner.agent);
    const projectId = await createProject(owner.agent, contractorId);

    const res = await owner.agent
      .patch(`/api/construction-projects/${projectId}`)
      .send({ status: "in_progress" });

    expect(res.status).toBe(200);
  });

  it("allows an admin to PATCH someone else's project", async () => {
    const owner = await createMemberUser("contractor-owner");
    const admin = await createAdminUser("admin");
    const contractorId = await createContractor(owner.agent);
    const projectId = await createProject(owner.agent, contractorId);

    const res = await admin.agent
      .patch(`/api/construction-projects/${projectId}`)
      .send({ status: "on_hold" });

    expect(res.status).toBe(200);
  });
});

describe("construction-projects status validation", () => {
  it("rejects an invalid status value with 400", async () => {
    const owner = await createMemberUser("contractor-owner");
    const contractorId = await createContractor(owner.agent);
    const projectId = await createProject(owner.agent, contractorId);

    const res = await owner.agent
      .patch(`/api/construction-projects/${projectId}`)
      .send({ status: "hacked" });

    expect(res.status).toBe(400);
  });

  it("accepts a valid status value (completed)", async () => {
    const owner = await createMemberUser("contractor-owner");
    const contractorId = await createContractor(owner.agent);
    const projectId = await createProject(owner.agent, contractorId);

    const res = await owner.agent
      .patch(`/api/construction-projects/${projectId}`)
      .send({ status: "completed" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("completed");
  });
});
