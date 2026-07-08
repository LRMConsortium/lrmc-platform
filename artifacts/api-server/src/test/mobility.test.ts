import { describe, it, expect } from "vitest";
import { createMemberUser, createAdminUser } from "./helpers";

async function createDriver(agent: Awaited<ReturnType<typeof createMemberUser>>["agent"]) {
  const res = await agent.post("/api/drivers").send({
    vehicleInfo: "Authz Test Vehicle — GM 0000 A",
  });
  expect(res.status).toBe(201);
  return res.body.id as number;
}

async function createRide(agent: Awaited<ReturnType<typeof createMemberUser>>["agent"]) {
  const res = await agent.post("/api/rides").send({
    pickup: "Authz Test Pickup",
    dropoff: "Authz Test Dropoff",
    fareCents: 10000,
  });
  expect(res.status).toBe(201);
  return res.body.id as number;
}

describe("drivers authorization", () => {
  it("rejects a non-owner PATCH with 403", async () => {
    const owner = await createMemberUser("driver-owner");
    const stranger = await createMemberUser("stranger");
    const driverId = await createDriver(owner.agent);

    const res = await stranger.agent
      .patch(`/api/drivers/${driverId}`)
      .send({ status: "suspended" });

    expect(res.status).toBe(403);
  });

  it("allows the owner to PATCH their own driver profile", async () => {
    const owner = await createMemberUser("driver-owner");
    const driverId = await createDriver(owner.agent);

    const res = await owner.agent
      .patch(`/api/drivers/${driverId}`)
      .send({ status: "approved" });

    expect(res.status).toBe(200);
  });

  it("allows an admin to PATCH someone else's driver profile", async () => {
    const owner = await createMemberUser("driver-owner");
    const admin = await createAdminUser("admin");
    const driverId = await createDriver(owner.agent);

    const res = await admin.agent
      .patch(`/api/drivers/${driverId}`)
      .send({ status: "approved" });

    expect(res.status).toBe(200);
  });
});

describe("rides authorization and scoping", () => {
  it("only returns the caller's own rides for non-admins", async () => {
    const rider = await createMemberUser("rider");
    const otherRider = await createMemberUser("other-rider");
    const rideId = await createRide(rider.agent);
    await createRide(otherRider.agent);

    const res = await otherRider.agent.get("/api/rides");
    expect(res.status).toBe(200);
    expect((res.body as Array<{ id: number }>).some((r) => r.id === rideId)).toBe(false);

    const ownRes = await rider.agent.get("/api/rides");
    expect(ownRes.status).toBe(200);
    expect((ownRes.body as Array<{ id: number }>).some((r) => r.id === rideId)).toBe(true);
  });

  it("lets an admin see rides from all riders", async () => {
    const rider = await createMemberUser("rider");
    const admin = await createAdminUser("admin");
    const rideId = await createRide(rider.agent);

    const res = await admin.agent.get("/api/rides");
    expect(res.status).toBe(200);
    expect((res.body as Array<{ id: number }>).some((r) => r.id === rideId)).toBe(true);
  });

  it("rejects a non-owner PATCH of a ride with 403", async () => {
    const rider = await createMemberUser("rider");
    const stranger = await createMemberUser("stranger");
    const rideId = await createRide(rider.agent);

    const res = await stranger.agent.patch(`/api/rides/${rideId}`).send({ status: "cancelled" });

    expect(res.status).toBe(403);
  });

  it("allows the rider to PATCH their own ride", async () => {
    const rider = await createMemberUser("rider");
    const rideId = await createRide(rider.agent);

    const res = await rider.agent.patch(`/api/rides/${rideId}`).send({ status: "cancelled" });

    expect(res.status).toBe(200);
  });
});

describe("drivers status validation", () => {
  it("rejects an invalid driver status value with 400", async () => {
    const owner = await createMemberUser("driver-owner");
    const driverId = await createDriver(owner.agent);

    const res = await owner.agent
      .patch(`/api/drivers/${driverId}`)
      .send({ status: "hacked" });

    expect(res.status).toBe(400);
  });

  it("accepts a valid driver status value (approved)", async () => {
    const owner = await createMemberUser("driver-owner");
    const driverId = await createDriver(owner.agent);

    const res = await owner.agent
      .patch(`/api/drivers/${driverId}`)
      .send({ status: "approved" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("approved");
  });
});

describe("rides status validation", () => {
  it("rejects an invalid ride status value with 400", async () => {
    const rider = await createMemberUser("rider");
    const rideId = await createRide(rider.agent);

    const res = await rider.agent
      .patch(`/api/rides/${rideId}`)
      .send({ status: "hacked" });

    expect(res.status).toBe(400);
  });

  it("accepts a valid ride status value (cancelled)", async () => {
    const rider = await createMemberUser("rider");
    const rideId = await createRide(rider.agent);

    const res = await rider.agent
      .patch(`/api/rides/${rideId}`)
      .send({ status: "cancelled" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("cancelled");
  });
});
