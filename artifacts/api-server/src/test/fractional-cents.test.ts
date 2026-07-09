/**
 * End-to-end tests confirming that fractional cent values are rejected at the
 * HTTP layer (not just in the zod schema) for every domain that accepts a
 * price / fare / budget field.
 *
 * Covered domains: digital products, marketplace listings, property listings,
 * land listings, construction projects (budgetCents), rides (fareCents).
 */
import { describe, it, expect } from "vitest";
import { createMemberUser } from "./helpers";

// ── helpers ────────────────────────────────────────────────────────────────

type Agent = Awaited<ReturnType<typeof createMemberUser>>["agent"];

async function createDigitalProduct(agent: Agent) {
  const res = await agent.post("/api/digital-products").send({
    title: "Frac Test DP",
    description: "Fractional test product",
    priceCents: 500,
    category: "ebook",
  });
  expect(res.status).toBe(201);
  return res.body as { id: number };
}

async function createMarketplaceListing(agent: Agent) {
  const res = await agent.post("/api/marketplace-listings").send({
    title: "Frac Test Listing",
    description: "Fractional test listing",
    priceCents: 500,
    category: "misc",
  });
  expect(res.status).toBe(201);
  return res.body as { id: number };
}

async function createPropertyListing(agent: Agent) {
  const res = await agent.post("/api/property-listings").send({
    category: "property",
    title: "Frac Test Property",
    location: "Fajara",
    priceCents: 500,
  });
  expect(res.status).toBe(201);
  return res.body as { id: number };
}

async function createLandListing(agent: Agent) {
  const res = await agent.post("/api/land-listings").send({
    title: "Frac Test Land",
    location: "Brikama",
    priceCents: 500,
    sizeAcres: 1,
  });
  expect(res.status).toBe(201);
  return res.body as { id: number };
}

async function createContractorAndProject(agent: Agent) {
  const contractorRes = await agent.post("/api/construction-contractors").send({
    companyName: "Frac Test Builders",
    specialty: "Testing",
  });
  expect(contractorRes.status).toBe(201);
  const contractorId = contractorRes.body.id as number;

  const projectRes = await agent.post("/api/construction-projects").send({
    contractorId,
    title: "Frac Test Project",
    location: "Bijilo",
    budgetCents: 500,
  });
  expect(projectRes.status).toBe(201);
  return { projectId: projectRes.body.id as number };
}

// ── digital-products ───────────────────────────────────────────────────────

describe("digital-products fractional priceCents validation", () => {
  it("rejects priceCents: 9.5 on POST /api/digital-products with 400", async () => {
    const seller = await createMemberUser("frac-dp-create");
    const res = await seller.agent.post("/api/digital-products").send({
      title: "Frac DP",
      description: "test",
      priceCents: 9.5,
      category: "ebook",
    });
    expect(res.status).toBe(400);
  });

  it("rejects priceCents: 9.5 on PATCH /api/digital-products/:id with 400", async () => {
    const seller = await createMemberUser("frac-dp-update");
    const product = await createDigitalProduct(seller.agent);
    const res = await seller.agent
      .patch(`/api/digital-products/${product.id}`)
      .send({ priceCents: 9.5 });
    expect(res.status).toBe(400);
  });
});

// ── marketplace-listings ───────────────────────────────────────────────────

describe("marketplace-listings fractional priceCents validation", () => {
  it("rejects priceCents: 9.5 on POST /api/marketplace-listings with 400", async () => {
    const seller = await createMemberUser("frac-ml-create");
    const res = await seller.agent.post("/api/marketplace-listings").send({
      title: "Frac Listing",
      description: "test",
      priceCents: 9.5,
      category: "misc",
    });
    expect(res.status).toBe(400);
  });

  it("rejects priceCents: 9.5 on PATCH /api/marketplace-listings/:id with 400", async () => {
    const seller = await createMemberUser("frac-ml-update");
    const listing = await createMarketplaceListing(seller.agent);
    const res = await seller.agent
      .patch(`/api/marketplace-listings/${listing.id}`)
      .send({ priceCents: 9.5 });
    expect(res.status).toBe(400);
  });
});

