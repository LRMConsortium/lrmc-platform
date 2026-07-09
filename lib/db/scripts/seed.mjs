// Demo data seed for LRMC. Run with: node lib/db/scripts/seed.mjs
// Uses raw SQL via `pg` so it has no dependency on a TS runtime.
import pg from "pg";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // ---- Users (synthetic demo members + one admin) ----
    const users = [
      { id: "seed-admin-1", email: "admin@africalrmc.com", firstName: "Fatou", lastName: "Jallow", role: "admin", phone: "+220 700 1000" },
      { id: "seed-member-1", email: "lamin.ceesay@example.com", firstName: "Lamin", lastName: "Ceesay", role: "member", phone: "+220 700 1001" },
      { id: "seed-member-2", email: "awa.touray@example.com", firstName: "Awa", lastName: "Touray", role: "member", phone: "+220 700 1002" },
      { id: "seed-member-3", email: "modou.jallow@example.com", firstName: "Modou", lastName: "Jallow", role: "member", phone: "+220 700 1003" },
      { id: "seed-member-4", email: "isatou.bah@example.com", firstName: "Isatou", lastName: "Bah", role: "member", phone: "+220 700 1004" },
      { id: "seed-member-5", email: "ebrima.sanneh@example.com", firstName: "Ebrima", lastName: "Sanneh", role: "member", phone: "+220 700 1005" },
      { id: "seed-member-6", email: "mariama.jobe@example.com", firstName: "Mariama", lastName: "Jobe", role: "member", phone: "+220 700 1006" },
    ];
    for (const u of users) {
      await client.query(
        `insert into users (id, email, first_name, last_name, role, phone) values ($1,$2,$3,$4,$5,$6)
         on conflict (id) do update set email=$2, first_name=$3, last_name=$4, role=$5, phone=$6`,
        [u.id, u.email, u.firstName, u.lastName, u.role, u.phone],
      );
    }

    // ---- Memberships ----
    const memberships = [
      ["seed-member-1", "vehicle_owner", "active", 1500],
      ["seed-member-2", "airbnb_host", "active", 1500],
      ["seed-member-3", "land_seller", "pending", 2000],
      ["seed-member-4", "construction_contractor", "active", 2500],
      ["seed-member-5", "ususu_driver", "active", 0],
      ["seed-member-6", "renter", "pending", 500],
    ];
    for (const [userId, type, status, fee] of memberships) {
      const paidAt = status === "active" ? new Date() : null;
      await client.query(
        `insert into memberships (user_id, type, status, fee_dalasi, paid_at) values ($1,$2,$3,$4,$5)`,
        [userId, type, status, fee, paidAt],
      );
    }

    // ---- Assets ----
    const assets = [
      ["seed-member-1", "vehicle", "2019 Toyota Vitz — Airport Transfer Ready", "Reliable compact car available for long-term rental.", "Serrekunda", 45000, "active"],
      ["seed-member-2", "airbnb", "Ocean Breeze Studio, Kololi", "Fully furnished studio near the beach with AC and wifi.", "Kololi", 120000, "active"],
      ["seed-member-1", "property", "3-Bedroom Family Compound", "Gated compound with borehole and solar backup.", "Brikama", 950000, "pending_review"],
      ["seed-member-2", "resort", "Baobab Grove Eco-Resort — 2 Rooms", "Riverside eco-resort units for weekend getaways.", "Janjanbureh", 300000, "active"],
    ];
    for (const [ownerId, kind, title, description, location, price, status] of assets) {
      await client.query(
        `insert into assets (owner_id, kind, title, description, location, price_dalasi, status) values ($1,$2,$3,$4,$5,$6,$7)`,
        [ownerId, kind, title, description, location, price, status],
      );
    }

    // ---- Land listings + transactions ----
    const landRes = await client.query(
      `insert into land_listings (seller_id, title, location, size_acres, price_usd, description, status)
       values
       ('seed-member-3','Riverside Development Plot','Kombo North',5,42000,'Prime riverside plot zoned for mixed development.','available'),
       ('seed-member-3','Agricultural Land Parcel','Upper River Region',12,18000,'Fertile land suited for rice and groundnut farming.','available')
       returning id`,
    );
    if (landRes.rows[0]) {
      await client.query(
        `insert into land_transactions (listing_id, buyer_id, amount_usd, status) values ($1,$2,$3,'pending')`,
        [landRes.rows[0].id, "seed-member-4", 42000],
      );
    }

    // ---- Construction ----
    const contractorRes = await client.query(
      `insert into construction_contractors (user_id, company_name, specialty, license_number, status)
       values ('seed-member-4','Jallow & Sons Builders','Residential Construction','GM-CC-2291','verified') returning id`,
    );
    const contractorId = contractorRes.rows[0].id;
    await client.query(
      `insert into construction_projects (contractor_id, title, location, budget_usd, status, start_date, end_date)
       values
       ($1,'LRMC Staff Housing Phase 1','Bijilo',180000,'in_progress','2026-02-01','2026-09-30'),
       ($1,'Community Market Rebuild','Basse',65000,'planning',null,null)`,
      [contractorId],
    );

    // ---- Ususu (drivers + rides) ----
    const driverRes = await client.query(
      `insert into drivers (user_id, vehicle_info, license_number, status, rating)
       values ('seed-member-5','Hyundai Accent — Silver — KM 2 4521','GM-DL-88213','approved',4.8) returning id`,
    );
    const driverId = driverRes.rows[0].id;
    await client.query(
      `insert into rides (rider_id, driver_id, pickup, dropoff, fare_gmd, status, completed_at)
       values
       ('seed-member-6',$1,'Westfield Junction','Kotu Beach',150,'completed', now() - interval '2 hours'),
       ('seed-member-2',$1,'Senegambia','Banjul Ferry Terminal',220,'completed', now() - interval '1 day'),
       ('seed-member-1',null,'Bakau','Fajara',120,'requested', null)`,
      [driverId],
    );

    // ---- Payments (a few standalone, ride payments are created by the app logic normally) ----
    await client.query(
      `insert into payments (user_id, category, amount, currency, status)
       values
       ('seed-member-1','membership',1500,'GMD','completed'),
       ('seed-member-2','membership',1500,'GMD','completed'),
       ('seed-member-6','digital_product',250,'GMD','completed')`,
    );

    // ---- Ads ----
    await client.query(
      `insert into ads (advertiser_id, title, description, placement, budget_usd, status)
       values ('seed-member-2','Book Ocean Breeze Studio This Summer','Promoted listing for the Kololi studio.','website',300,'active')`,
    );

    // ---- Marketplace ----
    await client.query(
      `insert into marketplace_listings (seller_id, title, description, category, price_dalasi, status)
       values
       ('seed-member-3','Handwoven Basket Set','Set of 3 traditional Gambian baskets.','crafts',900,'active'),
       ('seed-member-6','Solar Lantern (Used)','Barely used solar lantern, great condition.','electronics',600,'active')`,
    );

    // ---- Digital products ----
    await client.query(
      `insert into digital_products (title, description, category, price_dalasi, downloads)
       values
       ('Standard Land Sale Agreement Template','LRMC-vetted land sale agreement template.','template',250,14),
       ('Tenancy Agreement — Residential','Ready-to-use residential tenancy agreement.','template',150,32),
       ('Contractor Verification Certificate','Official LRMC contractor verification certificate template.','certificate',400,5)`,
    );

    // ---- Youth employment ----
    await client.query(
      `insert into youth_employment_records (full_name, email, phone, program, status, placement_company)
       values
       ('Fatoumata Ceesay','fatoumata.c@example.com','+220 700 2001','digital_skills','placed','LRMC Marketplace Ops'),
       ('Yusupha Njie','yusupha.n@example.com','+220 700 2002','driving_apprenticeship','in_training',null),
       ('Adama Sowe','adama.s@example.com','+220 700 2003','construction_trades','applied',null)`,
    );

    // ---- Prospect leads (internal CRM) ----
    await client.query(
      `insert into prospect_leads (name, email, phone, source, interest, status, notes)
       values
       ('Ousman Barrow','ousman.barrow@example.com','+220 700 3001','referral','land_purchase','contacted','Interested in Kombo North parcel, follow up next week.'),
       ('Binta Drammeh','binta.d@example.com','+220 700 3002','website','membership','new',''),
       ('Kebba Sowe','kebba.sowe@example.com',null,'event','construction_contract','qualified','Looking to bid on staff housing projects.')`,
    );

    // ---- Internal messages ----
    await client.query(
      `insert into internal_messages (sender_id, mailbox, subject, body, is_read)
       values
       ('seed-admin-1','treasury.internal','Weekly reserve ratio check','Reserve ratio holding above 22% target, no action needed.',false),
       ('seed-admin-1','dispatch.internal','Driver onboarding backlog','3 driver applications pending review in Ususu queue.',false),
       ('seed-admin-1','land.internal','Kombo North parcel offer','Buyer offer received on Riverside Development Plot, review terms.',true)`,
    );

    // ---- Internal tickets ----
    await client.query(
      `insert into internal_tickets (created_by, department, subject, description, status, priority)
       values
       ('seed-member-2','support','Payout delay on Airbnb booking','My last payout for Ocean Breeze Studio has not settled yet.','open','high'),
       ('seed-member-5','dispatch','Vehicle inspection renewal','Need to schedule renewal inspection for Ususu vehicle.','in_progress','medium'),
       ('seed-admin-1','treasury','Reconcile digital product sales','Digital product ledger needs reconciliation for last month.','open','low')`,
    );

    // ---- Treasury accounts ----
    const accountRes = await client.query(
      `insert into treasury_accounts (name, currency, type, balance)
       values
       ('LRMC USD Reserve','USD','reserve',480000),
       ('LRMC GMD Operational Pool','GMD','operational',1250000),
       ('LRMC Payroll Account','GMD','payroll',310000)
       returning id, currency, type`,
    );
    const gmdOperational = accountRes.rows.find((r) => r.currency === "GMD" && r.type === "operational");
    const usdReserve = accountRes.rows.find((r) => r.currency === "USD" && r.type === "reserve");

    await client.query(
      `insert into treasury_transactions (account_id, type, amount, category, description)
       values
       ($1,'credit',150,'ususu_revenue','Ususu ride settlement'),
       ($1,'credit',220,'ususu_revenue','Ususu ride settlement'),
       ($1,'credit',1500,'membership_fee','Vehicle owner membership fee'),
       ($1,'debit',65000,'payroll','Youth employment program payroll'),
       ($2,'credit',42000,'land_sale','Reserve top-up from land sale escrow')`,
      [gmdOperational.id, usdReserve.id],
    );

    // ---- Treasury reserves (history) ----
    await client.query(
      `insert into treasury_reserves (as_of_date, usd_reserve, reserve_ratio)
       values
       (current_date - interval '60 days', 410000, 0.19),
       (current_date - interval '30 days', 445000, 0.21),
       (current_date, 480000, 0.235)`,
    );

    // ---- Liquidity snapshots ----
    await client.query(
      `insert into liquidity_snapshots (as_of_date, usd_balance, gmd_balance, projected_outflow_gmd, status)
       values
       (current_date - interval '14 days', 460000, 1180000, 220000, 'healthy'),
       (current_date, 480000, 1250000, 260000, 'healthy')`,
    );

    // ---- Currency rates ----
    await client.query(
      `insert into currency_rates (base_currency, quote_currency, rate)
       values ('USD','GMD',68.4), ('GMD','USD',0.0146)`,
    );

    // ---- Risk events ----
    await client.query(
      `insert into risk_events (type, severity, description, status)
       values
       ('currency_volatility','medium','Dalasi depreciated 3% against USD over 2 weeks.','monitoring'),
       ('settlement_delay','low','Contractor payout batch delayed by 2 days.','resolved')`,
    );

    // ---- Settlement obligations ----
    await client.query(
      `insert into settlement_obligations (payee_type, payee_name, amount, currency, due_date, status)
       values
       ('driver','Ebrima Sanneh',4200,'GMD',current_date + interval '3 days','scheduled'),
       ('contractor','Jallow & Sons Builders',18000,'USD',current_date + interval '10 days','scheduled'),
       ('vendor','Serrekunda Hardware Supplies',3100,'GMD',current_date - interval '2 days','overdue')`,
    );

    // ---- Treasury audit log ----
    await client.query(
      `insert into treasury_audit_logs (actor_id, action, entity_type, entity_id, details)
       values
       ('seed-admin-1','create','treasury_account','1','Initialized LRMC USD Reserve account'),
       ('seed-admin-1','update','settlement_obligation','3','Marked Serrekunda Hardware Supplies obligation overdue')`,
    );

    await client.query("COMMIT");
    console.log("Seed complete.");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
