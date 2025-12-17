/**
 * Configuração Drizzle para PostgreSQL (Vercel Postgres)
 * Use este arquivo ao invés de drizzle.config.ts para deploy standalone
 */

import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle",
  schema: "./drizzle/schema-postgres.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
