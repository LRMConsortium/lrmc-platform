---
name: SendGrid connector requires direct API calls, not the generic proxy
description: connectors.proxy("sendgrid", ...) fails with a 400; use the connection-settings + direct-fetch pattern instead.
---

The Replit SendGrid connector does not support the generic
`connectors.proxy("sendgrid", "/v3/mail/send", ...)` helper — it responds with
`400 {"error":{"message":"Connector sendgrid does not support proxy requests"}}`.

**Why:** unlike some connectors, SendGrid's connection doesn't have proxy
routing configured; its `settings` (an `api_key` and a verified `from_email`)
are meant to be read directly and used to call SendGrid's REST API yourself.

**How to apply:** mirror the Stripe credential pattern (see
`stripeClient.ts`'s `getStripeCredentials()`): fetch
`https://${REPLIT_CONNECTORS_HOSTNAME}/api/v2/connection?include_secrets=true&connector_names=sendgrid`
with the `X_REPLIT_TOKEN` header, read `items[0].settings.api_key` and
`.from_email`, then `fetch("https://api.sendgrid.com/v3/mail/send", { headers: { Authorization: \`Bearer ${apiKey}\` }, ... })`
directly. Don't cache the credentials — fetch fresh per call in case they rotate.
