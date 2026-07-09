---
name: stripe-replit-sync managed webhook secret isn't in connection settings
description: where to actually read the webhook signing secret when independently re-verifying events for custom fulfillment logic alongside stripe-replit-sync.
---

When using `StripeSync.findOrCreateManagedWebhook()` (Replit-managed webhook,
no manual dashboard setup), the resulting signing secret is stored by the
library in its own `stripe._managed_webhooks` table — **not** exposed via the
Replit connection API's `settings.webhook_secret` field.

**Why:** the managed webhook is created programmatically after the Stripe
connection already exists, per-account, so its secret has nowhere to live in
the static connection settings payload.

**How to apply:** if you need to independently call
`stripe.webhooks.constructEventAsync` yourself (e.g. to run custom
fulfillment logic alongside the mandatory `sync.processWebhook`), fetch the
secret with `SELECT secret FROM "stripe"."_managed_webhooks" LIMIT 1` via
your own DB client, not through the connection settings helper.
