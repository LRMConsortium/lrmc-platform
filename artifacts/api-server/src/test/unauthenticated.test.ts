import { describe, it, expect } from "vitest";
import { anonymousAgent } from "./helpers";

describe("unauthenticated access", () => {
  it("rejects mutating requests without a session", async () => {
    const agent = anonymousAgent();

    expect((await agent.post("/api/property-listings").send({})).status).toBe(401);
    expect((await agent.patch("/api/property-listings/1").send({})).status).toBe(401);
    expect((await agent.delete("/api/property-listings/1")).status).toBe(401);
    expect((await agent.get("/api/rides")).status).toBe(401);
    expect((await agent.get("/api/youth-employment-records")).status).toBe(401);
  });
});
