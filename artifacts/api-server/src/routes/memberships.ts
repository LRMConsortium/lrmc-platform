import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, membershipsTable } from "@workspace/db";
import {
  ListMembershipsQueryParams,
  ListMembershipsResponse,
  CreateMembershipBody,
  CreateMembershipResponse,
  GetMyMembershipResponse,
  UpdateMembershipParams,
  UpdateMembershipBody,
  UpdateMembershipResponse,
  CheckoutMembershipParams,
  CheckoutMembershipBody,
  CheckoutMembershipResponse,
  SubmitMembershipKycParams,
  SubmitMembershipKycBody,
  SubmitMembershipKycResponse,
  ReviewMembershipKycParams,
  ReviewMembershipKycBody,
  ReviewMembershipKycResponse,
} from "@workspace/api-zod";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import { isOwnerOrAdmin } from "../middlewares/authz";
import {
  createMembershipCheckoutSession,
  getMembershipFeeCents,
} from "../lib/membershipStripe";

const router: IRouter = Router();

// Self-service registration is intentionally limited to the tiers actually
// offered on the membership signup form (see membershipStripe.ts fee
// schedule). Other type strings (e.g. legacy "property_owner" applications)
// are assigned out-of-band by an admin, not chosen by the registering user.
const SELF_SERVICE_MEMBERSHIP_TYPES = new Set(["basic", "premium", "corporate"]);

router.get("/memberships", requireAdmin, async (req, res): Promise<void> => {
  const query = ListMembershipsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const rows = query.data.status
    ? await db
        .select()
        .from(membershipsTable)
        .where(eq(membershipsTable.status, query.data.status))
    : await db.select().from(membershipsTable);

  res.json(ListMembershipsResponse.parse(rows));
});

router.post("/memberships", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateMembershipBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  if (!SELF_SERVICE_MEMBERSHIP_TYPES.has(parsed.data.type)) {
    res.status(400).json({ error: "Invalid membership type" });
    return;
  }

  // Free tiers have nothing to charge, so mark them paid immediately --
  // they skip straight to the KYC step instead of a $0 checkout session.
  const feeCents = getMembershipFeeCents(parsed.data.type);

  const [membership] = await db
    .insert(membershipsTable)
    .values({
      ...parsed.data,
      userId: req.session.userId!,
      paymentStatus: feeCents === 0 ? "paid" : "unpaid",
    })
    .returning();

  res.status(201).json(CreateMembershipResponse.parse(membership));
});

router.get("/memberships/me", requireAuth, async (req, res): Promise<void> => {
  const [membership] = await db
    .select()
    .from(membershipsTable)
    .where(eq(membershipsTable.userId, req.session.userId!));

  if (!membership) {
    res.status(404).json({ error: "No membership found" });
    return;
  }

  res.json(GetMyMembershipResponse.parse(membership));
});

router.patch("/memberships/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = UpdateMembershipParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateMembershipBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [membership] = await db
    .update(membershipsTable)
    .set(parsed.data)
    .where(eq(membershipsTable.id, params.data.id))
    .returning();

  if (!membership) {
    res.status(404).json({ error: "Membership not found" });
    return;
  }

  res.json(UpdateMembershipResponse.parse(membership));
});

router.post("/memberships/:id/checkout", requireAuth, async (req, res): Promise<void> => {
  const params = CheckoutMembershipParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = CheckoutMembershipBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [membership] = await db
    .select()
    .from(membershipsTable)
    .where(eq(membershipsTable.id, params.data.id));

  if (!membership) {
    res.status(404).json({ error: "Membership not found" });
    return;
  }

  if (!isOwnerOrAdmin(req, membership.userId)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  if (membership.paymentStatus === "paid") {
    res.status(409).json({ error: "Membership fee already paid" });
    return;
  }

  const { checkoutUrl, sessionId } = await createMembershipCheckoutSession({
    membershipId: membership.id,
    type: membership.type,
    buyerEmail: parsed.data.buyerEmail,
    feeCents: getMembershipFeeCents(membership.type),
  });

  await db
    .update(membershipsTable)
    .set({ stripeCheckoutSessionId: sessionId })
    .where(eq(membershipsTable.id, membership.id));

  res.json(CheckoutMembershipResponse.parse({ checkoutUrl }));
});

router.post("/memberships/:id/kyc", requireAuth, async (req, res): Promise<void> => {
  const params = SubmitMembershipKycParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = SubmitMembershipKycBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db
    .select()
    .from(membershipsTable)
    .where(eq(membershipsTable.id, params.data.id));

  if (!existing) {
    res.status(404).json({ error: "Membership not found" });
    return;
  }

  if (!isOwnerOrAdmin(req, existing.userId)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  if (existing.paymentStatus !== "paid") {
    res.status(409).json({ error: "Membership fee not paid yet" });
    return;
  }

  const [membership] = await db
    .update(membershipsTable)
    .set({
      kycFullName: parsed.data.fullName,
      kycIdType: parsed.data.idType,
      kycIdNumber: parsed.data.idNumber,
      kycStatus: "pending",
      kycNotes: null,
      kycSubmittedAt: new Date(),
      kycReviewedAt: null,
    })
    .where(eq(membershipsTable.id, params.data.id))
    .returning();

  res.json(SubmitMembershipKycResponse.parse(membership));
});

router.patch("/memberships/:id/kyc", requireAdmin, async (req, res): Promise<void> => {
  const params = ReviewMembershipKycParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = ReviewMembershipKycBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db
    .select()
    .from(membershipsTable)
    .where(eq(membershipsTable.id, params.data.id));

  if (!existing) {
    res.status(404).json({ error: "Membership not found" });
    return;
  }

  if (existing.kycStatus !== "pending") {
    res.status(409).json({ error: "No pending KYC submission to review" });
    return;
  }

  const approved = parsed.data.action === "approve";

  const [membership] = await db
    .update(membershipsTable)
    .set({
      kycStatus: approved ? "approved" : "rejected",
      kycNotes: parsed.data.notes ?? null,
      kycReviewedAt: new Date(),
      status: approved ? "active" : existing.status,
    })
    .where(eq(membershipsTable.id, params.data.id))
    .returning();

  res.json(ReviewMembershipKycResponse.parse(membership));
});

export default router;
