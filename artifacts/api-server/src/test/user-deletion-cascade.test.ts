/**
 * user-deletion-cascade.test.ts
 *
 * Verifies that deleting a users row actually removes (or nullifies) every
 * related row across the schema via the ON DELETE CASCADE / SET NULL
 * constraints.  A broken migration or a future schema change that silently
 * removes a constraint would be caught here.
 *
 * Strategy
 * --------
 * 1. Create two users: `victim` (the one we will delete) and `other` (a
 *    counterpart needed for relationships such as message sender/recipient and
 *    land-listing seller, so those FK chains stay intact when `victim` is
 *    removed).
 * 2. Insert one row in every table that references users.id, using `victim`
 *    wherever possible.
 * 3. Delete the `victim` users row directly via the DB (no auth_tokens
 *    pre-cleanup — CASCADE must handle it).
 * 4. Assert every cascaded row is gone and that the one SET-NULL column
 *    (digital_product_purchases.buyer_id) is now NULL while the purchase
 *    record itself survives.
 */

import { describe, it, expect } from "vitest";
import { eq, isNull } from "drizzle-orm";
import {
  db,
  usersTable,
  authTokensTable,
  membershipsTable,
  marketplaceListingsTable,
  digitalProductsTable,
  digitalProductPurchasesTable,
  adsTable,
  internalMessagesTable,
  internalTicketsTable,
  propertyListingsTable,
  constructionContractorsTable,
  driversTable,
  ridesTable,
  youthEmploymentRecordsTable,
  landListingsTable,
  landTransactionsTable,
  assetsTable,
} from "@workspace/db";
import { createMemberUser } from "./helpers";

