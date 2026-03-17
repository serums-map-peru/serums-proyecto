const { getDb } = require("./index");

function normalizeRow(row) {
  if (!row) return null;
  return {
    user_id: String(row.user_id),
    code_hash: String(row.code_hash),
    expires_at: String(row.expires_at),
    attempts: typeof row.attempts === "number" ? row.attempts : Number(row.attempts || 0),
    last_sent_at: row.last_sent_at ? String(row.last_sent_at) : null,
    created_at: row.created_at ? String(row.created_at) : null,
  };
}

function findForUser(userId) {
  const db = getDb();
  if (!db) return null;
  const row = db
    .prepare(
      "SELECT user_id, code_hash, expires_at, attempts, last_sent_at, created_at FROM email_verifications WHERE user_id = ? LIMIT 1",
    )
    .get(String(userId || ""));
  return normalizeRow(row);
}

function upsertForUser(userId, code_hash, expires_at, last_sent_at) {
  const db = getDb();
  if (!db) return false;
  const created_at = new Date().toISOString();
  const r = db
    .prepare(
      `
      INSERT INTO email_verifications (user_id, code_hash, expires_at, attempts, last_sent_at, created_at)
      VALUES (?, ?, ?, 0, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        code_hash = excluded.code_hash,
        expires_at = excluded.expires_at,
        attempts = 0,
        last_sent_at = excluded.last_sent_at
    `,
    )
    .run(
      String(userId || ""),
      String(code_hash || ""),
      String(expires_at || ""),
      last_sent_at ? String(last_sent_at) : null,
      created_at,
    );
  return r.changes > 0;
}

function incrementAttempts(userId) {
  const db = getDb();
  if (!db) return false;
  const r = db.prepare("UPDATE email_verifications SET attempts = attempts + 1 WHERE user_id = ?").run(String(userId || ""));
  return r.changes > 0;
}

function deleteForUser(userId) {
  const db = getDb();
  if (!db) return false;
  const r = db.prepare("DELETE FROM email_verifications WHERE user_id = ?").run(String(userId || ""));
  return r.changes > 0;
}

module.exports = { findForUser, upsertForUser, incrementAttempts, deleteForUser };
