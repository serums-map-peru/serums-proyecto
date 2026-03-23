const jwt = require("jsonwebtoken");

const { HttpError } = require("../utils/httpError");
const { getJwtSecret } = require("../services/authService");

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

module.exports = { requireAuth };

