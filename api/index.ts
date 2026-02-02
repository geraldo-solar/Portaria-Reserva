import express from "express";
// import { createExpressMiddleware } from "@trpc/server/adapters/express";
// import { appRouter } from "../server/routers";
// import { createContext } from "../server/_core/context";

const app = express();

// Configure body parser
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// RAW DEBUG ENDPOINT (Pure Express, No Imports)
app.post("/api/debug-create", (req, res) => {
  console.log("[RawDebug] Hit (STRIPPED BUNDLE)");
  res.json({
    success: true,
    message: "Raw endpoint worked (STRIPPED BUNDLE) - v" + new Date().getTime(),
    received: req.body
  });
});

// tRPC API
// app.all("/api/trpc/*", createExpressMiddleware({
//   router: appRouter,
//   createContext,
// }));

// Catch all other /api routes
app.all("/api/*", (req, res) => {
  res.status(404).json({ error: "API endpoint not found" });
});

export default app;
