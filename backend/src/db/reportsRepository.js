const crypto = require("crypto");

const { queryAll, queryOne, execute } = require("./index");

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
    subject_type: String(row.subject_type || ""),
    subject_id: String(row.subject_id || ""),
    category: row.category != null ? String(row.category) : null,
    message: String(row.message || ""),
    status: String(row.status || "open"),
    created_at: row.created_at ? String(row.created_at) : null,
  };
}

async function createReport({ userId, subject_type, subject_id, category, message }) {
  const id = generateId();
  const created_at = nowIso();
  await execute(
    `INSERT INTO reports (id, user_id, subject_type, subject_id, category, message, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'open', ?)`,
    [
      String(id),
      userId != null ? String(userId) : null,
      String(subject_type),
      String(subject_id),
      category != null ? String(category) : null,
      String(message),
      created_at,
    ],
  );
  return getReportById({ id });
}

async function getReportById({ id }) {
  const row = await queryOne(
    `SELECT id, subject_type, subject_id, category, message, status, created_at
     FROM reports
     WHERE id = ?
     LIMIT 1`,
    [String(id)],
  );
  return normalizeRow(row);
}

async function listReports({ subject_type = null, subject_id = null, status = null, limit = 200 }) {
  const n = Number.isFinite(limit) ? Math.max(1, Math.min(500, Math.round(limit))) : 200;
  const where = [];
  const params = [];
  if (subject_type) {
    where.push("subject_type = ?");
    params.push(String(subject_type));
  }
  if (subject_id) {
    where.push("subject_id = ?");
    params.push(String(subject_id));
  }
  if (status) {
    where.push("status = ?");
    params.push(String(status));
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const rows = await queryAll(
    `SELECT id, subject_type, subject_id, category, message, status, created_at
     FROM reports
     ${whereSql}
     ORDER BY created_at DESC
     LIMIT ?`,
    [...params, n],
  );
  return rows.map(normalizeRow).filter(Boolean);
}

async function updateReportStatus({ id, status }) {
  const s = String(status || "").trim().toLowerCase();
  if (s !== "open" && s !== "closed") return null;
  const r = await execute("UPDATE reports SET status = ? WHERE id = ?", [s, String(id)]);
  if (!(r && r.rowCount)) return null;
  return getReportById({ id });
}

module.exports = { createReport, listReports, updateReportStatus, getReportById };

