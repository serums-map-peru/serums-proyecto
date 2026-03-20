const express = require("express");
const cors = require("cors");

const { getEnvNumber, getEnvString } = require("./src/utils/env");
const { logger } = require("./src/middlewares/logger");
const { notFound } = require("./src/middlewares/notFound");
const { errorHandler } = require("./src/middlewares/errorHandler");
const { apiRouter } = require("./src/routes");

function normalizeOrigin(value) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return "";
  try {
    const u = new URL(raw);
    return u.origin;
  } catch {
    return raw.replace(/\/$/, "");
  }
}

function parseAllowedOrigins(value) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw || raw === "*") return { any: true, list: [] };
  const list = raw
    .split(",")
    .map((s) => normalizeOrigin(s))
    .filter(Boolean);
  return { any: false, list };
}

function createSimpleRateLimiter({ windowMs, max, match }) {
  const store = new Map();
  return (req, res, next) => {
    if (!match(req)) return next();
    const ip = req.ip || req.connection?.remoteAddress || "unknown";
    const now = Date.now();
    const key = `${ip}`;
    const existing = store.get(key);
    if (!existing || now - existing.start >= windowMs) {
      store.set(key, { start: now, count: 1 });
      return next();
    }
    existing.count += 1;
    if (existing.count > max) {
      res.status(429).json({ error: { message: "Demasiadas solicitudes. Reintenta en unos segundos.", status: 429 } });
      return;
    }
    next();
  };
}

function createApp() {
  const app = express();

  app.disable("x-powered-by");
  const trustProxy = getEnvNumber("TRUST_PROXY", 0);
  if (trustProxy) app.set("trust proxy", trustProxy);

  const corsOrigin = getEnvString("CORS_ORIGIN", "*");
  const allowed = parseAllowedOrigins(corsOrigin);
  app.use(
    cors({
      origin: (origin, cb) => {
        if (allowed.any) return cb(null, true);
        if (!origin) return cb(null, true);
        const normalized = normalizeOrigin(origin);
        return cb(null, allowed.list.includes(normalized));
      },
    }),
  );

  app.use(express.json({ limit: getEnvString("JSON_BODY_LIMIT", "1mb") }));
  app.use(logger);

  const authWindowMs = getEnvNumber("AUTH_RATE_LIMIT_WINDOW_MS", 60_000);
  const authMax = getEnvNumber("AUTH_RATE_LIMIT_MAX", 30);
  app.use(
    createSimpleRateLimiter({
      windowMs: authWindowMs,
      max: authMax,
      match: (req) =>
        typeof req.path === "string" && (req.path.startsWith("/api/auth/") || req.path.startsWith("/auth/")),
    }),
  );

  const osmWindowMs = getEnvNumber("OSM_RATE_LIMIT_WINDOW_MS", 60_000);
  const osmMax = getEnvNumber("OSM_RATE_LIMIT_MAX", 40);
  app.use(
    createSimpleRateLimiter({
      windowMs: osmWindowMs,
      max: osmMax,
      match: (req) =>
        typeof req.path === "string" &&
        (req.path.startsWith("/api/buscar") ||
          req.path.startsWith("/api/ruta") ||
          req.path.startsWith("/api/lugares-cercanos") ||
          req.path.startsWith("/buscar") ||
          req.path.startsWith("/ruta") ||
          req.path.startsWith("/lugares-cercanos")),
    }),
  );

  app.get("/", (req, res) => {
    res.status(200).json({
      ok: true,
      service: "SERUMS Map Perú API",
      routes: { health: "/health (o /api/health)", docs: "/docs (o /api/docs)" },
    });
  });

  app.use("/api", apiRouter);
  app.use(apiRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
