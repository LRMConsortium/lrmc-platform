import { Router, type IRouter } from "express";
import { and, eq, gte } from "drizzle-orm";
import {
  db,
  membershipsTable,
  assetsTable,
  landListingsTable,
  constructionProjectsTable,
  driversTable,
  ridesTable,
  marketplaceListingsTable,
  paymentsTable,
  youthEmploymentRecordsTable,
  internalMessagesTable,
  internalTicketsTable,
  prospectLeadsTable,
  treasuryAccountsTable,
  treasuryTransactionsTable,
  settlementObligationsTable,
  riskEventsTable,
  treasuryReservesTable,
} from "@workspace/db";
import { requireAuth, requireAdmin } from "../middlewares/authz";
import {
  GetMemberDashboardQueryParams,
  GetMemberDashboardResponse,
  GetAdminDashboardResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/dashboard/member", requireAuth, async (req, res): Promise<void> => {
  const params = GetMemberDashboardQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const userId = req.user!.role === "admin" ? params.data.userId : req.user!.id;

  const [memberships, assets, rides, messages, tickets, payments] = await Promise.all([
    db.select().from(membershipsTable).where(eq(membershipsTable.userId, userId)),
    db.select().from(assetsTable).where(eq(assetsTable.ownerId, userId)),
    db.select().from(ridesTable).where(eq(ridesTable.riderId, userId)),
    db.select().from(internalMessagesTable),
    db.select().from(internalTicketsTable).where(eq(internalTicketsTable.createdBy, userId)),
    db.select().from(paymentsTable).where(eq(paymentsTable.userId, userId)),
  ]);

  res.json(
    GetMemberDashboardResponse.parse({
      memberships,
      assetsCount: assets.length,
      ridesCount: rides.length,
      unreadMessages: messages.filter((m) => !m.isRead).length,
      openTickets: tickets.filter((t) => t.status === "open" || t.status === "in_progress").length,
      recentPayments: payments.slice(-10).reverse(),
    }),
  );
});

router.get("/dashboard/admin", requireAdmin, async (_req, res): Promise<void> => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [
    memberships,
    assets,
    landListings,
    constructionProjects,
    drivers,
    rides,
    marketplaceListings,
    youthRecords,
    tickets,
    leads,
    accounts,
    ususuTransactions,
    pendingSettlements,
    openRisk,
    latestReserve,
    recentTransactions,
    payments,
  ] = await Promise.all([
    db.select().from(membershipsTable),
    db.select().from(assetsTable),
    db.select().from(landListingsTable),
    db.select().from(constructionProjectsTable),
    db.select().from(driversTable),
    db.select().from(ridesTable),
    db.select().from(marketplaceListingsTable),
    db.select().from(youthEmploymentRecordsTable),
    db.select().from(internalTicketsTable),
    db.select().from(prospectLeadsTable),
    db.select().from(treasuryAccountsTable),
    db.select().from(treasuryTransactionsTable).where(eq(treasuryTransactionsTable.category, "ususu_revenue")),
    db.select().from(settlementObligationsTable).where(eq(settlementObligationsTable.status, "scheduled")),
    db.select().from(riskEventsTable).where(eq(riskEventsTable.status, "open")),
    db.select().from(treasuryReservesTable).orderBy(treasuryReservesTable.asOfDate).limit(1),
    db.select().from(treasuryTransactionsTable).orderBy(treasuryTransactionsTable.createdAt).limit(10),
    db.select().from(paymentsTable).where(and(eq(paymentsTable.category, "digital_product"))),
  ]);

  const usdReserve = accounts.filter((a) => a.currency === "USD").reduce((s, a) => s + a.balance, 0);
  const gmdOperational = accounts.filter((a) => a.currency === "GMD").reduce((s, a) => s + a.balance, 0);
  const ridesCompletedToday = rides.filter(
    (r) => r.status === "completed" && r.completedAt && new Date(r.completedAt) >= startOfDay,
  ).length;

  res.json(
    GetAdminDashboardResponse.parse({
      totalMembers: new Set(memberships.map((m) => m.userId)).size,
      activeMemberships: memberships.filter((m) => m.status === "active").length,
      pendingMemberships: memberships.filter((m) => m.status === "pending").length,
      totalAssets: assets.length,
      totalLandListings: landListings.length,
      totalConstructionProjects: constructionProjects.length,
      activeDrivers: drivers.filter((d) => d.status === "approved").length,
      ridesInProgress: rides.filter((r) => r.status === "in_progress" || r.status === "accepted").length,
      ridesCompletedToday,
      marketplaceListings: marketplaceListings.length,
      digitalProductSales: payments.length,
      youthPlacements: youthRecords.filter((y) => y.status === "placed" || y.status === "completed").length,
      openTickets: tickets.filter((t) => t.status === "open" || t.status === "in_progress").length,
      newLeads: leads.filter((l) => l.status === "new").length,
      treasury: {
        totalUsdReserve: usdReserve,
        totalGmdOperational: gmdOperational,
        reserveRatio: latestReserve[0]?.reserveRatio ?? 0,
        ususuRevenueToDateGmd: ususuTransactions.reduce((s, t) => s + t.amount, 0),
        pendingSettlementsTotal: pendingSettlements.reduce((s, o) => s + o.amount, 0),
        openRiskEvents: openRisk.length,
        recentTransactions: recentTransactions.reverse(),
      },
    }),
  );
});

export default router;
