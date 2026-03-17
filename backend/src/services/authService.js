const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const { HttpError } = require("../utils/httpError");
const { getEnvString, getEnvNumber } = require("../utils/env");
const userRepository = require("../db/userRepository");
const emailVerificationRepository = require("../db/emailVerificationRepository");
const emailService = require("./emailService");

function cleanEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function isValidEmailFormat(email) {
  if (!email) return false;
  if (email.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getJwtSecret() {
  const secret = getEnvString("JWT_SECRET", "");
  const env = getEnvString("NODE_ENV", "development");
  if (!secret && env === "production") {
    throw new HttpError(500, "JWT_SECRET no configurado");
  }
  return secret || "dev-secret-change-me";
}

function getVerificationSecret() {
  const secret = getEnvString("EMAIL_VERIFICATION_SECRET", "");
  if (secret) return secret;
  return getJwtSecret();
}

function signToken(user) {
  const secret = getJwtSecret();
  const payload = { sub: user.id, email: user.email };
  return jwt.sign(payload, secret, { expiresIn: "7d" });
}

function generateNumericCode(length) {
  const len = typeof length === "number" && length >= 4 && length <= 8 ? Math.floor(length) : 6;
  const min = 10 ** (len - 1);
  const max = 10 ** len - 1;
  const n = crypto.randomInt(min, max + 1);
  return String(n);
}

function hashCode(email, code) {
  const secret = getVerificationSecret();
  return crypto.createHash("sha256").update(`${cleanEmail(email)}:${String(code || "").trim()}:${secret}`).digest("hex");
}

function addMinutesIso(minutes) {
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

function nowIso() {
  return new Date().toISOString();
}

async function register({ email, password, name }) {
  const e = cleanEmail(email);
  const p = String(password || "");
  const n = typeof name === "string" ? name.trim() : "";

  if (!isValidEmailFormat(e)) throw new HttpError(400, "Email inválido");
  if (p.length < 8) throw new HttpError(400, "La contraseña debe tener al menos 8 caracteres");

  const existing = userRepository.findUserByEmail(e);
  if (existing) throw new HttpError(409, "Este email ya está registrado");

  const password_hash = await bcrypt.hash(p, 10);
  const created = userRepository.createUser({ email: e, password_hash, name: n || null });
  if (!created) throw new HttpError(500, "No se pudo crear el usuario");

  const codeLength = getEnvNumber("EMAIL_VERIFICATION_CODE_LENGTH", 6);
  const ttlMinutes = getEnvNumber("EMAIL_VERIFICATION_TTL_MINUTES", 10);
  const code = generateNumericCode(codeLength);
  const code_hash = hashCode(e, code);
  const expires_at = addMinutesIso(ttlMinutes);
  const sent_at = nowIso();

  emailVerificationRepository.upsertForUser(created.id, code_hash, expires_at, sent_at);
  await emailService.sendVerificationCode({ to: e, code });

  return {
    verification_required: true,
    email: e,
    user: { id: created.id, email: created.email, name: created.name, email_verified: false },
  };
}

async function login({ email, password }) {
  const e = cleanEmail(email);
  const p = String(password || "");
  if (!isValidEmailFormat(e)) throw new HttpError(400, "Email inválido");
  if (!p) throw new HttpError(400, "Contraseña requerida");

  const found = userRepository.findUserByEmail(e);
  if (!found || !found.password_hash) throw new HttpError(401, "Credenciales inválidas");
  if (!found.email_verified) throw new HttpError(403, "Debes verificar tu correo antes de iniciar sesión");

  const ok = await bcrypt.compare(p, found.password_hash);
  if (!ok) throw new HttpError(401, "Credenciales inválidas");

  const token = signToken(found);
  return { token, user: { id: found.id, email: found.email, name: found.name, email_verified: true } };
}

async function verifyEmail({ email, code }) {
  const e = cleanEmail(email);
  const c = String(code || "").trim();

  if (!isValidEmailFormat(e)) throw new HttpError(400, "Email inválido");
  if (!/^\d{4,8}$/.test(c)) throw new HttpError(400, "Código inválido");

  const user = userRepository.findUserByEmail(e);
  if (!user) throw new HttpError(400, "Código inválido");
  if (user.email_verified) {
    const token = signToken(user);
    return { token, user: { id: user.id, email: user.email, name: user.name, email_verified: true } };
  }

  const v = emailVerificationRepository.findForUser(user.id);
  if (!v) throw new HttpError(400, "Código inválido");

  if (new Date(v.expires_at).getTime() < Date.now()) {
    emailVerificationRepository.deleteForUser(user.id);
    throw new HttpError(400, "Código expirado");
  }

  if (v.attempts >= 5) throw new HttpError(429, "Demasiados intentos. Reenvía el código.");

  const expected = hashCode(e, c);
  if (expected !== v.code_hash) {
    emailVerificationRepository.incrementAttempts(user.id);
    throw new HttpError(400, "Código inválido");
  }

  userRepository.markEmailVerified(user.id);
  emailVerificationRepository.deleteForUser(user.id);

  const token = signToken(user);
  return { token, user: { id: user.id, email: user.email, name: user.name, email_verified: true } };
}

async function resendVerification({ email }) {
  const e = cleanEmail(email);
  if (!isValidEmailFormat(e)) throw new HttpError(400, "Email inválido");

  const user = userRepository.findUserByEmail(e);
  if (!user) return { sent: true };
  if (user.email_verified) return { sent: true };

  const v = emailVerificationRepository.findForUser(user.id);
  const minSeconds = getEnvNumber("EMAIL_VERIFICATION_RESEND_SECONDS", 60);
  if (v && v.last_sent_at) {
    const last = new Date(v.last_sent_at).getTime();
    if (Number.isFinite(last) && last + minSeconds * 1000 > Date.now()) {
      throw new HttpError(429, "Espera un momento antes de reenviar el código");
    }
  }

  const codeLength = getEnvNumber("EMAIL_VERIFICATION_CODE_LENGTH", 6);
  const ttlMinutes = getEnvNumber("EMAIL_VERIFICATION_TTL_MINUTES", 10);
  const code = generateNumericCode(codeLength);
  const code_hash = hashCode(e, code);
  const expires_at = addMinutesIso(ttlMinutes);
  const sent_at = nowIso();

  emailVerificationRepository.upsertForUser(user.id, code_hash, expires_at, sent_at);
  await emailService.sendVerificationCode({ to: e, code });

  return { sent: true };
}

async function me(userId) {
  const user = userRepository.findUserById(userId);
  if (!user) throw new HttpError(404, "Usuario no encontrado");
  return { id: user.id, email: user.email, name: user.name, email_verified: !!user.email_verified };
}

module.exports = { register, login, me, verifyEmail, resendVerification, getJwtSecret };

