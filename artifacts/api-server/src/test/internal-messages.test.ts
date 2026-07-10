import { describe, it, expect } from "vitest";
import { createMemberUser, createAdminUser } from "./helpers";

describe("internal-messages recipient validation", () => {
  it("allows sending to an approved member", async () => {
    const sender = await createMemberUser("msg-sender");
    const recipient = await createMemberUser("msg-recipient");

    const res = await sender.agent
      .post("/api/internal-messages")
      .send({ recipientId: recipient.id, subject: "Hi", body: "Hello there" });

    expect(res.status).toBe(201);
  });

  it("allows sending to an admin", async () => {
    const sender = await createMemberUser("msg-sender-admin");
    const admin = await createAdminUser("msg-admin-recipient");

    const res = await sender.agent
      .post("/api/internal-messages")
      .send({ recipientId: admin.id, subject: "Hi", body: "Hello there" });

    expect(res.status).toBe(201);
  });

  it("returns 404 for a recipient ID that doesn't exist", async () => {
    const sender = await createMemberUser("msg-sender-missing");

    const res = await sender.agent
      .post("/api/internal-messages")
      .send({ recipientId: 999_999_999, subject: "Hi", body: "Hello there" });

    expect(res.status).toBe(404);
  });
});
