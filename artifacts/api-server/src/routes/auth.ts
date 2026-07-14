import { Router, type IRouter, type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import { and, eq, sql, isNull, gt } from "drizzle-orm";
import { db, usersTable, authTokensTable, digitalProductPurchasesTable } from "@workspace/db";
import {
  RegisterBody,
  RegisterResponse,
  LoginBody,
  LoginResponse,
  GetCurrentUserResponse,
  VerifyEmailBody,
  VerifyEmailResponse,
  ResendVerificationBody,
  ResendVerificationResponse,
  ForgotPasswordBody,
  ForgotPasswordResponse,
  ResetPasswordBody,
  ResetPasswordResponse,
} from "@workspace/api-zod";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import {
  loginRateLimiter,
  registerRateLimiter,
  emailActionRateLimiter,
  tokenActionRateLimiter,
} from "../middlewares/rateLimit";
import { generateRawToken, hashToken, expiryFor } from "../lib/tokens";
import {
  sendEmail,
  verificationEmailContent,
  passwordResetEmailContent,
} from "../lib/email";
import { getWebBaseUrl } from "../lib/urls";
import { logger } from "../lib/logger";
import { getUncachableStripeClient } from "../lib/stripeClient";

const router: IRouter = Router();

function serializeUser(user: typeof usersTable.$inferSelect) {
  return { ...user, emailVerified: user.emailVerifiedAt !== null };
}

async function issueToken(
  userId: number,
  purpose: "verify_email" | "reset_password",
): Promise<string> {
  const rawToken = generateRawToken();
  await db.insert(authTokensTable).values({
    userId,
    tokenHash: hashToken(rawToken),
    purpose,
    expiresAt: expiryFor(purpose),
  });
  return rawToken;
}

async function sendVerificationEmail(user: typeof usersTable.$inferSelect) {
  const rawToken = await issueToken(user.id, "verify_email");
  const link = `${getWebBaseUrl()}/verify-email?token=${rawToken}`;
  try {
    await sendEmail({ to: user.email, ...verificationEmailContent(link) });
  } catch (err) {
    // Don't fail account creation / resend requests just because outbound
    // email delivery hiccuped — the user can always request another link.
    logger.error({ err, userId: user.id }, "Failed to send verification email");
  }
}

async function sendPasswordResetEmail(user: typeof usersTable.$inferSelect) {
  const rawToken = await issueToken(user.id, "reset_password");
  const link = `${getWebBaseUrl()}/reset-password?token=${rawToken}`;
  try {
    await sendEmail({ to: user.email, ...passwordResetEmailContent(link) });
  } catch (err) {
    logger.error({ err, userId: user.id }, "Failed to send password reset email");
  }
}

router.post("/auth/register", registerRateLimiter, async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, password, fullName, phone } = parsed.data;

  const [existing] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email));
  if (existing) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }

  // Use a lower bcrypt cost in test mode so the suite doesn't spend hundreds
  // of seconds on password hashing across hundreds of throwaway registrations.
  // The cost is still high enough to exercise the code path correctly.
  const bcryptRounds = process.env.NODE_ENV === "test" ? 4 : 10;
  const passwordHash = await bcrypt.hash(password, bcryptRounds);

  const [user] = await db
    .insert(usersTable)
    .values({ email, passwordHash, fullName, phone, role: "member" })
    .returning();

  if (!user) {
    res.status(500).json({ error: "Failed to create user" });
    return;
  }

  await sendVerificationEmail(user);

  res.status(201).json(RegisterResponse.parse(serializeUser(user)));
  return;
});

router.post("/auth/login", loginRateLimiter, async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, password } = parsed.data;

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email));

  if (!user) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  if (!user.emailVerifiedAt) {
    res.status(403).json({
      error: "Email not verified",
      code: "email_not_verified",
    });
    return;
  }

  req.session.userId = user.id;
  req.session.role = user.role;
  req.session.sessionVersion = user.sessionVersion;

  res.json(LoginResponse.parse(serializeUser(user)));
});

router.post("/auth/logout", requireAuth, (req, res): void => {
  req.session.destroy((err) => {
    if (err) {
      req.log.error({ err }, "Failed to destroy session");
      res.status(500).json({ error: "Failed to log out" });
      return;
    }
    res.clearCookie("lrmc.sid");
    res.sendStatus(204);
  });
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, req.session.userId!));

  if (!user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  res.json(GetCurrentUserResponse.parse(serializeUser(user)));
});

router.post("/auth/verify-email", tokenActionRateLimiter, async (req, res): Promise<void> => {
  const parsed = VerifyEmailBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const tokenHash = hashToken(parsed.data.token);

  // Atomically claim the token: the WHERE clause re-checks purpose,
  // used-state, and expiry in the same statement as the update, so two
  // concurrent requests racing on the same token can't both succeed.
  const [tokenRow] = await db
    .update(authTokensTable)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(authTokensTable.tokenHash, tokenHash),
        eq(authTokensTable.purpose, "verify_email"),
        isNull(authTokensTable.usedAt),
        gt(authTokensTable.expiresAt, new Date()),
      ),
    )
    .returning();

  if (!tokenRow) {
    res.status(400).json({ error: "Invalid or expired verification link" });
    return;
  }

  await db
    .update(usersTable)
    .set({ emailVerifiedAt: new Date() })
    .where(eq(usersTable.id, tokenRow.userId));

  res.json(
    VerifyEmailResponse.parse({ message: "Email verified. You can now sign in." }),
  );
});

