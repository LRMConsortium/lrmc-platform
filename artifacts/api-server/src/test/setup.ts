/**
 * Global test setup — runs before every test file.
 *
 * Replaces outbound Stripe catalog API calls with deterministic stubs so the
 * test suite never hits the live Stripe network.  All affected tests create
 * digital products via POST /digital-products, which calls
 * createDigitalProductStripeCatalog; stubbing that one function is enough to
 * make those flows deterministic without touching any other Stripe surface.
 *
 * Tests that specifically care about Stripe behaviour (e.g. webhook
 * processing, the /checkout endpoint) should override individual stubs via
 * `vi.mocked(fn).mockResolvedValueOnce(...)` inside their own test body.
 */
import { vi } from "vitest";

// ── stripeClient ─────────────────────────────────────────────────────────
// The /checkout endpoint calls getUncachableStripeClient() to create a real
// Stripe Checkout session.  Stub it globally so checkout-touching tests never
// hit the live Stripe network.  Individual tests can override the resolved
// value (or specific session methods) via vi.mocked(...).mockResolvedValueOnce.
vi.mock("../lib/stripeClient", () => ({
  getUncachableStripeClient: vi.fn().mockResolvedValue({
    checkout: {
      sessions: {
        create: vi.fn().mockResolvedValue({
          id: "cs_test_default_stubbed",
          url: "https://checkout.stripe.com/test/default",
        }),
        expire: vi.fn().mockResolvedValue({}),
      },
    },
  }),
  // getStripeSync is used by the webhook handler; keep it mockable but don't
  // provide a default implementation — tests that need it must stub explicitly.
  getStripeSync: vi.fn(),
}));

// ── digitalProductStripeSync ─────────────────────────────────────────────
// Routes that create / update digital products call these helpers.
// Return plausible-looking fake IDs so downstream code that reads
// stripeProductId / stripePriceId from the DB still gets a truthy value
// and update paths (which check `if (existing.stripeProductId)`) can
// proceed normally.
vi.mock("../lib/digitalProductStripeSync", () => ({
  createDigitalProductStripeCatalog: vi.fn().mockResolvedValue({
    stripeProductId: "prod_test_stubbed",
    stripePriceId: "price_test_stubbed",
  }),
  updateDigitalProductStripeMetadata: vi.fn().mockResolvedValue(undefined),
  updateDigitalProductStripePrice: vi.fn().mockResolvedValue({
    stripePriceId: "price_test_updated_stubbed",
  }),
  getOrCreateMemberDiscountCoupon: vi
    .fn()
    .mockResolvedValue("lrmc-member-10"),
}));
