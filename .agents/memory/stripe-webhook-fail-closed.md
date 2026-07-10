---
name: Stripe webhook must fail closed on missing secret
description: Why `webhookSecret ?? ""` is dangerous for Stripe signature verification, and the fix pattern.
---

Both `getStripeSync()` (via `StripeSync`) and any direct `stripe.webhooks.constructEventAsync(...)` call
must receive a real, non-empty signing secret. Stripe's SDK treats an empty string as "skip
verification" and accepts any payload with any `Stripe-Signature` header value.

**Why:** if the Replit connection's `webhook_secret` or the managed-webhook row is absent (e.g. not
yet configured), falling back to `""` silently converts webhook signature verification into a no-op,
letting anyone forge events (e.g. fake `checkout.session.completed` to mark something as paid).

**How to apply:** wherever a webhook secret is read for verification, throw/log-and-return early when
it's missing instead of defaulting to `""`. Apply this at every independent verification call site —
`stripe-replit-sync`'s generic sync AND any second, business-logic-specific `constructEventAsync` call
both need their own fail-closed check; fixing only one still leaves the other exploitable.

**Gotcha:** don't make `getStripeSync()` itself throw when no secret is available yet. Startup calls
`getStripeSync()` then `stripeSync.findOrCreateManagedWebhook(...)` to *provision* the managed webhook
and its secret in `stripe._managed_webhooks` — on first boot neither the connection-level
`webhook_secret` nor the managed-webhook row exists yet, so a hard throw there breaks Stripe init
entirely. Instead: have `getStripeSync()` prefer the managed-webhook secret (falling back to the
connection-level one, then `""`) without throwing, and put the actual fail-closed gate in the request
path that processes a live webhook (`WebhookHandlers.processWebhook`), checking the managed secret
exists *before* calling `sync.processWebhook`.
