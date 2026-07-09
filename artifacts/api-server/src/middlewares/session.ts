import session from "express-session";
import type { RequestHandler } from "express";

const sessionSecret = process.env.SESSION_SECRET;

if (!sessionSecret) {
  throw new Error(
    "SESSION_SECRET must be set. Did you forget to provision this secret?",
  );
}

const isProduction = process.env.NODE_ENV === "production";

export const sessionMiddleware: RequestHandler = session({
  secret: sessionSecret,
  name: "lrmc.sid",
  resave: false,
  saveUninitialized: false,
  proxy: true,
  cookie: {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
  },
});

declare module "express-session" {
  interface SessionData {
    userId?: number;
    role?: string;
    sessionVersion?: number;
  }
}
