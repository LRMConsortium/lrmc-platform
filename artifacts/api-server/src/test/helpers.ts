import request from "supertest";
import { eq } from "drizzle-orm";
import { db, usersTable, membershipsTable } from "@workspace/db";
import app from "../app";

let counter = 0;

/** Generates a unique-per-run email so parallel test runs never collide with seed data. */
function uniqueEmail(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}@authz-tests.local`;
}

export interface TestUser {
  id: number;
  email: string;
  password: string;
  /** Authenticated supertest agent (persists the session cookie across requests). */
  agent: ReturnType<typeof request.agent>;
}

/** Registers a fresh member user via the real /auth/register endpoint and returns a logged-in agent. */
export async function createMemberUser(prefix = "member"): Promise<TestUser> {
  const email = uniqueEmail(prefix);
  const password = "Test-Password-123!";

  const registerAgent = request.agent(app);
  const res = await registerAgent.post("/api/auth/register").send({
    email,
    password,
    fullName: `Test User ${email}`,
    phone: "+220 000 0000",
  });

  if (res.status !== 201) {
    throw new Error(`Failed to register test user: ${res.status} ${JSON.stringify(res.body)}`);
  }

  // Registration leaves the account unverified (by design, see email
  // verification flow); mark it verified directly in the DB since tests run
  // against the real dev DB and have no way to click an emailed link.
  await db
    .update(usersTable)
    .set({ emailVerifiedAt: new Date() })
    .where(eq(usersTable.id, res.body.id));

  // Most authz tests exercise member-area endpoints, which now require a
  // paid + KYC-approved membership server-side. Give test members one by
  // default so existing "can the owner do X" tests aren't tripped up by the
  // membership gate; tests that specifically want to exercise the gate can
  // create a user and adjust its membership row directly.
  await db.insert(membershipsTable).values({
    userId: res.body.id,
    type: "renter",
    status: "active",
    paymentStatus: "paid",
    kycStatus: "approved",
  });

  const agent = request.agent(app);
  const loginRes = await agent.post("/api/auth/login").send({ email, password });
  if (loginRes.status !== 200) {
    throw new Error(`Failed to log in test user: ${loginRes.status} ${JSON.stringify(loginRes.body)}`);
  }

  return { id: res.body.id, email, password, agent };
}

/**
 * Registers a fresh member user with a specific membership payment/KYC state,
 * for exercising the requireApprovedMembership gate directly. Pass
 * `paymentStatus: "unpaid"` and omit the membership row entirely by using
 * `withMembership: false` to simulate a member who never even started
 * checkout.
 */
export async function createMemberUserWithMembership(
  prefix: string,
  opts: {
    paymentStatus?: "unpaid" | "paid";
    kycStatus?: "not_submitted" | "pending" | "approved" | "rejected";
    withMembership?: boolean;
  },
): Promise<TestUser> {
  const email = uniqueEmail(prefix);
  const password = "Test-Password-123!";

  const registerAgent = request.agent(app);
  const res = await registerAgent.post("/api/auth/register").send({
    email,
    password,
    fullName: `Test User ${email}`,
    phone: "+220 000 0000",
  });

  if (res.status !== 201) {
    throw new Error(`Failed to register test user: ${res.status} ${JSON.stringify(res.body)}`);
  }

  await db
    .update(usersTable)
    .set({ emailVerifiedAt: new Date() })
    .where(eq(usersTable.id, res.body.id));

  if (opts.withMembership !== false) {
    await db.insert(membershipsTable).values({
      userId: res.body.id,
      type: "renter",
      status: "active",
      paymentStatus: opts.paymentStatus ?? "unpaid",
      kycStatus: opts.kycStatus ?? "not_submitted",
    });
  }

  const agent = request.agent(app);
  const loginRes = await agent.post("/api/auth/login").send({ email, password });
  if (loginRes.status !== 200) {
    throw new Error(`Failed to log in test user: ${loginRes.status} ${JSON.stringify(loginRes.body)}`);
  }

  return { id: res.body.id, email, password, agent };
}

/** Registers a fresh user and promotes it to admin directly in the DB, then logs in. */
export async function createAdminUser(prefix = "admin"): Promise<TestUser> {
  const email = uniqueEmail(prefix);
  const password = "Test-Password-123!";
  const registerAgent = request.agent(app);

  const registerRes = await registerAgent.post("/api/auth/register").send({
    email,
    password,
    fullName: `Test Admin ${email}`,
    phone: "+220 000 0000",
  });

  if (registerRes.status !== 201) {
    throw new Error(
      `Failed to register test admin: ${registerRes.status} ${JSON.stringify(registerRes.body)}`,
    );
  }

  await db
    .update(usersTable)
    .set({ role: "admin", emailVerifiedAt: new Date() })
    .where(eq(usersTable.id, registerRes.body.id));

  // Log in again with a fresh agent so the session reflects the admin role
  // (the earlier session was minted before the role update).
  const agent = request.agent(app);
  const loginRes = await agent.post("/api/auth/login").send({ email, password });
  if (loginRes.status !== 200) {
    throw new Error(`Failed to log in test admin: ${loginRes.status} ${JSON.stringify(loginRes.body)}`);
  }

  return { id: registerRes.body.id, email, password, agent };
}

/** An unauthenticated supertest agent, for asserting 401s. */
export function anonymousAgent(): ReturnType<typeof request.agent> {
  return request.agent(app);
}

export { app };
