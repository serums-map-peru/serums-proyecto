import crypto from "node:crypto";

function base64UrlEncode(buf: Buffer) {
  return buf
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecodeToBuffer(value: string) {
  const b64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), "=");
  return Buffer.from(padded, "base64");
}

export function nowIso() {
  return new Date().toISOString();
}

export function generateId() {
  return crypto.randomBytes(16).toString("hex");
}

export function getJwtSecret() {
  const fromEnv = process.env.JWT_SECRET;
  if (fromEnv && fromEnv.trim()) return fromEnv.trim();
  if (process.env.NODE_ENV === "production") throw new Error("JWT_SECRET requerido en producción");
  return "dev-secret-change-me";
}

export function signJwt(payload: Record<string, unknown>) {
  const secret = getJwtSecret();
  const header = { alg: "HS256", typ: "JWT" };
  const headerB64 = base64UrlEncode(Buffer.from(JSON.stringify(header), "utf8"));
  const payloadB64 = base64UrlEncode(Buffer.from(JSON.stringify(payload), "utf8"));
  const data = `${headerB64}.${payloadB64}`;
  const sig = crypto.createHmac("sha256", secret).update(data).digest();
  const sigB64 = base64UrlEncode(sig);
  return `${data}.${sigB64}`;
}

export function verifyJwt(token: string) {
  let secret: string;
  try {
    secret = getJwtSecret();
  } catch {
    return null;
  }
  const parts = String(token || "").split(".");
  if (parts.length !== 3) return null;
  const [h, p, s] = parts;
  if (!h || !p || !s) return null;
  const data = `${h}.${p}`;
  const expected = crypto.createHmac("sha256", secret).update(data).digest();
  const got = base64UrlDecodeToBuffer(s);
  if (got.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(got, expected)) return null;
  try {
    const payloadJson = base64UrlDecodeToBuffer(p).toString("utf8");
    const payload = JSON.parse(payloadJson);
    return payload && typeof payload === "object" ? (payload as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export function normalizeEmail(email: string) {
  return String(email || "").trim().toLowerCase();
}

export function isValidEmailFormat(email: string) {
  const e = String(email || "").trim();
  if (!e) return false;
  if (e.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

export function hashPassword(password: string) {
  const p = String(password || "");
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(p, salt, 32, { N: 16384, r: 8, p: 1 });
  return `scrypt$16384$8$1$${base64UrlEncode(salt)}$${base64UrlEncode(key)}`;
}

export function verifyPassword(password: string, encoded: string) {
  const parts = String(encoded || "").split("$");
  if (parts.length !== 8) return false;
  const algo = parts[0];
  if (algo !== "scrypt") return false;
  const N = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  const saltB64 = parts[5];
  const keyB64 = parts[7];
  if (!Number.isFinite(N) || !Number.isFinite(r) || !Number.isFinite(p)) return false;
  const salt = base64UrlDecodeToBuffer(saltB64);
  const expected = base64UrlDecodeToBuffer(keyB64);
  const got = crypto.scryptSync(String(password || ""), salt, expected.length, { N, r, p });
  if (got.length !== expected.length) return false;
  return crypto.timingSafeEqual(got, expected);
}
