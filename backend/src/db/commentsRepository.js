const crypto = require("crypto");

const { queryOne, execute } = require("./index");

function nowIso() {
  return new Date().toISOString();
}

function generateId() {
  return crypto.randomBytes(16).toString("hex");
}

function normalizeRow(row) {
  if (!row) return null;
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    hospital_id: String(row.hospital_id),
    comment: String(row.comment || ""),
    created_at: row.created_at ? String(row.created_at) : null,
    updated_at: row.updated_at ? String(row.updated_at) : null,
  };
}

async function getHospitalComment({ userId, hospitalId }) {
  const row = await queryOne(
    `SELECT id, user_id, hospital_id, comment, created_at, updated_at
     FROM hospital_comments
     WHERE user_id = ? AND hospital_id = ?
     LIMIT 1`,
    [String(userId || ""), String(hospitalId || "")],
  );
  return normalizeRow(row);
}

async function upsertHospitalComment({ userId, hospitalId, comment }) {
  const id = generateId();
  const now = nowIso();
  const text = String(comment || "");
  await execute(
    `INSERT INTO hospital_comments (id, user_id, hospital_id, comment, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT (user_id, hospital_id) DO UPDATE SET
       comment = excluded.comment,
       updated_at = excluded.updated_at`,
    [id, String(userId || ""), String(hospitalId || ""), text, now, now],
  );
  return getHospitalComment({ userId, hospitalId });
}

async function deleteHospitalComment({ userId, hospitalId }) {
  const r = await execute("DELETE FROM hospital_comments WHERE user_id = ? AND hospital_id = ?", [
    String(userId || ""),
    String(hospitalId || ""),
  ]);
  return (r && r.rowCount) > 0;
}

module.exports = { getHospitalComment, upsertHospitalComment, deleteHospitalComment };
