import { getUncachableStripeClient } from "./stripeClient";

const MEMBER_DISCOUNT_COUPON_ID = "lrmc-member-10";

/**
 * Creates the Stripe Product + Price backing a newly-created digital
 * product. Prices are immutable in Stripe, so subsequent price changes go
 * through `updateDigitalProductStripePrice` instead of mutating this one.
 */
export async function createDigitalProductStripeCatalog(input: {
  title: string;
  description: string;
  priceCents: number;
}): Promise<{ stripeProductId: string; stripePriceId: string }> {
  const stripe = await getUncachableStripeClient();

  const product = await stripe.products.create({
    name: input.title,
    description: input.description,
  });

  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: input.priceCents,
    currency: "usd",
  });

  return { stripeProductId: product.id, stripePriceId: price.id };
}

/**
 * Keeps the Stripe Product's name/description in sync with edits made in
 * our admin UI.
 */
export async function updateDigitalProductStripeMetadata(
  stripeProductId: string,
  input: { title?: string; description?: string },
): Promise<void> {
  const stripe = await getUncachableStripeClient();
  await stripe.products.update(stripeProductId, {
    ...(input.title ? { name: input.title } : {}),
    ...(input.description ? { description: input.description } : {}),
  });
}

/**
 * Stripe Prices can't be edited once created, so a price change means
 * creating a fresh Price on the same Product and retiring the old one.
 */
export async function updateDigitalProductStripePrice(
  stripeProductId: string,
  previousStripePriceId: string | null,
  newPriceCents: number,
): Promise<{ stripePriceId: string }> {
  const stripe = await getUncachableStripeClient();

  const price = await stripe.prices.create({
    product: stripeProductId,
    unit_amount: newPriceCents,
    currency: "usd",
  });

  if (previousStripePriceId) {
    await stripe.prices.update(previousStripePriceId, { active: false });
  }

  return { stripePriceId: price.id };
}

/**
 * Returns the coupon ID for the standing 10% member discount, creating it
 * in Stripe on first use. Uses a fixed, human-readable coupon ID so repeated
 * calls are idempotent without needing a local record of it.
 */
export async function getOrCreateMemberDiscountCoupon(): Promise<string> {
  const stripe = await getUncachableStripeClient();

  try {
    await stripe.coupons.retrieve(MEMBER_DISCOUNT_COUPON_ID);
    return MEMBER_DISCOUNT_COUPON_ID;
  } catch {
    // Not found -- create it.
  }

  await stripe.coupons.create({
    id: MEMBER_DISCOUNT_COUPON_ID,
    percent_off: 10,
    duration: "forever",
    name: "LRMC member discount",
  });

  return MEMBER_DISCOUNT_COUPON_ID;
}
