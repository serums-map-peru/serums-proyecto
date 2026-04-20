const { HttpError } = require("../utils/httpError");
const reportsRepository = require("../db/reportsRepository");
const { getHospitalById } = require("./hospitalService");

function normalizeSubjectType(value) {
  const v = String(value || "").trim().toLowerCase();
  if (v === "hospital") return v;
  return null;
}

function normalizeStatus(value) {
  const v = String(value || "").trim().toLowerCase();
  if (v === "open" || v === "closed") return v;
  return null;
}

function cleanMessage(value) {
  if (value == null) return "";
  return String(value).replace(/\r\n/g, "\n").trim();
}

async function createReport({ userId, subject_type, subject_id, category = null, message }) {
  const t = normalizeSubjectType(subject_type);
  if (!t) throw new HttpError(400, "Tipo inválido");
  const id = String(subject_id || "").trim();
  if (!id) throw new HttpError(400, "ID inválido");

  if (t === "hospital") {
    const hospital = await getHospitalById(id);
    if (!hospital) throw new HttpError(404, "Hospital no encontrado");
  }

  const msg = cleanMessage(message);
  if (!msg.trim()) throw new HttpError(400, "Mensaje requerido");
  if (msg.length > 2000) throw new HttpError(400, "Mensaje demasiado largo");

  const cat = category != null && String(category).trim() ? String(category).trim() : null;
  const saved = await reportsRepository.createReport({ userId, subject_type: t, subject_id: id, category: cat, message: msg });
  return { report: saved };
}

async function listReports({ status, subject_type, subject_id, limit }) {
  const s = status != null ? normalizeStatus(status) : null;
  if (status != null && !s) throw new HttpError(400, "Estado inválido");
  const t = subject_type != null ? normalizeSubjectType(subject_type) : null;
  if (subject_type != null && !t) throw new HttpError(400, "Tipo inválido");
  const id = subject_id != null ? String(subject_id).trim() : null;
  const reports = await reportsRepository.listReports({ status: s, subject_type: t, subject_id: id, limit });
  return { reports };
}

async function setReportStatus({ id, status }) {
  const s = normalizeStatus(status);
  if (!s) throw new HttpError(400, "Estado inválido");
  const reportId = String(id || "").trim();
  if (!reportId) throw new HttpError(400, "ID inválido");
  const updated = await reportsRepository.updateReportStatus({ id: reportId, status: s });
  if (!updated) throw new HttpError(404, "Reporte no encontrado");
  return { report: updated };
}

module.exports = { createReport, listReports, setReportStatus };

