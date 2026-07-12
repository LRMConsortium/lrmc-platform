import { describe, it, expect } from "vitest";
import request from "supertest";
import { createMemberUser, createAdminUser, anonymousAgent, app } from "./helpers";

const TREASURY_ROUTES = [
  "/api/treasury/accounts",
  "/api/treasury/transactions",
  "/api/treasury/liquidity-snapshots",
  "/api/treasury/currency-rates",
  "/api/treasury/summary",
];

/** A syntactically valid-looking session cookie that carries a forged/tampered value. */
const FORGED_COOKIE = "lrmc.sid=s%3Aforged-session-id-that-does-not-exist.invalidsignaturexyz";

describe("treasury routes — forged / invalid session cookie", () => {
  it("returns 401 for every treasury route when the session cookie is forged", async () => {
    for (const route of TREASURY_ROUTES) {
      const res = await request(app)
        .get(route)
        .set("Cookie", FORGED_COOKIE);
      expect(res.status, `expected 401 on ${route} with forged cookie`).toBe(401);
    }
  });

  it("returns 401 for every treasury route when the session cookie value is arbitrary garbage", async () => {
    for (const route of TREASURY_ROUTES) {
      const res = await request(app)
        .get(route)
        .set("Cookie", "lrmc.sid=totallynotavalidsessiontoken");
      expect(res.status, `expected 401 on ${route} with garbage cookie`).toBe(401);
    }
  });
});

describe("treasury routes — access control", () => {
  it("returns 401 for anonymous requests on every treasury route", async () => {
    const anon = anonymousAgent();
    for (const route of TREASURY_ROUTES) {
      const res = await anon.get(route);
      expect(res.status, `expected 401 on ${route}`).toBe(401);
    }
  });

  it("returns 403 for an authenticated regular member on every treasury route", async () => {
    const member = await createMemberUser("treasury-member");
    for (const route of TREASURY_ROUTES) {
      const res = await member.agent.get(route);
      expect(res.status, `expected 403 on ${route}`).toBe(403);
    }
  });

  it("allows an admin to read treasury accounts", async () => {
    const admin = await createAdminUser("treasury-admin");
    const res = await admin.agent.get("/api/treasury/accounts");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("allows an admin to read treasury transactions", async () => {
    const admin = await createAdminUser("treasury-txn-admin");
    const res = await admin.agent.get("/api/treasury/transactions");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("allows an admin to read liquidity snapshots", async () => {
    const admin = await createAdminUser("treasury-snap-admin");
    const res = await admin.agent.get("/api/treasury/liquidity-snapshots");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("allows an admin to read currency rates", async () => {
    const admin = await createAdminUser("treasury-rates-admin");
    const res = await admin.agent.get("/api/treasury/currency-rates");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("allows an admin to read the treasury summary", async () => {
    const admin = await createAdminUser("treasury-summary-admin");
    const res = await admin.agent.get("/api/treasury/summary");
    // 200 when a currency rate row exists; 500 only when the DB has no rate
    // seeded — both are acceptable here since we're testing authz, not data.
    expect([200, 500]).toContain(res.status);
    // Either way it must NOT be an authz rejection.
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});
