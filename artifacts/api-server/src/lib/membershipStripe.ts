import { getUncachableStripeClient } from "./stripeClient";
import { getWebBaseUrl } from "./urls";

/**
 * Flat membership application fee per tier, in USD cents. Tiers not listed
 * here (e.g. legacy application types like "property_owner") fall back to
 * the premium fee -- there's no free tier besides "basic".
 */
const MEMBERSHIP_TIER_FEE_CENTS: Record<string, number> = {
  basic: 0,
  premium: 5000,
  corporate: 20000,
};

export function getMembershipFeeCents(type: string): number {
  return MEMBERSHIP_TIER_FEE_CENTS[type] ?? MEMBERSHIP_TIER_FEE_CENTS.premium;
}

/**
 * Creates a Stripe Checkout session for a membership's one-time application
 * fee. Uses ad-hoc `price_data` (rather than a pre-created Stripe Price)
 * since membership tiers aren't a merchant-managed catalog like digital
 * products.
 */
export async function createMembershipCheckoutSession(input: {
  membershipId: number;
  type: string;
  buyerEmail: string;
  feeCents: number;
}): Promise<{ checkoutUrl: string; sessionId: string }> {
  const stripe = await getUncachableStripeClient();
  const baseUrl = getWebBaseUrl();

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: input.buyerEmail,
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: input.feeCents,
          product_data: {
            name: `LRMC ${input.type} membership fee`,
          },
        },
        quantity: 1,
      },
    ],
    success_url: `${baseUrl}/memberships?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/memberships?checkout=cancelled`,
    metadata: {
      membershipId: String(input.membershipId),
    },
  });

  if (!session.url) {
    throw new Error("Stripe did not return a checkout URL");
  }

  return { checkoutUrl: session.url, sessionId: session.id };
}
