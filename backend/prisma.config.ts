import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations", seed: "tsx prisma/seed.ts" },
  // Migrations need a session-bound connection for PostgreSQL advisory locks.
  // Keep local/test DATABASE_URL overrides isolated from hosted credentials.
  datasource: {
    url: process.env.VERCEL && process.env.VERCEL_ENV !== "production"
      ? process.env.PREVIEW_DATABASE_URL_UNPOOLED
      : process.env.VERCEL
      ? process.env.DATABASE_URL_UNPOOLED ||
        process.env.POSTGRES_URL_NON_POOLING ||
        process.env.DATABASE_URL
      : process.env.DATABASE_URL,
  },
});
