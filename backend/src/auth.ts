import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import type { PrismaClient } from "./generated/prisma/client.js";
import { createDatabase } from "./database.js";

export function createAuthentication(db: PrismaClient, secret: string, origins: string[]) {
  if (secret.length < 32)
    throw new Error("BETTER_AUTH_SECRET must contain at least 32 characters.");
  return betterAuth({
    appName: "Methodica",
    secret,
    baseURL: { allowedHosts: origins.map((origin) => new URL(origin).host), fallback: origins[0] },
    trustedOrigins: origins,
    database: prismaAdapter(db, { provider: "postgresql" }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      autoSignIn: true,
    },
    user: { changeEmail: { enabled: false } },
    session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
    advanced: {
      cookiePrefix: "methodica",
      useSecureCookies: origins.every((origin) => origin.startsWith("https://")),
      ipAddress: { ipAddressHeaders: process.env.VERCEL ? ["x-real-ip"] : [] },
    },
    rateLimit: {
      enabled: true,
      storage: "database",
      window: 60,
      max: 100,
      customRules: {
        "/sign-in/email": { window: 60, max: 10 },
        "/sign-up/email": { window: 60, max: 5 },
      },
    },
  });
}

export type Authentication = ReturnType<typeof createAuthentication>;
export interface AccountServices {
  db: PrismaClient;
  auth: Authentication;
  origins: string[];
}

let services: AccountServices | undefined;
export async function closeAccountServices() {
  if (services) await services.db.$disconnect();
  services = undefined;
}

export function accountServices(): AccountServices | null {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET) return null;
  if (!services) {
    const origins = process.env.VERCEL
      ? [
          process.env.BETTER_AUTH_URL || "https://methodica-azure.vercel.app",
          process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`,
          process.env.VERCEL_BRANCH_URL && `https://${process.env.VERCEL_BRANCH_URL}`,
        ].filter((value): value is string => Boolean(value))
      : [process.env.BETTER_AUTH_URL || "http://localhost:5173"];
    const db = createDatabase(
      process.env.DATABASE_URL,
      process.env.LOCAL_PRISMA_DEV === "true" ? 1 : 3
    );
    services = {
      db,
      auth: createAuthentication(db, process.env.BETTER_AUTH_SECRET, origins),
      origins,
    };
  }
  return services;
}
