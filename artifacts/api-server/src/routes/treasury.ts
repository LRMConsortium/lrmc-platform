import { Router, type IRouter } from "express";
import { desc, eq, sql } from "drizzle-orm";
import {
  db,
  treasuryAccountsTable,
  treasuryTransactionsTable,
  liquiditySnapshotsTable,
  currencyRatesTable,
  riskEventsTable,
  settlementObligationsTable,
} from "@workspace/db";
import {
  ListTreasuryAccountsResponse,
  ListTreasuryTransactionsResponse,
  ListLiquiditySnapshotsResponse,
  ListCurrencyRatesResponse,
  GetTreasurySummaryResponse,
} from "@workspace/api-zod";
import { requireAdmin } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/treasury/accounts", requireAdmin, async (_req, res): Promise<void> => {
  const rows = await db.select().from(treasuryAccountsTable);
  res.json(ListTreasuryAccountsResponse.parse(rows));
});

router.get(
  "/treasury/transactions",
  requireAdmin,
  async (_req, res): Promise<void> => {
    const rows = await db
      .select()
      .from(treasuryTransactionsTable)
      .orderBy(desc(treasuryTransactionsTable.createdAt));
    res.json(ListTreasuryTransactionsResponse.parse(rows));
  },
);

router.get(
  "/treasury/liquidity-snapshots",
  requireAdmin,
  async (_req, res): Promise<void> => {
    const rows = await db
      .select()
      .from(liquiditySnapshotsTable)
      .orderBy(desc(liquiditySnapshotsTable.createdAt));
    res.json(ListLiquiditySnapshotsResponse.parse(rows));
  },
);

router.get(
  "/treasury/currency-rates",
  requireAdmin,
  async (_req, res): Promise<void> => {
    const rows = await db.select().from(currencyRatesTable);
    res.json(ListCurrencyRatesResponse.parse(rows));
  },
);

router.get("/treasury/summary", requireAdmin, async (_req, res): Promise<void> => {
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
    .orderBy(desc(liquiditySnapshotsTable.createdAt))
    .limit(1);

  const [latestRate] = await db
    .select()
    .from(currencyRatesTable)
    .orderBy(desc(currencyRatesTable.updatedAt))
    .limit(1);

  const [{ openRiskEvents }] = await db
    .select({ openRiskEvents: sql<number>`count(*)::int` })
    .from(riskEventsTable)
    .where(eq(riskEventsTable.status, "open"));

  const [{ pendingSettlementsCents }] = await db
    .select({
      pendingSettlementsCents: sql<number>`coalesce(sum(${settlementObligationsTable.amountCents}), 0)::int`,
    })
    .from(settlementObligationsTable)
    .where(eq(settlementObligationsTable.status, "pending"));

  const recentTransactions = await db
    .select()
    .from(treasuryTransactionsTable)
    .orderBy(desc(treasuryTransactionsTable.createdAt))
    .limit(10);

  if (!latestRate) {
    res.status(500).json({ error: "No currency rate configured" });
    return;
  }

  res.json(
    GetTreasurySummaryResponse.parse({
      totalUsdReservesCents: usdAccount?.balanceCents ?? 0,
      totalGmdOperationalCents: gmdAccount?.balanceCents ?? 0,
      reserveRatio: latestSnapshot?.reserveRatio ?? 0,
      latestRate,
      openRiskEvents,
      pendingSettlementsCents,
      recentTransactions,
    }),
  );
});

export default router;
