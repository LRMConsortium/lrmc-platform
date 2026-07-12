import { describe, it, expect } from "vitest";
import { createMemberUser, createAdminUser, createMemberUserWithMembership, anonymousAgent } from "./helpers";

// ---------------------------------------------------------------------------
// Internal messages — authentication, authorisation, and scoping
// ---------------------------------------------------------------------------

describe("internal-messages — access control", () => {
  it("returns 401 for anonymous GET /internal-messages", async () => {
    const res = await anonymousAgent().get("/api/internal-messages");
    expect(res.status).toBe(401);
  });

  it("returns 401 for anonymous POST /internal-messages", async () => {
    const res = await anonymousAgent()
      .post("/api/internal-messages")
      .send({ recipientId: 1, subject: "Hi", body: "Hello" });
    expect(res.status).toBe(401);
  });

  it("returns 401 for anonymous PATCH /internal-messages/:id/read", async () => {
    const res = await anonymousAgent().patch("/api/internal-messages/1/read");
    expect(res.status).toBe(401);
  });

  it("sending to a non-existent user ID returns 404", async () => {
    const sender = await createMemberUser("msg-nonexistent-sender");
    // Use a large numeric ID that is extremely unlikely to exist in the test DB.
    const ghostId = 999_999_999;
    const res = await sender.agent
      .post("/api/internal-messages")
      .send({ recipientId: ghostId, subject: "Ghost", body: "You there?" });
    expect(res.status).toBe(404);
  });

  it("sending to an unapproved (pending KYC) user returns 404", async () => {
    const sender = await createMemberUser("msg-unapproved-sender");
    const unapproved = await createMemberUserWithMembership("msg-unapproved-recipient", {
      paymentStatus: "paid",
      kycStatus: "pending",
    });
    const res = await sender.agent
      .post("/api/internal-messages")
      .send({ recipientId: unapproved.id, subject: "Hi", body: "Can you see this?" });
    expect(res.status).toBe(404);
  });

  it("sending to a fully approved member returns 201", async () => {
    const sender = await createMemberUser("msg-approved-sender");
    const recipient = await createMemberUser("msg-approved-recipient");
    const res = await sender.agent
      .post("/api/internal-messages")
      .send({ recipientId: recipient.id, subject: "Hello", body: "Happy path" });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
  });

  it("a member can only see messages they sent or received", async () => {
    const memberA = await createMemberUser("msg-scope-a");
    const memberB = await createMemberUser("msg-scope-b");
    const memberC = await createMemberUser("msg-scope-c");

    // A sends a message to B — C should not see it.
    const sendRes = await memberA.agent
      .post("/api/internal-messages")
      .send({ recipientId: memberB.id, subject: "Private", body: "Only for B" });
    expect(sendRes.status).toBe(201);
    const messageId: number = sendRes.body.id;

    // B can see the message.
    const bList = await memberB.agent.get("/api/internal-messages");
    expect(bList.status).toBe(200);
    const bIds = (bList.body as { id: number }[]).map((m) => m.id);
    expect(bIds).toContain(messageId);

    // C cannot see the message (it's not in their list).
    const cList = await memberC.agent.get("/api/internal-messages");
    expect(cList.status).toBe(200);
    const cIds = (cList.body as { id: number }[]).map((m) => m.id);
    expect(cIds).not.toContain(messageId);
  });

  it("returns 401 for anonymous GET /internal-messages/:id", async () => {
    const res = await anonymousAgent().get("/api/internal-messages/1");
    expect(res.status).toBe(401);
  });

  it("a non-party member gets 403 when fetching a message by ID they did not send or receive", async () => {
    const sender = await createMemberUser("msg-get-sender");
    const recipient = await createMemberUser("msg-get-recipient");
    const outsider = await createMemberUser("msg-get-outsider");

    // Sender posts a private message to recipient.
    const sendRes = await sender.agent
      .post("/api/internal-messages")
      .send({ recipientId: recipient.id, subject: "Secret", body: "Eyes only" });
    expect(sendRes.status).toBe(201);
    const messageId: number = sendRes.body.id;

    // Outsider guesses the message ID — must receive 403, not the message body.
    const res = await outsider.agent.get(`/api/internal-messages/${messageId}`);
    expect(res.status).toBe(403);
  });

  it("the sender can fetch their own message by ID", async () => {
    const sender = await createMemberUser("msg-get-self-sender");
    const recipient = await createMemberUser("msg-get-self-recipient");

    const sendRes = await sender.agent
      .post("/api/internal-messages")
      .send({ recipientId: recipient.id, subject: "Hi", body: "Hello" });
    expect(sendRes.status).toBe(201);
    const messageId: number = sendRes.body.id;

    const res = await sender.agent.get(`/api/internal-messages/${messageId}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(messageId);
  });

  it("the recipient can fetch a message sent to them by ID", async () => {
    const sender = await createMemberUser("msg-get-recv-sender");
    const recipient = await createMemberUser("msg-get-recv-recipient");

    const sendRes = await sender.agent
      .post("/api/internal-messages")
      .send({ recipientId: recipient.id, subject: "For you", body: "Read me" });
    expect(sendRes.status).toBe(201);
    const messageId: number = sendRes.body.id;

    const res = await recipient.agent.get(`/api/internal-messages/${messageId}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(messageId);
  });

  it("a member cannot mark a message they are not party to as read", async () => {
    const sender = await createMemberUser("msg-read-sender");
    const recipient = await createMemberUser("msg-read-recipient");
    const outsider = await createMemberUser("msg-read-outsider");

    const sendRes = await sender.agent
      .post("/api/internal-messages")
      .send({ recipientId: recipient.id, subject: "Test", body: "Body" });
    expect(sendRes.status).toBe(201);
    const messageId: number = sendRes.body.id;

    // Outsider attempts to mark it read — must be rejected.
    const res = await outsider.agent.patch(`/api/internal-messages/${messageId}/read`);
    expect(res.status).toBe(403);
  });

  it("a sender can mark their own sent message as read", async () => {
    const sender = await createMemberUser("msg-read-self-sender");
    const recipient = await createMemberUser("msg-read-self-recipient");

    const sendRes = await sender.agent
      .post("/api/internal-messages")
      .send({ recipientId: recipient.id, subject: "Self", body: "Body" });
    expect(sendRes.status).toBe(201);
    const messageId: number = sendRes.body.id;

    const res = await sender.agent.patch(`/api/internal-messages/${messageId}/read`);
    expect(res.status).toBe(200);
  });

  it("an admin can mark any message as read", async () => {
    const sender = await createMemberUser("msg-read-admin-sender");
    const recipient = await createMemberUser("msg-read-admin-recipient");
    const admin = await createAdminUser("msg-read-admin");

    const sendRes = await sender.agent
      .post("/api/internal-messages")
      .send({ recipientId: recipient.id, subject: "Admin", body: "Body" });
    expect(sendRes.status).toBe(201);
    const messageId: number = sendRes.body.id;

    const res = await admin.agent.patch(`/api/internal-messages/${messageId}/read`);
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// Internal tickets — authentication, authorisation, and scoping
// ---------------------------------------------------------------------------

describe("internal-tickets — access control", () => {
  it("returns 401 for anonymous GET /internal-tickets", async () => {
    const res = await anonymousAgent().get("/api/internal-tickets");
    expect(res.status).toBe(401);
  });

  it("returns 401 for anonymous POST /internal-tickets", async () => {
    const res = await anonymousAgent()
      .post("/api/internal-tickets")
      .send({ subject: "Help", body: "Need help" });
    expect(res.status).toBe(401);
  });

  it("returns 401 for anonymous PATCH /internal-tickets/:id", async () => {
    const res = await anonymousAgent()
      .patch("/api/internal-tickets/1")
      .send({ status: "closed" });
    expect(res.status).toBe(401);
  });

  it("a member can only see their own tickets, not another member's", async () => {
    const memberA = await createMemberUser("ticket-scope-a");
    const memberB = await createMemberUser("ticket-scope-b");

    // A creates a ticket.
    const createRes = await memberA.agent
      .post("/api/internal-tickets")
      .send({ department: "support", subject: "My issue", description: "Please help", priority: "normal" });
    expect(createRes.status).toBe(201);
    const ticketId: number = createRes.body.id;

    // B lists tickets — should not see A's ticket.
    const bList = await memberB.agent.get("/api/internal-tickets");
    expect(bList.status).toBe(200);
    const bIds = (bList.body as { id: number }[]).map((t) => t.id);
    expect(bIds).not.toContain(ticketId);

    // A lists tickets — should see their own.
    const aList = await memberA.agent.get("/api/internal-tickets");
    expect(aList.status).toBe(200);
    const aIds = (aList.body as { id: number }[]).map((t) => t.id);
    expect(aIds).toContain(ticketId);
  });

  it("an admin sees all tickets including those created by any member", async () => {
    const member = await createMemberUser("ticket-admin-view-member");
    const admin = await createAdminUser("ticket-admin-viewer");

    const createRes = await member.agent
      .post("/api/internal-tickets")
      .send({ department: "support", subject: "Admin can see this", description: "Details", priority: "normal" });
    expect(createRes.status).toBe(201);
    const ticketId: number = createRes.body.id;

    const adminList = await admin.agent.get("/api/internal-tickets");
    expect(adminList.status).toBe(200);
    const adminIds = (adminList.body as { id: number }[]).map((t) => t.id);
    expect(adminIds).toContain(ticketId);
  });

  it("a regular member cannot update a ticket (requireAdmin)", async () => {
    const member = await createMemberUser("ticket-patch-member");

    // Create a ticket first so there is a real ID to try patching.
    const createRes = await member.agent
      .post("/api/internal-tickets")
      .send({ department: "support", subject: "My ticket", description: "Details", priority: "normal" });
    expect(createRes.status).toBe(201);
    const ticketId: number = createRes.body.id;

    const res = await member.agent
      .patch(`/api/internal-tickets/${ticketId}`)
      .send({ status: "closed" });
    expect(res.status).toBe(403);
  });

  it("an admin can update a ticket", async () => {
    const member = await createMemberUser("ticket-patch-owner");
    const admin = await createAdminUser("ticket-patch-admin");

    const createRes = await member.agent
      .post("/api/internal-tickets")
      .send({ department: "support", subject: "Need update", description: "Details", priority: "normal" });
    expect(createRes.status).toBe(201);
    const ticketId: number = createRes.body.id;

    const res = await admin.agent
      .patch(`/api/internal-tickets/${ticketId}`)
      .send({ status: "closed" });
    expect(res.status).toBe(200);
  });
});
