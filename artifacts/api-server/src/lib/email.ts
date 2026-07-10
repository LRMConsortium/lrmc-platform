import { logger } from "./logger";

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * Fetches SendGrid credentials (API key + verified sender address) from the
 * Replit connection API. Not cached -- tokens can rotate, so fetch fresh
 * each time. The SendGrid connector doesn't support generic proxy requests
 * (`connectors.proxy("sendgrid", ...)` returns a 400 "does not support proxy
 * requests"), so we call the SendGrid API directly with these credentials
 * instead, mirroring the pattern used for Stripe in stripeClient.ts.
 */
async function getSendGridCredentials(): Promise<{
  apiKey: string;
  fromEmail: string;
}> {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? "depl " + process.env.WEB_REPL_RENEWAL
      : null;

  if (!hostname || !xReplitToken) {
    throw new Error(
      "Missing Replit environment variables. " +
        "Ensure the SendGrid integration is connected via the Integrations tab.",
    );
  }

  const resp = await fetch(
    `https://${hostname}/api/v2/connection?include_secrets=true&connector_names=sendgrid`,
    {
      headers: { Accept: "application/json", X_REPLIT_TOKEN: xReplitToken },
      signal: AbortSignal.timeout(10_000),
    },
  );

  if (!resp.ok) {
    throw new Error(
      `Failed to fetch SendGrid credentials: ${resp.status} ${resp.statusText}`,
    );
  }

  const data = (await resp.json()) as {
    items?: Array<{ settings?: { api_key?: string; from_email?: string } }>;
  };
  const settings = data.items?.[0]?.settings;

  if (!settings?.api_key || !settings?.from_email) {
    throw new Error(
      "SendGrid integration not connected or missing api_key/from_email. " +
        "Connect SendGrid via the Integrations tab first.",
    );
  }

  return { apiKey: settings.api_key, fromEmail: settings.from_email };
}

/**
 * Sends a transactional email via the SendGrid API.
 * Fails loudly (throws) if the SendGrid connection isn't wired up or the send fails,
 * so callers can surface a clear 500 rather than silently dropping the email.
 */
export async function sendEmail(input: SendEmailInput): Promise<void> {
  const { apiKey, fromEmail } = await getSendGridCredentials();

  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: input.to }] }],
      from: { email: fromEmail, name: "LRMC Consortium" },
      subject: input.subject,
      content: [
        { type: "text/plain", value: input.text },
        { type: "text/html", value: input.html },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    logger.error(
      { status: response.status, body },
      "Failed to send email via SendGrid",
    );
    throw new Error(
      `Failed to send email via SendGrid (status ${response.status})`,
    );
  }
}

export function verificationEmailContent(link: string): Pick<
  SendEmailInput,
  "subject" | "html" | "text"
> {
  return {
    subject: "Confirm your LRMC Consortium account",
    html: `<p>Welcome to the Legacy Rental Management Consortium.</p>
<p>Please confirm your email address to activate your account:</p>
<p><a href="${link}">${link}</a></p>
<p>This link expires in 24 hours. If you did not create this account, you can ignore this email.</p>`,
    text: `Welcome to the Legacy Rental Management Consortium.

Please confirm your email address to activate your account:
${link}

This link expires in 24 hours. If you did not create this account, you can ignore this email.`,
  };
}

export function digitalProductDeliveryEmailContent(
  productTitle: string,
  fileUrl: string | null,
): Pick<SendEmailInput, "subject" | "html" | "text"> {
  const downloadSection = fileUrl
    ? `<p><a href="${fileUrl}">Download "${productTitle}"</a></p>`
    : `<p>Our team will follow up shortly with your download link for "${productTitle}". If you don't hear from us within one business day, contact office@africalrmc.com.</p>`;
  const downloadSectionText = fileUrl
    ? `Download "${productTitle}": ${fileUrl}`
    : `Our team will follow up shortly with your download link for "${productTitle}". If you don't hear from us within one business day, contact office@africalrmc.com.`;

  return {
    subject: `Your LRMC purchase: ${productTitle}`,
    html: `<p>Thank you for your purchase from the LRMC Consortium digital store.</p>
${downloadSection}
<p>Keep this email for your records.</p>`,
    text: `Thank you for your purchase from the LRMC Consortium digital store.

${downloadSectionText}

Keep this email for your records.`,
  };
}

export function passwordResetEmailContent(link: string): Pick<
  SendEmailInput,
  "subject" | "html" | "text"
> {
  return {
    subject: "Reset your LRMC Consortium password",
    html: `<p>We received a request to reset your password.</p>
<p><a href="${link}">${link}</a></p>
<p>This link expires in 1 hour. If you did not request this, you can ignore this email.</p>`,
    text: `We received a request to reset your password.

${link}

This link expires in 1 hour. If you did not request this, you can ignore this email.`,
  };
}
