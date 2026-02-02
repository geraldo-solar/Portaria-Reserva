import express from "express";
// import { createExpressMiddleware } from "@trpc/server/adapters/express";
// Use local _lib copies to ensure Vercel bundles them correctly
// import { appRouter } from "./_lib/server/routers";
// import { createContext } from "./_lib/server/_core/context";

const app = express();

// Configure body parser
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// RAW DEBUG ENDPOINT
app.post("/api/debug-create", async (req, res) => {
  try {
    console.log("[RawDebug] Hit with body:", req.body);

    // PROBE: Try to load modules dynamically to see which one fails
    let contextStatus = "not loaded";
    let routerStatus = "not loaded";

    try {
      // @ts-ignore
      await import("./_lib/server/_core/context");
      contextStatus = "success";
    } catch (e: any) {
      contextStatus = "failed: " + e.message;
      console.error("Context load failed:", e);
    }

    try {
      // @ts-ignore
      await import("./_lib/server/routers");
      routerStatus = "success";
    } catch (e: any) {
      routerStatus = "failed: " + e.message;
      console.error("Router load failed:", e);
    }

    res.json({
      success: true,
      message: "DIAGNOSTIC PROBE - v" + new Date().getTime(),
      diagnostics: {
        context: contextStatus,
        router: routerStatus
      },
      received: req.body
    });
  } catch (e: any) {
    console.error("[RawDebug] Error:", e);
    res.status(500).json({ error: e.message });
  }
});

// tRPC API - DISABLED FOR DIAGNOSTICS
// app.all("/api/trpc/*", createExpressMiddleware({
//   router: appRouter,
//   createContext,
// }));

// Catch all other /api routes
app.all("/api/*", (req, res) => {
  res.status(404).json({ error: "API endpoint not found", diagnostics_mode: true });
});

export default app;