describe("user deletion — cascade / set-null across all referencing tables", () => {
  it("removes all cascaded rows and nullifies SET-NULL columns when a user row is deleted", async () => {
    // -----------------------------------------------------------------------
    // 1. Set up two users
    // -----------------------------------------------------------------------
    const victim = await createMemberUser("cascade-victim");
    const other = await createMemberUser("cascade-other");

    // -----------------------------------------------------------------------
    // 2. Insert one row in every table that references users.id
    // -----------------------------------------------------------------------

    // auth_tokens (user_id → CASCADE) — insert a verification token
    const [authToken] = await db
      .insert(authTokensTable)
      .values({
        userId: victim.id,
        tokenHash: `test-hash-${victim.id}-${Date.now()}`,
        purpose: "verify_email",
        expiresAt: new Date(Date.now() + 60_000),
      })
      .returning({ id: authTokensTable.id });

    // memberships row already inserted by createMemberUser; grab its id
    const [existingMembership] = await db
      .select({ id: membershipsTable.id })
      .from(membershipsTable)
      .where(eq(membershipsTable.userId, victim.id));

    // marketplace_listings (seller_id → CASCADE)
    const [listing] = await db
      .insert(marketplaceListingsTable)
      .values({
        sellerId: victim.id,
        title: "Cascade Test Listing",
        description: "Will be deleted",
        priceCents: 1000,
        category: "electronics",
      })
      .returning({ id: marketplaceListingsTable.id });

    // digital_products (seller_id → CASCADE) — victim-owned, no purchase attached so
    // the products FK from digital_product_purchases won't prevent the cascade
    const [victimProduct] = await db
      .insert(digitalProductsTable)
      .values({
        sellerId: victim.id,
        title: "Cascade Test Victim Digital Product",
        description: "Will be cascade-deleted with the seller",
        priceCents: 750,
        category: "software",
      })
      .returning({ id: digitalProductsTable.id });

    // digital_products (seller_id → CASCADE) — owned by `other` so it survives;
    // used only as the target of the SET-NULL purchase row below
    const [product] = await db
      .insert(digitalProductsTable)
      .values({
        sellerId: other.id,
        title: "Cascade Test Digital Product (other-owned)",
        description: "Used to test SET NULL on purchase",
        priceCents: 500,
        category: "ebook",
      })
      .returning({ id: digitalProductsTable.id });

    // digital_product_purchases (buyer_id → SET NULL) — kept for audit, buyer_id nullified
    const [purchase] = await db
      .insert(digitalProductPurchasesTable)
      .values({
        productId: product.id,
        buyerId: victim.id,
        buyerEmail: victim.email,
        amountCents: 500,
        stripeCheckoutSessionId: `cs_test_cascade_${victim.id}_${Date.now()}`,
        status: "paid",
      })
      .returning({ id: digitalProductPurchasesTable.id });

    // ads (advertiser_id → CASCADE)
    const [ad] = await db
      .insert(adsTable)
      .values({
        advertiserId: victim.id,
        title: "Cascade Test Ad",
        content: "Will be deleted",
        placement: "homepage",
      })
      .returning({ id: adsTable.id });

    // internal_messages (sender_id → CASCADE, recipient_id → CASCADE)
    const [message] = await db
      .insert(internalMessagesTable)
      .values({
        senderId: victim.id,
        recipientId: other.id,
        subject: "Cascade Test",
        body: "Will be deleted",
      })
      .returning({ id: internalMessagesTable.id });

    // internal_tickets (created_by_id → CASCADE)
    const [ticket] = await db
      .insert(internalTicketsTable)
      .values({
        createdById: victim.id,
        department: "support",
        subject: "Cascade Test Ticket",
        description: "Will be deleted",
      })
      .returning({ id: internalTicketsTable.id });

    // property_listings (owner_id → CASCADE)
    const [property] = await db
      .insert(propertyListingsTable)
      .values({
        ownerId: victim.id,
        category: "property",
        title: "Cascade Test Property",
        location: "Test Location",
        priceCents: 50000,
        status: "active",
      })
      .returning({ id: propertyListingsTable.id });

    // construction_contractors (user_id → CASCADE)
    const [contractor] = await db
      .insert(constructionContractorsTable)
      .values({
        userId: victim.id,
        companyName: "Cascade Test Co",
        specialty: "plumbing",
      })
      .returning({ id: constructionContractorsTable.id });

    // drivers (user_id → CASCADE)
    const [driver] = await db
      .insert(driversTable)
      .values({
        userId: victim.id,
        vehicleInfo: "Test Vehicle",
      })
      .returning({ id: driversTable.id });

    // rides (rider_id → CASCADE)
    const [ride] = await db
      .insert(ridesTable)
      .values({
        riderId: victim.id,
        pickup: "Test Pickup",
        dropoff: "Test Dropoff",
        fareCents: 1500,
      })
      .returning({ id: ridesTable.id });

    // youth_employment_records (user_id → CASCADE)
    const [youthRecord] = await db
      .insert(youthEmploymentRecordsTable)
      .values({
        userId: victim.id,
        program: "Cascade Test Program",
      })
      .returning({ id: youthEmploymentRecordsTable.id });

    // land_listings (seller_id → CASCADE) — victim-owned, no transaction attached so
    // the listing FK from land_transactions won't prevent the cascade
    const [victimLandListing] = await db
      .insert(landListingsTable)
      .values({
        sellerId: victim.id,
        title: "Cascade Test Victim Land",
        location: "Test Victim Land Location",
        priceCents: 80000,
        sizeMeters: 300,
      })
      .returning({ id: landListingsTable.id });

    // land_listings — owned by `other` so the listing survives when victim is deleted;
    // used as the anchor for the land_transaction where victim is buyer
    const [landListing] = await db
      .insert(landListingsTable)
      .values({
        sellerId: other.id,
        title: "Cascade Test Land (other-owned)",
        location: "Test Land Location",
        priceCents: 100000,
        sizeMeters: 500,
      })
      .returning({ id: landListingsTable.id });

    // land_transactions (buyer_id → CASCADE)
    const [landTx] = await db
      .insert(landTransactionsTable)
      .values({
        listingId: landListing.id,
        buyerId: victim.id,
        amountCents: 100000,
        status: "pending",
      })
      .returning({ id: landTransactionsTable.id });

    // assets (owner_id → CASCADE)
    const [asset] = await db
      .insert(assetsTable)
      .values({
        ownerId: victim.id,
        category: "equipment",
        type: "vehicle",
        title: "Cascade Test Asset",
        description: "Will be deleted",
      })
      .returning({ id: assetsTable.id });

    // -----------------------------------------------------------------------
    // 3. Delete the victim user row — CASCADE / SET NULL must fire
    // -----------------------------------------------------------------------
    await db.delete(usersTable).where(eq(usersTable.id, victim.id));

    // -----------------------------------------------------------------------
    // 4. Assert every cascaded row is gone
    // -----------------------------------------------------------------------

    const [deletedAuthToken] = await db
      .select()
      .from(authTokensTable)
      .where(eq(authTokensTable.id, authToken.id));
    expect(deletedAuthToken, "auth_tokens row must be cascade-deleted").toBeUndefined();

    const [deletedMembership] = await db
      .select()
      .from(membershipsTable)
      .where(eq(membershipsTable.id, existingMembership.id));
    expect(deletedMembership, "memberships row must be cascade-deleted").toBeUndefined();

    const [deletedListing] = await db
      .select()
      .from(marketplaceListingsTable)
      .where(eq(marketplaceListingsTable.id, listing.id));
    expect(deletedListing, "marketplace_listings row must be cascade-deleted").toBeUndefined();

    const [deletedVictimProduct] = await db
      .select()
      .from(digitalProductsTable)
      .where(eq(digitalProductsTable.id, victimProduct.id));
    expect(deletedVictimProduct, "digital_products row (seller_id → CASCADE) must be cascade-deleted").toBeUndefined();

    const [deletedAd] = await db
      .select()
      .from(adsTable)
      .where(eq(adsTable.id, ad.id));
    expect(deletedAd, "ads row must be cascade-deleted").toBeUndefined();

    const [deletedMessage] = await db
      .select()
      .from(internalMessagesTable)
      .where(eq(internalMessagesTable.id, message.id));
    expect(deletedMessage, "internal_messages row (sender) must be cascade-deleted").toBeUndefined();

    const [deletedTicket] = await db
      .select()
      .from(internalTicketsTable)
      .where(eq(internalTicketsTable.id, ticket.id));
    expect(deletedTicket, "internal_tickets row must be cascade-deleted").toBeUndefined();

    const [deletedProperty] = await db
      .select()
      .from(propertyListingsTable)
      .where(eq(propertyListingsTable.id, property.id));
    expect(deletedProperty, "property_listings row must be cascade-deleted").toBeUndefined();

    const [deletedContractor] = await db
      .select()
      .from(constructionContractorsTable)
      .where(eq(constructionContractorsTable.id, contractor.id));
    expect(deletedContractor, "construction_contractors row must be cascade-deleted").toBeUndefined();

    const [deletedDriver] = await db
      .select()
      .from(driversTable)
      .where(eq(driversTable.id, driver.id));
    expect(deletedDriver, "drivers row must be cascade-deleted").toBeUndefined();

    const [deletedRide] = await db
      .select()
      .from(ridesTable)
      .where(eq(ridesTable.id, ride.id));
    expect(deletedRide, "rides row must be cascade-deleted").toBeUndefined();

    const [deletedYouthRecord] = await db
      .select()
      .from(youthEmploymentRecordsTable)
      .where(eq(youthEmploymentRecordsTable.id, youthRecord.id));
    expect(deletedYouthRecord, "youth_employment_records row must be cascade-deleted").toBeUndefined();

    const [deletedVictimLandListing] = await db
      .select()
      .from(landListingsTable)
      .where(eq(landListingsTable.id, victimLandListing.id));
    expect(deletedVictimLandListing, "land_listings row (seller_id → CASCADE) must be cascade-deleted").toBeUndefined();

    const [deletedLandTx] = await db
      .select()
      .from(landTransactionsTable)
      .where(eq(landTransactionsTable.id, landTx.id));
    expect(deletedLandTx, "land_transactions row (buyer) must be cascade-deleted").toBeUndefined();

    const [deletedAsset] = await db
      .select()
      .from(assetsTable)
      .where(eq(assetsTable.id, asset.id));
    expect(deletedAsset, "assets row must be cascade-deleted").toBeUndefined();

    // -----------------------------------------------------------------------
    // 5. Assert the purchase survives but buyer_id is SET NULL
    // -----------------------------------------------------------------------
    const [survivingPurchase] = await db
      .select()
      .from(digitalProductPurchasesTable)
      .where(eq(digitalProductPurchasesTable.id, purchase.id));

    expect(survivingPurchase, "digital_product_purchases row must survive (financial audit)").toBeDefined();
    expect(
      survivingPurchase.buyerId,
      "digital_product_purchases.buyer_id must be SET NULL after user deletion",
    ).toBeNull();
  });
});
