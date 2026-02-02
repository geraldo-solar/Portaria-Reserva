import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
// Use local _lib copies to ensure Vercel bundles them correctly
import { appRouter } from "./_lib/server/routers";
import { createContext } from "./_lib/server/_core/context";

const app = express();

// Configure body parser
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// RAW DEBUG ENDPOINT
app.post("/api/debug-create", (req, res) => {
  try {
    console.log("[RawDebug] Hit with body:", req.body);
    // Force usage of context to ensure it's loaded
    console.log("Context loaded:", typeof createContext);

    res.json({
      success: true,
      message: "Raw endpoint worked (LOCAL_LIB STRATEGY) - v" + new Date().getTime(),
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
