import request from "supertest";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
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
  const agent = request.agent(app);

  const res = await agent.post("/api/auth/register").send({
    email,
    password,
    fullName: `Test User ${email}`,
    phone: "+220 000 0000",
  });

  if (res.status !== 201) {
    throw new Error(`Failed to register test user: ${res.status} ${JSON.stringify(res.body)}`);
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
    .set({ role: "admin" })
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
