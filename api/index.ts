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

    // List tables
    const result = await db.execute(sql`SHOW TABLES`);

    // Check specific table schema
    let schemaInfo = null;
    try {
      schemaInfo = await db.execute(sql`DESCRIBE ticketTypes`);
    } catch (e) {
      schemaInfo = "Could not describe table (it may not exist)";
    }

    res.json({
      success: true,
      tables: result[0],
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
