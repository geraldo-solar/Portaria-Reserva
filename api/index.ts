import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
// import { appRouter } from "../server/routers";
import { createContext } from "../server/_core/context";

const app = express();

// Configure body parser
// Use large limit for image uploads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// RAW DEBUG ENDPOINT
app.post("/api/debug-create", (req, res) => {
  try {
    console.log("[RawDebug] Hit (CONTEXT PROBE)");
    // Force usage of context to trigger imports
    console.log("Context loaded:", typeof createContext);

    // We are NOT using appRouter yet to keep it isolated

    res.json({
      success: true,
      message: "Raw endpoint worked (CONTEXT PROBE) - v" + new Date().getTime(),
      received: req.body
    });
  } catch (e: any) {
    console.error("[RawDebug] Error:", e);
    res.status(500).json({ error: e.message });
  }
});

// tRPC API - DISABLED for this probe, only testing if context loads
// app.all("/api/trpc/*", createExpressMiddleware({
//   router: appRouter,
//   createContext,
// }));

// Catch all other /api routes
app.all("/api/*", (req, res) => {
  res.status(404).json({ error: "API endpoint not found" });
});

export default app;
