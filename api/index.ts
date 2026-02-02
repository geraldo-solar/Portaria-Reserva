import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../server/routers";
import { createContext } from "../server/_core/context";
import { getDb } from "../server/db";
import { sql } from "drizzle-orm";

const app = express();

// Configure body parser
// Use large limit for image uploads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// DB DIAGNOSTIC ENDPOINT
app.get("/api/debug-db-check", async (req, res) => {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not initialized");

    // List tables (Postgres)
    const result = await db.execute(sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`);

    // Check specific table schema (Postgres)
    let schemaInfo = null;
    try {
      schemaInfo = await db.execute(sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'ticket_types'`);
    } catch (e) {
      schemaInfo = "Could not describe table (it may not exist)";
    }

    res.json({
      success: true,
      tables: result[0], // Postgres returns rows in the rows property, but drizzle execute might return differently depending on driver. 
      // node-postgres returns { rows: [], ... }. Drizzle's execute with node-postgres returns query result.
      // Let's just return the whole result to inspect.
      ticketTypesSchema: schemaInfo
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message, stack: e.stack });
  }
});

// RAW DEBUG ENDPOINT
app.post("/api/debug-create", (req, res) => {
  try {
    console.log("[RawDebug] Hit (FULL RESTORE)");
    res.json({
      success: true,
      message: "Raw endpoint worked (FULL RESTORE) - v" + new Date().getTime(),
      received: req.body
    });
  } catch (e: any) {
    console.error("[RawDebug] Error:", e);
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/debug-tickets", async (req, res) => {
  try {
    const db = await getDb();
    if (!db) throw new Error("DB not init");
    const allTickets = await db.select().from(sql`tickets`);
    res.json({ count: allTickets.length, tickets: allTickets });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// AUTO MIGRATION ENDPOINT (Temporary)
app.get("/api/debug-migrate", async (req, res) => {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not initialized");

    console.log("[Migration] Starting...");

    // Execute DDL statements one by one
    await db.execute(sql`CREATE TYPE "public"."payment_method" AS ENUM('dinheiro', 'pix', 'cartao')`);
    await db.execute(sql`CREATE TYPE "public"."role" AS ENUM('user', 'admin')`);
    await db.execute(sql`CREATE TYPE "public"."status" AS ENUM('active', 'cancelled', 'used')`);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "audit_log" (
        "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        "action" varchar(100) NOT NULL,
        "entity_type" varchar(100) NOT NULL,
        "entity_id" integer NOT NULL,
        "user_id" integer,
        "details" text,
        "created_at" timestamp DEFAULT now() NOT NULL
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "customers" (
        "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        "name" varchar(255) NOT NULL,
        "email" varchar(320),
        "phone" varchar(20),
        "created_at" timestamp DEFAULT now() NOT NULL
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "ticket_types" (
        "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        "name" varchar(255) NOT NULL,
        "description" text,
        "price" integer NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "tickets" (
        "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        "customer_id" integer NOT NULL,
        "ticket_type_id" integer NOT NULL,
        "price" integer NOT NULL,
        "payment_method" "payment_method" NOT NULL,
        "status" "status" DEFAULT 'active' NOT NULL,
        "cancelled_at" timestamp,
        "cancellation_reason" text,
        "printed_at" timestamp,
        "used_at" timestamp,
        "qr_token" varchar(255),
        "valid_until" timestamp,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL,
        CONSTRAINT "tickets_qr_token_unique" UNIQUE("qr_token")
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        "open_id" varchar(64) NOT NULL,
        "name" text,
        "email" varchar(320),
        "login_method" varchar(64),
        "role" "role" DEFAULT 'user' NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL,
        "last_signed_in" timestamp DEFAULT now() NOT NULL,
        CONSTRAINT "users_open_id_unique" UNIQUE("open_id")
      )
    `);

    res.json({ success: true, message: "Migration executed successfully" });
  } catch (e: any) {
    console.error("[Migration] Error:", e);
    // Ignore errors if types already exist
    res.status(200).json({ error: e.message, warning: "Some parts might have already run" });
  }
});

// tRPC API
app.all("/api/trpc/*", createExpressMiddleware({
  router: appRouter,
  createContext,
}));

// Catch all other /api routes
app.all("/api/*", (req, res) => {
  res.status(404).json({ error: "API endpoint not found" });
});

export default app;
