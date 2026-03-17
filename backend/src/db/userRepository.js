const crypto = require("crypto");

const { getDb } = require("./index");

function nowIso() {
  return new Date().toISOString();
}

function generateId() {
  return crypto.randomBytes(16).toString("hex");
}

function normalizeUserRow(row) {
  if (!row) return null;
  return {
    id: String(row.id),
    email: String(row.email),
    password_hash: row.password_hash ? String(row.password_hash) : null,
    name: row.name ? String(row.name) : null,
    email_verified: typeof row.email_verified === "number" ? row.email_verified === 1 : !!row.email_verified,
    email_verified_at: row.email_verified_at ? String(row.email_verified_at) : null,
    created_at: row.created_at ? String(row.created_at) : null,
  };
}

function findUserByEmail(email) {
  const db = getDb();
  if (!db) return null;
  const row = db
    .prepare(
      "SELECT id, email, password_hash, name, email_verified, email_verified_at, created_at FROM users WHERE lower(email) = lower(?) LIMIT 1",
    )
    .get(String(email || ""));
  return normalizeUserRow(row);
}

function findUserById(id) {
  const db = getDb();
  if (!db) return null;
  const row = db
    .prepare("SELECT id, email, name, email_verified, email_verified_at, created_at FROM users WHERE id = ? LIMIT 1")
    .get(String(id || ""));
  return normalizeUserRow(row);
}

function createUser({ email, password_hash, name }) {
  const db = getDb();
  if (!db) return null;
  const id = generateId();
  const created_at = nowIso();
  db.prepare("INSERT INTO users (id, email, password_hash, name, created_at) VALUES (?, ?, ?, ?, ?)").run(
    id,
    String(email),
    String(password_hash),
    name ? String(name) : null,
    created_at,
  );
  return { id, email: String(email), name: name ? String(name) : null, email_verified: false, email_verified_at: null, created_at };
}

function markEmailVerified(userId) {
  const db = getDb();
  if (!db) return false;
  const updated_at = nowIso();
  const r = db
    .prepare("UPDATE users SET email_verified = 1, email_verified_at = ? WHERE id = ?")
    .run(updated_at, String(userId || ""));
  return r.changes > 0;
}

module.exports = { findUserByEmail, findUserById, createUser, markEmailVerified };

