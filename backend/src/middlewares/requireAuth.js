const jwt = require("jsonwebtoken");

const { HttpError } = require("../utils/httpError");
const { getJwtSecret } = require("../services/authService");
const userRepository = require("../db/userRepository");
const { getEnvString } = require("../utils/env");

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const raw = typeof header === "string" ? header : "";
  const match = raw.match(/^Bearer\s+(.+)$/i);
  const token = match ? match[1] : null;
  if (!token) return next(new HttpError(401, "No autorizado"));

  try {
    const payload = jwt.verify(token, getJwtSecret());
    const sub = payload && typeof payload === "object" && "sub" in payload ? String(payload.sub) : null;
    const email = payload && typeof payload === "object" && "email" in payload ? String(payload.email) : null;
    if (!sub) return next(new HttpError(401, "No autorizado"));
    req.user = { id: sub, email };
    return next();
  } catch {
    return next(new HttpError(401, "No autorizado"));
  }
}

async function requireAdmin(req, res, next) {
  requireAuth(req, res, (err) => {
    if (err) return next(err);
    Promise.resolve()
      .then(async () => {
        const id = req.user && req.user.id ? String(req.user.id) : "";
        if (!id) throw new HttpError(401, "No autorizado");
        const user = await userRepository.findUserById(id);
        if (!user) throw new HttpError(401, "No autorizado");
        const adminEmail = String(getEnvString("ADMIN_EMAIL", "admin@localisa.com") || "").trim().toLowerCase();
        const isAdmin =
          (user.role && String(user.role).toLowerCase() === "admin") ||
          (req.user && req.user.email && String(req.user.email).trim().toLowerCase() === adminEmail);
        if (!isAdmin) throw new HttpError(403, "Solo Admin");
        req.user = { ...req.user, role: "admin" };
      })
      .then(() => next())
      .catch((e) => next(e));
  });
}

module.exports = { requireAuth, requireAdmin };
