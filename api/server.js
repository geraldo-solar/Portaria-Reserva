// api/index.ts
import express from "express";
var app = express();
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
});
app.post("/api/debug-create", (req, res) => {
  console.log("[RawDebug] Hit (STRIPPED BUNDLE)");
  res.json({
    success: true,
    message: "Raw endpoint worked (STRIPPED BUNDLE) - v" + (/* @__PURE__ */ new Date()).getTime(),
    received: req.body
  });
});
app.all("/api/*", (req, res) => {
  res.status(404).json({ error: "API endpoint not found" });
});
var index_default = app;
export {
  index_default as default
};