// ── property-listings ──────────────────────────────────────────────────────

describe("property-listings fractional priceCents validation", () => {
  it("rejects priceCents: 9.5 on POST /api/property-listings with 400", async () => {
    const owner = await createMemberUser("frac-pl-create");
    const res = await owner.agent.post("/api/property-listings").send({
      category: "property",
      title: "Frac Property",
      location: "Fajara",
      priceCents: 9.5,
    });
    expect(res.status).toBe(400);
  });

  it("rejects priceCents: 9.5 on PATCH /api/property-listings/:id with 400", async () => {
    const owner = await createMemberUser("frac-pl-update");
    const listing = await createPropertyListing(owner.agent);
    const res = await owner.agent
      .patch(`/api/property-listings/${listing.id}`)
      .send({ priceCents: 9.5 });
    expect(res.status).toBe(400);
  });
});

// ── land-listings ──────────────────────────────────────────────────────────

describe("land-listings fractional priceCents validation", () => {
  it("rejects priceCents: 9.5 on POST /api/land-listings with 400", async () => {
    const seller = await createMemberUser("frac-ll-create");
    const res = await seller.agent.post("/api/land-listings").send({
      title: "Frac Land",
      location: "Brikama",
      priceCents: 9.5,
      sizeAcres: 1,
    });
    expect(res.status).toBe(400);
  });

  it("rejects priceCents: 9.5 on PATCH /api/land-listings/:id with 400", async () => {
    const seller = await createMemberUser("frac-ll-update");
    const listing = await createLandListing(seller.agent);
    const res = await seller.agent
      .patch(`/api/land-listings/${listing.id}`)
      .send({ priceCents: 9.5 });
    expect(res.status).toBe(400);
  });
});

describe("land-listings fractional sizeAcres validation", () => {
  it("rejects sizeAcres: 0.5 on POST /api/land-listings with 400", async () => {
    const seller = await createMemberUser("frac-ll-acres-create");
    const res = await seller.agent.post("/api/land-listings").send({
      title: "Frac Land Acres",
      location: "Brikama",
      priceCents: 500,
      sizeAcres: 0.5,
    });
    expect(res.status).toBe(400);
  });

  it("rejects sizeAcres: 0.5 on PATCH /api/land-listings/:id with 400", async () => {
    const seller = await createMemberUser("frac-ll-acres-update");
    const listing = await createLandListing(seller.agent);
    const res = await seller.agent
      .patch(`/api/land-listings/${listing.id}`)
      .send({ sizeAcres: 0.5 });
    expect(res.status).toBe(400);
  });
});

// ── construction-projects (budgetCents) ────────────────────────────────────

describe("construction-projects fractional budgetCents validation", () => {
  it("rejects budgetCents: 9.5 on POST /api/construction-projects with 400", async () => {
    const owner = await createMemberUser("frac-cp-create");
    const contractorRes = await owner.agent.post("/api/construction-contractors").send({
      companyName: "Frac Builders Create",
      specialty: "Testing",
    });
    expect(contractorRes.status).toBe(201);

    const res = await owner.agent.post("/api/construction-projects").send({
      contractorId: contractorRes.body.id,
      title: "Frac Project",
      location: "Bijilo",
      budgetCents: 9.5,
    });
    expect(res.status).toBe(400);
  });

  it("rejects budgetCents: 9.5 on PATCH /api/construction-projects/:id with 400", async () => {
    const owner = await createMemberUser("frac-cp-update");
    const { projectId } = await createContractorAndProject(owner.agent);
    const res = await owner.agent
      .patch(`/api/construction-projects/${projectId}`)
      .send({ budgetCents: 9.5 });
    expect(res.status).toBe(400);
  });
});

// ── rides (fareCents) ──────────────────────────────────────────────────────

describe("rides fractional fareCents validation", () => {
  it("rejects fareCents: 9.5 on POST /api/rides with 400", async () => {
    const rider = await createMemberUser("frac-ride-create");
    const res = await rider.agent.post("/api/rides").send({
      pickup: "A",
      dropoff: "B",
      fareCents: 9.5,
    });
    expect(res.status).toBe(400);
  });
});
