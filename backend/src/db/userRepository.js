const crypto = require("crypto");

const { queryOne, execute, DB_DRIVER } = require("./index");

function nowIso() {
  return new Date().toISOString();
}

function generateId() {
  return crypto.randomBytes(16).toString("hex");
}

function normalizeUserRow(row) {
  if (!row) return null;
  const emailVerified =
    typeof row.email_verified === "boolean"
      ? row.email_verified
      : typeof row.email_verified === "number"
        ? row.email_verified === 1
        : !!row.email_verified;
  return {
    id: String(row.id),
    email: String(row.email),
    password_hash: row.password_hash ? String(row.password_hash) : null,
    name: row.name ? String(row.name) : null,
    email_verified: emailVerified,
    email_verified_at: row.email_verified_at ? String(row.email_verified_at) : null,
    created_at: row.created_at ? String(row.created_at) : null,
  };
}

async function findUserByEmail(email) {
  const row = await queryOne(
    "SELECT id, email, password_hash, name, email_verified, email_verified_at, created_at FROM users WHERE lower(email) = lower(?) LIMIT 1",
    [String(email || "")],
  );
  return normalizeUserRow(row);
}

async function findUserById(id) {
  const row = await queryOne("SELECT id, email, name, email_verified, email_verified_at, created_at FROM users WHERE id = ? LIMIT 1", [
    String(id || ""),
  ]);
  return normalizeUserRow(row);
}

async function createUser({ email, password_hash, name }) {
  const id = generateId();
  const created_at = nowIso();
  const r = await execute("INSERT INTO users (id, email, password_hash, name, created_at) VALUES (?, ?, ?, ?, ?)", [
    id,
    String(email),
    String(password_hash),
    name ? String(name) : null,
    created_at,
  ]);
  if (!r || r.rowCount <= 0) return null;
  return { id, email: String(email), name: name ? String(name) : null, email_verified: false, email_verified_at: null, created_at };
}

async function markEmailVerified(userId) {
  const updated_at = nowIso();
  const sql =
    DB_DRIVER === "postgres"
      ? "UPDATE users SET email_verified = TRUE, email_verified_at = ? WHERE id = ?"
      : "UPDATE users SET email_verified = 1, email_verified_at = ? WHERE id = ?";
  const r = await execute(sql, [updated_at, String(userId || "")]);
  return (r.rowCount || 0) > 0;
}

module.exports = { findUserByEmail, findUserById, createUser, markEmailVerified };
