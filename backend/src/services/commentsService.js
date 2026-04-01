const { HttpError } = require("../utils/httpError");
const commentsRepository = require("../db/commentsRepository");
const { getHospitalById } = require("./hospitalService");

function cleanComment(value) {
  if (value == null) return "";
  return String(value).replace(/\r\n/g, "\n").trimEnd();
}

async function getMyHospitalComment({ userId, hospitalId }) {
  const id = String(hospitalId || "").trim();
  if (!id) throw new HttpError(400, "ID inválido");
  const hospital = await getHospitalById(id);
  if (!hospital) throw new HttpError(404, "Hospital no encontrado");
  const existing = await commentsRepository.getHospitalComment({ userId, hospitalId: hospital.id });
  return existing ? { comment: existing.comment, updated_at: existing.updated_at } : { comment: "", updated_at: null };
}

async function setMyHospitalComment({ userId, hospitalId, comment }) {
  const id = String(hospitalId || "").trim();
  if (!id) throw new HttpError(400, "ID inválido");
  const hospital = await getHospitalById(id);
  if (!hospital) throw new HttpError(404, "Hospital no encontrado");

  const cleaned = cleanComment(comment);
  if (!cleaned.trim()) {
    await commentsRepository.deleteHospitalComment({ userId, hospitalId: hospital.id });
    return { comment: "", updated_at: null };
  }

  const saved = await commentsRepository.upsertHospitalComment({ userId, hospitalId: hospital.id, comment: cleaned });
  return { comment: saved ? saved.comment : cleaned, updated_at: saved ? saved.updated_at : null };
}

module.exports = { getMyHospitalComment, setMyHospitalComment };
