import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { platformSettings } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
const router: IRouter = Router();

/** GET /settings/exchange-rate — public, returns current USD→GMD rate */
router.get("/settings/exchange-rate", async (_req, res) => {
  try {
    const row = await db
      .select()
      .from(platformSettings)
      .where(eq(platformSettings.key, "usd_to_gmd_rate"))
      .limit(1);

    const rate = row[0] ? parseFloat(row[0].value) : 70;
    res.json({ usdToGmd: rate });
  } catch {
    res.json({ usdToGmd: 70 });
  }
});

/** PUT /settings/exchange-rate — admin only, updates USD→GMD rate */
router.put("/settings/exchange-rate", requireAuth, async (req, res) => {
  if (req.user?.role !== "admin") {
    res.status(403).json({ error: "Admin only" });
    return;
  }

  const rate = typeof req.body?.usdToGmd === "number" ? req.body.usdToGmd : null;
  if (rate === null || rate <= 0 || rate > 10000) {
    res.status(400).json({ error: "usdToGmd must be a positive number ≤ 10000" });
    return;
  }

  await db
    .insert(platformSettings)
    .values({ key: "usd_to_gmd_rate", value: String(rate) })
    .onConflictDoUpdate({
      target: platformSettings.key,
      set: { value: String(rate), updatedAt: new Date() },
    });

  res.json({ usdToGmd: rate });
});

export default router;
