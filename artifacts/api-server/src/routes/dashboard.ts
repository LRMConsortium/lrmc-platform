import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import {
  db,
  membershipsTable,
  driversTable,
  ridesTable,
  landListingsTable,
  constructionProjectsTable,
  marketplaceListingsTable,
  youthEmploymentRecordsTable,
  prospectLeadsTable,
  internalTicketsTable,
  internalMessagesTable,
  riskEventsTable,
  treasuryAccountsTable,
  liquiditySnapshotsTable,
  currencyRatesTable,
  settlementObligationsTable,
  treasuryTransactionsTable,
  propertyListingsTable,
} from "@workspace/db";
import {
  GetAdminDashboardResponse,
  GetMemberDashboardResponse,
} from "@workspace/api-zod";
import { requireAuth, requireAdmin, requireApprovedMembership } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/dashboard/admin", requireAdmin, async (_req, res): Promise<void> => {
  const [totalMembers] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(membershipsTable)
    .where(eq(membershipsTable.status, "active"));
  const [pendingMemberships] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(membershipsTable)
    .where(eq(membershipsTable.status, "pending"));
  const [activeRides] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(ridesTable)
    .where(eq(ridesTable.status, "in_progress"));
  const [openTickets] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(internalTicketsTable)
    .where(eq(internalTicketsTable.status, "open"));
  const [openRiskEvents] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(riskEventsTable)
    .where(eq(riskEventsTable.status, "open"));

  const [
    [{ count: totalDrivers }],
    [{ count: totalLandListings }],
    [{ count: totalConstructionProjects }],
    [{ count: totalMarketplaceListings }],
    [{ count: totalYouthRecords }],
    [{ count: totalProspectLeads }],
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(driversTable),
    db.select({ count: sql<number>`count(*)::int` }).from(landListingsTable),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(constructionProjectsTable),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(marketplaceListingsTable),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(youthEmploymentRecordsTable),
    db.select({ count: sql<number>`count(*)::int` }).from(prospectLeadsTable),
  ]);

  const [usdAccount] = await db
    .select()
    .from(treasuryAccountsTable)
    .where(eq(treasuryAccountsTable.type, "usd_reserve"));
  const [gmdAccount] = await db
    .select()
    .from(treasuryAccountsTable)
    .where(eq(treasuryAccountsTable.type, "gmd_operational"));
  const [latestSnapshot] = await db
    .select()
    .from(liquiditySnapshotsTable)
    .orderBy(sql`${liquiditySnapshotsTable.createdAt} desc`)
    .limit(1);
  const [latestRate] = await db
    .select()
    .from(currencyRatesTable)
    .orderBy(sql`${currencyRatesTable.updatedAt} desc`)
    .limit(1);
  const [{ pendingSettlementsCents }] = await db
    .select({
      pendingSettlementsCents: sql<number>`coalesce(sum(${settlementObligationsTable.amountCents}), 0)::int`,
    })
    .from(settlementObligationsTable)
    .where(eq(settlementObligationsTable.status, "pending"));
  const recentTransactions = await db
    .select()
    .from(treasuryTransactionsTable)
    .orderBy(sql`${treasuryTransactionsTable.createdAt} desc`)
    .limit(10);

  if (!latestRate) {
    res.status(500).json({ error: "No currency rate configured" });
    return;
  }

  res.json(
    GetAdminDashboardResponse.parse({
      totalMembers: totalMembers.count,
      pendingMemberships: pendingMemberships.count,
      totalDrivers,
      activeRides: activeRides.count,
      totalLandListings,
      totalConstructionProjects,
      totalMarketplaceListings,
      totalYouthRecords,
      totalProspectLeads,
      openTickets: openTickets.count,
      openRiskEvents: openRiskEvents.count,
      treasurySummary: {
        totalUsdReservesCents: usdAccount?.balanceCents ?? 0,
        totalGmdOperationalCents: gmdAccount?.balanceCents ?? 0,
        reserveRatio: latestSnapshot?.reserveRatio ?? 0,
        latestRate,
        openRiskEvents: openRiskEvents.count,
        pendingSettlementsCents,
        recentTransactions,
      },
    }),
  );
});

router.get("/dashboard/member", requireAuth, requireApprovedMembership, async (req, res): Promise<void> => {
  const userId = req.session.userId!;

  const [membership] = await db
    .select()
    .from(membershipsTable)
    .where(eq(membershipsTable.userId, userId));

  const [{ propertyListingsCount }] = await db
    .select({ propertyListingsCount: sql<number>`count(*)::int` })
    .from(propertyListingsTable)
    .where(eq(propertyListingsTable.ownerId, userId));

  const [{ rideCount }] = await db
    .select({ rideCount: sql<number>`count(*)::int` })
    .from(ridesTable)
    .where(eq(ridesTable.riderId, userId));

  const [{ unreadMessages }] = await db
    .select({ unreadMessages: sql<number>`count(*)::int` })
    .from(internalMessagesTable)
    .where(
      sql`${internalMessagesTable.recipientId} = ${userId} and ${internalMessagesTable.readAt} is null`,
    );

  const [{ openTickets }] = await db
    .select({ openTickets: sql<number>`count(*)::int` })
    .from(internalTicketsTable)
    .where(
      sql`${internalTicketsTable.createdById} = ${userId} and ${internalTicketsTable.status} != 'closed'`,
    );

  if (!membership) {
    res.status(404).json({ error: "No membership found for this user" });
    return;
  }

  res.json(
    GetMemberDashboardResponse.parse({
      membership,
      propertyListingsCount,
      rideCount,
      unreadMessages,
      openTickets,
    }),
  );
});

export default router;
