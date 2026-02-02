import express from "express";
// import { createExpressMiddleware } from "@trpc/server/adapters/express";
// import { appRouter } from "../server/routers";
// import { createContext } from "../server/_core/context";
// import { getDb } from "../server/db";
// import { ENV } from "../server/_core/env";
// import * as schema from "../drizzle/schema";

const app = express();

app.use(express.json());

// RAW DEBUG ENDPOINT
app.post("/api/debug-create", (req, res) => {
  res.json({
    success: true,
    message: "REVERTED VERCEL JSON PROBE - v" + new Date().getTime(),
  });
});

// tRPC API
// app.all("/api/trpc/*", createExpressMiddleware({
//   router: appRouter,
//   createContext,
// }));

export default app;