router.post(
  "/auth/resend-verification",
  emailActionRateLimiter,
  async (req, res): Promise<void> => {
  const parsed = ResendVerificationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, parsed.data.email));

  if (user && !user.emailVerifiedAt) {
    await sendVerificationEmail(user);
  }

  // Always return the same response, whether or not the account exists or is
  // already verified, to avoid leaking account existence.
  res.json(
    ResendVerificationResponse.parse({
      message:
        "If that account exists and needs verification, a new email was sent.",
    }),
  );
  },
);

router.post(
  "/auth/forgot-password",
  emailActionRateLimiter,
  async (req, res): Promise<void> => {
  const parsed = ForgotPasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, parsed.data.email));

  if (user) {
    await sendPasswordResetEmail(user);
  }

  res.json(
    ForgotPasswordResponse.parse({
      message: "If that account exists, a reset link was sent.",
    }),
  );
  },
);

router.post("/auth/reset-password", tokenActionRateLimiter, async (req, res): Promise<void> => {
  const parsed = ResetPasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const tokenHash = hashToken(parsed.data.token);

  // Atomically claim the token first (see /auth/verify-email for why this
  // must be a single conditional update rather than read-then-write).
  const [tokenRow] = await db
    .update(authTokensTable)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(authTokensTable.tokenHash, tokenHash),
        eq(authTokensTable.purpose, "reset_password"),
        isNull(authTokensTable.usedAt),
        gt(authTokensTable.expiresAt, new Date()),
      ),
    )
    .returning();

  if (!tokenRow) {
    res.status(400).json({ error: "Invalid or expired reset link" });
    return;
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  // Bumping sessionVersion invalidates every session issued before this
  // reset (checked on each request by requireAuth/requireAdmin), without
  // needing to enumerate or delete rows in the session store.
  await db
    .update(usersTable)
    .set({ passwordHash, sessionVersion: sql`${usersTable.sessionVersion} + 1` })
    .where(eq(usersTable.id, tokenRow.userId));

  if (req.session.userId === tokenRow.userId) {
    req.session.destroy(() => {});
  }

  res.json(
    ResetPasswordResponse.parse({
      message: "Password updated. You can now sign in with your new password.",
    }),
  );
});

// ---------------------------------------------------------------------------
// Account deletion helpers
// ---------------------------------------------------------------------------

/**
 * Best-effort: expire every pending Stripe Checkout session owned by `userId`
 * so buyers can't complete a checkout for an account that is about to be
 * deleted.  Errors are logged but do NOT abort the deletion — an orphaned
 * Stripe session will simply expire on its own after 24 hours, and our DB row
 * will have buyer_id set to NULL (ON DELETE SET NULL).
 */
async function cancelPendingStripeCheckouts(userId: number): Promise<void> {
  const pendingSessions = await db
    .select({ sessionId: digitalProductPurchasesTable.stripeCheckoutSessionId })
    .from(digitalProductPurchasesTable)
    .where(
      and(
        eq(digitalProductPurchasesTable.buyerId, userId),
        eq(digitalProductPurchasesTable.status, "pending"),
      ),
    );

  if (pendingSessions.length === 0) return;

  let stripe;
  try {
    stripe = await getUncachableStripeClient();
  } catch (err) {
    logger.warn(
      { err, userId },
      "Could not obtain Stripe client during account deletion; skipping checkout session cancellation",
    );
    return;
  }

  await Promise.all(
    pendingSessions.map(({ sessionId }) =>
      stripe.checkout.sessions.expire(sessionId).catch((err: unknown) => {
        logger.warn(
          { err, sessionId },
          "Failed to expire Stripe checkout session during account deletion",
        );
      }),
    ),
  );
}

/**
 * Shared account-deletion logic used by both the self-service and admin
 * endpoints.
 *
 * 1. Cancel any open Stripe Checkout sessions (best-effort, does not abort on
 *    failure — orphaned sessions expire naturally after 24 h).
 * 2. Delete the user row inside a DB transaction.  All related rows are
 *    removed automatically via ON DELETE CASCADE / SET NULL constraints, so
 *    the entire cleanup is atomic at the DB layer.
 * 3. Destroy the current session if it belonged to the deleted user so the
 *    caller cannot make further authenticated requests.
 */
async function deleteUserById(
  targetUserId: number,
  req: Request,
  res: Response,
): Promise<void> {
  // Step 1 — cancel pending Stripe sessions (external; best-effort)
  await cancelPendingStripeCheckouts(targetUserId);

  // Step 2 — delete user in a transaction (cascades all related rows atomically)
  await db.transaction(async (tx) => {
    await tx.delete(usersTable).where(eq(usersTable.id, targetUserId));
  });

  // Step 3 — invalidate the session if it belongs to the user we just deleted
  if (req.session.userId === targetUserId) {
    req.session.destroy(() => {});
    res.clearCookie("lrmc.sid");
  }

  res.sendStatus(204);
}

// ---------------------------------------------------------------------------
// DELETE /account  — authenticated user deletes their own account
// ---------------------------------------------------------------------------
router.delete("/account", requireAuth, async (req, res): Promise<void> => {
  await deleteUserById(req.session.userId!, req, res);
});

// ---------------------------------------------------------------------------
// DELETE /users/:id  — admin-only: delete any user's account
// ---------------------------------------------------------------------------
router.delete("/users/:id", requireAdmin, async (req, res): Promise<void> => {
  const raw = req.params.id;
  const targetId = parseInt(raw, 10);
  if (!Number.isInteger(targetId) || targetId <= 0 || String(targetId) !== raw) {
    res.status(400).json({ error: "Invalid user ID" });
    return;
  }

  const [targetUser] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.id, targetId));

  if (!targetUser) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  await deleteUserById(targetId, req, res);
});

export default router;
