import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, pool } from "./index";
import {
  usersTable,
  membershipsTable,
  propertyListingsTable,
  landListingsTable,
  landTransactionsTable,
  constructionContractorsTable,
  constructionProjectsTable,
  driversTable,
  ridesTable,
  marketplaceListingsTable,
  digitalProductsTable,
  adsTable,
  youthEmploymentRecordsTable,
  prospectLeadsTable,
  treasuryAccountsTable,
  treasuryTransactionsTable,
  liquiditySnapshotsTable,
  currencyRatesTable,
  riskEventsTable,
  settlementObligationsTable,
  internalMessagesTable,
  internalTicketsTable,
} from "./schema";

async function main() {
  console.log("Seeding LRMC / Ususu demo data...");

  const passwordHash = await bcrypt.hash("Password123!", 10);

  const [admin, fatou, lamin, awa, ousman, binta] = await db
    .insert(usersTable)
    .values([
      {
        email: "admin@lrmc.gm",
        passwordHash,
        fullName: "Isatou Jallow",
        phone: "+220 220 1001",
        role: "admin",
      },
      {
        email: "fatou.ceesay@lrmc.gm",
        passwordHash,
        fullName: "Fatou Ceesay",
        phone: "+220 220 1002",
        role: "member",
      },
      {
        email: "lamin.jatta@lrmc.gm",
        passwordHash,
        fullName: "Lamin Jatta",
        phone: "+220 220 1003",
        role: "member",
      },
      {
        email: "awa.sanneh@lrmc.gm",
        passwordHash,
        fullName: "Awa Sanneh",
        phone: "+220 220 1004",
        role: "member",
      },
      {
        email: "ousman.touray@lrmc.gm",
        passwordHash,
        fullName: "Ousman Touray",
        phone: "+220 220 1005",
        role: "member",
      },
      {
        email: "binta.njie@lrmc.gm",
        passwordHash,
        fullName: "Binta Njie",
        phone: "+220 220 1006",
        role: "member",
      },
    ])
    .returning();

  await db.insert(membershipsTable).values([
    { userId: fatou.id, type: "property_owner", feePaidCents: 500000, status: "active" },
    { userId: lamin.id, type: "land_seller", feePaidCents: 350000, status: "active" },
    { userId: awa.id, type: "construction_contractor", feePaidCents: 750000, status: "active" },
    { userId: ousman.id, type: "ususu_driver", feePaidCents: 150000, status: "active" },
    { userId: binta.id, type: "renter", feePaidCents: 50000, status: "pending" },
  ]);

  await db.insert(propertyListingsTable).values([
    {
      ownerId: fatou.id,
      category: "property",
      title: "Three-Bedroom Villa in Fajara",
      location: "Fajara, Kanifing",
      priceCents: 4500000,
      status: "active",
    },
    {
      ownerId: fatou.id,
      category: "resort",
      title: "Kotu Beach Resort Suite",
      location: "Kotu, Kanifing",
      priceCents: 8200000,
      status: "active",
    },
    {
      ownerId: lamin.id,
      category: "vehicle",
      title: "2021 Toyota Hiace Minibus",
      location: "Serrekunda",
      priceCents: 1200000,
      status: "active",
    },
    {
      ownerId: fatou.id,
      category: "airbnb",
      title: "Cape Point Ocean-View Apartment",
      location: "Bakau",
      priceCents: 3100000,
      status: "rented",
    },
  ]);

  const [landListing1, landListing2] = await db
    .insert(landListingsTable)
    .values([
      {
        sellerId: lamin.id,
        title: "Riverside Plot near Brikama",
        location: "Brikama, West Coast Region",
        priceCents: 6000000,
        sizeAcres: 2,
        status: "available",
      },
      {
        sellerId: lamin.id,
        title: "Commercial Plot in Latrikunda",
        location: "Latrikunda, Kanifing",
        priceCents: 9500000,
        sizeAcres: 1,
        status: "available",
      },
    ])
    .returning();

  await db.insert(landTransactionsTable).values([
    {
      listingId: landListing1.id,
      buyerId: awa.id,
      amountCents: landListing1.priceCents,
      status: "pending",
    },
  ]);
  await db
    .update(landListingsTable)
    .set({ status: "under_contract" })
    .where(eq(landListingsTable.id, landListing1.id));

  const [contractor1] = await db
    .insert(constructionContractorsTable)
    .values([
      {
        userId: awa.id,
        companyName: "Sanneh & Sons Builders",
        specialty: "Residential Construction",
        rating: 5,
      },
    ])
    .returning();

  await db.insert(constructionProjectsTable).values([
    {
      contractorId: contractor1.id,
      title: "Bijilo Family Compound",
      location: "Bijilo, Kanifing",
      budgetCents: 15000000,
      status: "in_progress",
    },
    {
      contractorId: contractor1.id,
      title: "Sukuta Community Market Stalls",
      location: "Sukuta, West Coast Region",
      budgetCents: 8000000,
      status: "planning",
    },
  ]);

  const [driver1] = await db
    .insert(driversTable)
    .values([
      {
        userId: ousman.id,
        vehicleInfo: "Grey Toyota Corolla — GM 4521 B",
        status: "approved",
        rating: 5,
      },
    ])
    .returning();

  await db.insert(ridesTable).values([
    {
      riderId: fatou.id,
      driverId: driver1.id,
      pickup: "Senegambia Strip, Kololi",
      dropoff: "Banjul International Airport",
      fareCents: 45000,
      status: "completed",
    },
    {
      riderId: binta.id,
      driverId: null,
      pickup: "Westfield Junction",
      dropoff: "Brikama Market",
      fareCents: 25000,
      status: "requested",
    },
  ]);

  await db.insert(marketplaceListingsTable).values([
    {
      sellerId: binta.id,
      title: "Hand-Dyed Batik Fabric Bundle",
      description: "6 yards of traditional Gambian batik fabric, hand-dyed in Brikama.",
      priceCents: 250000,
      category: "textiles",
      status: "active",
    },
    {
      sellerId: lamin.id,
      title: "Fresh Cashew Nuts — 25kg Sack",
      description: "Locally harvested cashew nuts from West Coast Region farms.",
      priceCents: 1800000,
      category: "agriculture",
      status: "active",
    },
  ]);

  await db.insert(digitalProductsTable).values([
    {
      title: "LRMC Landlord Toolkit (PDF Guide)",
      description: "Rental agreements, tenant vetting checklists, and Dalasi rent calculators.",
      priceCents: 50000,
      category: "guides",
    },
    {
      title: "Ususu Driver Onboarding Course",
      description: "Video course covering safety, routes, and passenger service standards.",
      priceCents: 75000,
      category: "training",
    },
  ]);

  await db.insert(adsTable).values([
    {
      advertiserId: fatou.id,
      title: "Kotu Beach Resort — Book Your Suite Today",
      content: "Ocean views, breakfast included. Ask about member discounts.",
      placement: "homepage",
      status: "active",
    },
    {
      advertiserId: lamin.id,
      title: "Riverside Plots Now Selling in Brikama",
      content: "Prime land near the river, flexible payment plans available.",
      placement: "marketplace",
      status: "pending",
    },
  ]);

  await db.insert(youthEmploymentRecordsTable).values([
    {
      userId: binta.id,
      program: "Digital Skills & Marketplace Selling",
      status: "training",
      placementCompany: null,
    },
    {
      userId: ousman.id,
      program: "Ususu Driver Certification",
      status: "placed",
      placementCompany: "Ususu by LRMC",
    },
  ]);

  await db.insert(prospectLeadsTable).values([
    {
      name: "Serrekunda Agro-Processors Cooperative",
      contact: "info@serrekundaagro.gm",
      sector: "Agriculture",
      status: "contacted",
      notes: "Interested in bulk marketplace listing and export financing.",
    },
    {
      name: "Banjul Tourism Collective",
      contact: "+220 220 9988",
      sector: "Hospitality",
      status: "new",
      notes: "Referred by a resort member for potential membership.",
    },
  ]);

  const [usdAccount, gmdAccount] = await db
    .insert(treasuryAccountsTable)
    .values([
      { name: "LRMC USD Reserve", currency: "USD", balanceCents: 128000000, type: "usd_reserve" },
      { name: "LRMC GMD Operational", currency: "GMD", balanceCents: 950000000, type: "gmd_operational" },
    ])
    .returning();

  await db.insert(treasuryTransactionsTable).values([
    {
      accountId: gmdAccount.id,
      type: "fee_revenue",
      amountCents: 1250000,
      description: "Membership fees collected — weekly batch",
    },
    {
      accountId: usdAccount.id,
      type: "deposit",
      amountCents: 5000000,
      description: "Diaspora remittance pool deposit",
    },
    {
      accountId: gmdAccount.id,
      type: "payout",
      amountCents: 900000,
      description: "Ususu driver payouts — weekly settlement",
    },
  ]);

  await db.insert(liquiditySnapshotsTable).values([
    {
      totalUsdCents: 128000000,
      totalGmdCents: 950000000,
      reserveRatio: 0.42,
    },
  ]);

  await db.insert(currencyRatesTable).values([
    { base: "USD", quote: "GMD", rate: 68.5 },
  ]);

  await db.insert(riskEventsTable).values([
    {
      severity: "medium",
      category: "liquidity",
      description: "GMD operational account below target reserve ratio for Q2.",
      status: "monitoring",
    },
    {
      severity: "low",
      category: "compliance",
      description: "Two land transactions pending KYC document verification.",
      status: "open",
    },
  ]);

  await db.insert(settlementObligationsTable).values([
    {
      description: "Ususu driver weekly payout batch",
      amountCents: 900000,
      dueDate: "2026-07-12",
      status: "pending",
    },
    {
      description: "Construction contractor milestone payment — Bijilo Compound",
      amountCents: 5000000,
      dueDate: "2026-07-20",
      status: "pending",
    },
  ]);

  await db.insert(internalMessagesTable).values([
    {
      senderId: admin.id,
      recipientId: fatou.id,
      subject: "Welcome to LRMC",
      body: "Your property owner membership has been approved. Welcome aboard.",
    },
    {
      senderId: lamin.id,
      recipientId: admin.id,
      subject: "Question about land transaction fees",
      body: "Could you confirm the settlement timeline for my Brikama plot sale?",
    },
  ]);

  await db.insert(internalTicketsTable).values([
    {
      createdById: binta.id,
      department: "membership",
      subject: "Membership fee payment not reflecting",
      description: "I paid my renter membership fee but my status still shows pending.",
      status: "open",
      priority: "normal",
    },
    {
      createdById: ousman.id,
      department: "dispatch",
      subject: "Vehicle inspection scheduling",
      description: "Requesting a slot for my annual Ususu vehicle safety inspection.",
      status: "in_progress",
      priority: "high",
    },
  ]);

  console.log("Seed complete.");
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
