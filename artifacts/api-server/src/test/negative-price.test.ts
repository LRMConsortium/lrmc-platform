/**
 * End-to-end tests confirming that negative price / fare / budget values are
 * rejected at the HTTP layer for every domain that accepts such a field on
 * PATCH (update). The min(1) constraint on the create bodies already blocks
 * negatives there; this suite guards against a regression where an update
 * body drops or weakens that constraint.
 *
 * Covered domains: digital products, marketplace listings, property
 * listings, land listings, construction projects (budgetCents).
 */
import { describe, it, expect } from "vitest";
import { createMemberUser } from "./helpers";

type Agent = Awaited<ReturnType<typeof createMemberUser>>["agent"];

async function createDigitalProduct(agent: Agent) {
  const res = await agent.post("/api/digital-products").send({
    title: "Neg Test DP",
    description: "Negative price test product",
    priceCents: 500,
    category: "ebook",
  });
  expect(res.status).toBe(201);
  return res.body as { id: number };
}

async function createMarketplaceListing(agent: Agent) {
  const res = await agent.post("/api/marketplace-listings").send({
    title: "Neg Test Listing",
    description: "Negative price test listing",
    priceCents: 500,
    category: "misc",
  });
  expect(res.status).toBe(201);
  return res.body as { id: number };
}

async function createPropertyListing(agent: Agent) {
  const res = await agent.post("/api/property-listings").send({
    category: "property",
    title: "Neg Test Property",
    location: "Fajara",
    priceCents: 500,
  });
  expect(res.status).toBe(201);
  return res.body as { id: number };
}

async function createLandListing(agent: Agent) {
  const res = await agent.post("/api/land-listings").send({
    title: "Neg Test Land",
    location: "Brikama",
    priceCents: 500,
    sizeAcres: 1,
  });
  expect(res.status).toBe(201);
  return res.body as { id: number };
}

async function createContractorAndProject(agent: Agent) {
  const contractorRes = await agent.post("/api/construction-contractors").send({
    companyName: "Neg Test Builders",
    specialty: "Testing",
  });
  expect(contractorRes.status).toBe(201);
  const contractorId = contractorRes.body.id as number;

  const projectRes = await agent.post("/api/construction-projects").send({
    contractorId,
    title: "Neg Test Project",
    location: "Bijilo",
    budgetCents: 500,
  });
  expect(projectRes.status).toBe(201);
  return { projectId: projectRes.body.id as number };
}

// ── digital-products ───────────────────────────────────────────────────────

describe("digital-products negative priceCents validation", () => {
  it("rejects priceCents: -1 on POST /api/digital-products with 400", async () => {
    const seller = await createMemberUser("neg-dp-create");
    const res = await seller.agent.post("/api/digital-products").send({
      title: "Neg DP",
      description: "test",
      priceCents: -1,
      category: "ebook",
    });
    expect(res.status).toBe(400);
  });

  it("rejects priceCents: -1 on PATCH /api/digital-products/:id with 400", async () => {
    const seller = await createMemberUser("neg-dp-update");
    const product = await createDigitalProduct(seller.agent);
    const res = await seller.agent
      .patch(`/api/digital-products/${product.id}`)
      .send({ priceCents: -1 });
    expect(res.status).toBe(400);
  });
});

// ── marketplace-listings ───────────────────────────────────────────────────

describe("marketplace-listings negative priceCents validation", () => {
  it("rejects priceCents: -1 on POST /api/marketplace-listings with 400", async () => {
    const seller = await createMemberUser("neg-ml-create");
    const res = await seller.agent.post("/api/marketplace-listings").send({
      title: "Neg Listing",
      description: "test",
      priceCents: -1,
      category: "misc",
    });
    expect(res.status).toBe(400);
  });

  it("rejects priceCents: -1 on PATCH /api/marketplace-listings/:id with 400", async () => {
    const seller = await createMemberUser("neg-ml-update");
    const listing = await createMarketplaceListing(seller.agent);
    const res = await seller.agent
      .patch(`/api/marketplace-listings/${listing.id}`)
      .send({ priceCents: -1 });
    expect(res.status).toBe(400);
  });
});

// ── property-listings ──────────────────────────────────────────────────────

describe("property-listings negative priceCents validation", () => {
  it("rejects priceCents: -1 on POST /api/property-listings with 400", async () => {
    const owner = await createMemberUser("neg-pl-create");
    const res = await owner.agent.post("/api/property-listings").send({
      category: "property",
      title: "Neg Property",
      location: "Fajara",
      priceCents: -1,
    });
    expect(res.status).toBe(400);
  });

  it("rejects priceCents: -1 on PATCH /api/property-listings/:id with 400", async () => {
    const owner = await createMemberUser("neg-pl-update");
    const listing = await createPropertyListing(owner.agent);
    const res = await owner.agent
      .patch(`/api/property-listings/${listing.id}`)
      .send({ priceCents: -1 });
    expect(res.status).toBe(400);
  });
});

// ── land-listings ──────────────────────────────────────────────────────────

describe("land-listings negative priceCents validation", () => {
  it("rejects priceCents: -1 on POST /api/land-listings with 400", async () => {
    const seller = await createMemberUser("neg-ll-create");
    const res = await seller.agent.post("/api/land-listings").send({
      title: "Neg Land",
      location: "Brikama",
      priceCents: -1,
      sizeAcres: 1,
    });
    expect(res.status).toBe(400);
  });

  it("rejects priceCents: -1 on PATCH /api/land-listings/:id with 400", async () => {
    const seller = await createMemberUser("neg-ll-update");
    const listing = await createLandListing(seller.agent);
    const res = await seller.agent
      .patch(`/api/land-listings/${listing.id}`)
      .send({ priceCents: -1 });
    expect(res.status).toBe(400);
  });
});

// ── construction-projects (budgetCents) ────────────────────────────────────

describe("construction-projects negative budgetCents validation", () => {
  it("rejects budgetCents: -1 on POST /api/construction-projects with 400", async () => {
    const owner = await createMemberUser("neg-cp-create");
    const contractorRes = await owner.agent.post("/api/construction-contractors").send({
      companyName: "Neg Builders Create",
      specialty: "Testing",
    });
    expect(contractorRes.status).toBe(201);

    const res = await owner.agent.post("/api/construction-projects").send({
      contractorId: contractorRes.body.id,
      title: "Neg Project",
      location: "Bijilo",
      budgetCents: -1,
    });
    expect(res.status).toBe(400);
  });

  it("rejects budgetCents: -1 on PATCH /api/construction-projects/:id with 400", async () => {
    const owner = await createMemberUser("neg-cp-update");
    const { projectId } = await createContractorAndProject(owner.agent);
    const res = await owner.agent
      .patch(`/api/construction-projects/${projectId}`)
      .send({ budgetCents: -1 });
    expect(res.status).toBe(400);
  });
});

// ── rides (fareCents) ──────────────────────────────────────────────────────
// Note: fareCents can only be set on create (POST /api/rides); the update
// body (PATCH /api/rides/:id) only allows changing status/driverId, so
// there is no negative-fare update path to test.

describe("rides negative fareCents validation", () => {
  it("rejects fareCents: -1 on POST /api/rides with 400", async () => {
    const rider = await createMemberUser("neg-ride-create");
    const res = await rider.agent.post("/api/rides").send({
      pickup: "A",
      dropoff: "B",
      fareCents: -1,
    });
    expect(res.status).toBe(400);
  });
});
