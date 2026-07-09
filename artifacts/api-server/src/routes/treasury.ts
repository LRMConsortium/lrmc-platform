import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import {
  db,
  treasuryAccountsTable,
  treasuryTransactionsTable,
  treasuryReservesTable,
  liquiditySnapshotsTable,
  currencyRatesTable,
  treasuryAuditLogsTable,
  settlementObligationsTable,
  riskEventsTable,
} from "@workspace/db";
import { requireAdmin } from "../middlewares/authz";
import {
  ListTreasuryAccountsResponse,
  ListTreasuryTransactionsResponse,
  ListTreasuryReservesResponse,
  ListLiquiditySnapshotsResponse,
  ListCurrencyRatesResponse,
  ListTreasuryAuditLogsResponse,
  GetTreasuryOverviewResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.use(requireAdmin);

router.get("/treasury/accounts", async (_req, res): Promise<void> => {
  const rows = await db.select().from(treasuryAccountsTable);
  res.json(ListTreasuryAccountsResponse.parse(rows));
});

router.get("/treasury/transactions", async (req, res): Promise<void> => {
  const accountId = typeof req.query.accountId === "string" ? Number(req.query.accountId) : undefined;
  const rows = accountId
    ? await db.select().from(treasuryTransactionsTable).where(eq(treasuryTransactionsTable.accountId, accountId))
    : await db.select().from(treasuryTransactionsTable).orderBy(treasuryTransactionsTable.createdAt);
  res.json(ListTreasuryTransactionsResponse.parse(rows));
});

router.get("/treasury/reserves", async (_req, res): Promise<void> => {
  const rows = await db.select().from(treasuryReservesTable).orderBy(treasuryReservesTable.asOfDate);
  res.json(ListTreasuryReservesResponse.parse(rows));
});

router.get("/treasury/liquidity-snapshots", async (_req, res): Promise<void> => {
  const rows = await db.select().from(liquiditySnapshotsTable).orderBy(liquiditySnapshotsTable.asOfDate);
  res.json(ListLiquiditySnapshotsResponse.parse(rows));
});

router.get("/treasury/currency-rates", async (_req, res): Promise<void> => {
  const rows = await db.select().from(currencyRatesTable).orderBy(currencyRatesTable.asOf);
  res.json(ListCurrencyRatesResponse.parse(rows));
});

router.get("/treasury/audit-logs", async (_req, res): Promise<void> => {
  const rows = await db.select().from(treasuryAuditLogsTable).orderBy(treasuryAuditLogsTable.createdAt);
  res.json(ListTreasuryAuditLogsResponse.parse(rows));
});

router.get("/treasury/overview", async (_req, res): Promise<void> => {
  const accounts = await db.select().from(treasuryAccountsTable);
  const usdReserve = accounts
    .filter((a) => a.currency === "USD")
    .reduce((sum, a) => sum + a.balance, 0);
  const gmdOperational = accounts
    .filter((a) => a.currency === "GMD")
    .reduce((sum, a) => sum + a.balance, 0);

  const ususuTransactions = await db
    .select()
    .from(treasuryTransactionsTable)
    .where(eq(treasuryTransactionsTable.category, "ususu_revenue"));
  const ususuRevenueToDateGmd = ususuTransactions.reduce((sum, t) => sum + t.amount, 0);

  const pendingSettlements = await db
    .select()
    .from(settlementObligationsTable)
    .where(eq(settlementObligationsTable.status, "scheduled"));
  const pendingSettlementsTotal = pendingSettlements.reduce((sum, s) => sum + s.amount, 0);

  const openRisk = await db.select().from(riskEventsTable).where(eq(riskEventsTable.status, "open"));

  const [latestReserve] = await db
    .select()
    .from(treasuryReservesTable)
    .orderBy(treasuryReservesTable.asOfDate)
    .limit(1);

  const recentTransactions = await db
    .select()
    .from(treasuryTransactionsTable)
    .orderBy(treasuryTransactionsTable.createdAt)
    .limit(10);

  res.json(
    GetTreasuryOverviewResponse.parse({
      totalUsdReserve: usdReserve,
      totalGmdOperational: gmdOperational,
      reserveRatio: latestReserve?.reserveRatio ?? 0,
      ususuRevenueToDateGmd,
      pendingSettlementsTotal,
      openRiskEvents: openRisk.length,
      recentTransactions: recentTransactions.reverse(),
    }),
  );
});

export default router;
