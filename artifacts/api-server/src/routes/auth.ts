import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import {
  RegisterBody,
  RegisterResponse,
  LoginBody,
  LoginResponse,
  GetCurrentUserResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.post("/auth/register", async (req, res): Promise<void> => {
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

  const passwordHash = await bcrypt.hash(password, 10);

  const [user] = await db
    .insert(usersTable)
    .values({ email, passwordHash, fullName, phone, role: "member" })
    .returning();

  if (!user) {
    res.status(500).json({ error: "Failed to create user" });
    return;
  }

  req.session.userId = user.id;
  req.session.role = user.role;

  res.status(201).json(RegisterResponse.parse(user));
});

router.post("/auth/login", async (req, res): Promise<void> => {
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

  req.session.userId = user.id;
  req.session.role = user.role;

  res.json(LoginResponse.parse(user));
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

  res.json(GetCurrentUserResponse.parse(user));
});

export default router;
