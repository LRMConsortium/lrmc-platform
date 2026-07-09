import { ReplitConnectors } from "@replit/connectors-sdk";
import { logger } from "./logger";

const FROM_ADDRESS = "no-reply@africalrmc.com";

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * Sends a transactional email via the Resend connector.
 * Fails loudly (throws) if the Resend connection isn't wired up or the send fails,
 * so callers can surface a clear 500 rather than silently dropping the email.
 */
export async function sendEmail(input: SendEmailInput): Promise<void> {
  const connectors = new ReplitConnectors();

  const response = await connectors.proxy("resend", "/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: {
      from: `LRMC Consortium <${FROM_ADDRESS}>`,
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    logger.error(
      { status: response.status, body },
      "Failed to send email via Resend",
    );
    throw new Error(
      `Failed to send email via Resend (status ${response.status})`,
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
