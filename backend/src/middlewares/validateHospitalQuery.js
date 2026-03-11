const { HttpError } = require("../utils/httpError");

const ALLOWED_SECTORS = new Set(["MINSA", "ESSALUD", "Militar", "Privado"]);
const ALLOWED_TIPOS = new Set(["I-1", "I-2", "I-3", "I-4"]);
const ALLOWED_RURALIDAD = new Set(["Alto", "Medio", "Bajo"]);

function splitCsv(value) {
  if (typeof value !== "string") return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function validateHospitalQuery(req, res, next) {
  const { region, provincia, distrito, sector, tipo, ruralidad, servicio } = req.query;

  if (region && typeof region !== "string") {
    return next(new HttpError(400, "Parámetro 'region' inválido"));
  }
  if (provincia && typeof provincia !== "string") {
    return next(new HttpError(400, "Parámetro 'provincia' inválido"));
  }
  if (distrito && typeof distrito !== "string") {
    return next(new HttpError(400, "Parámetro 'distrito' inválido"));
  }

  const sectors = splitCsv(sector);
  for (const s of sectors) {
    if (!ALLOWED_SECTORS.has(s)) {
      return next(
        new HttpError(400, "Parámetro 'sector' inválido", {
          allowed: Array.from(ALLOWED_SECTORS),
        }),
      );
    }
  }

  const tipos = splitCsv(tipo);
  for (const t of tipos) {
    if (!ALLOWED_TIPOS.has(t)) {
      return next(
        new HttpError(400, "Parámetro 'tipo' inválido", {
          allowed: Array.from(ALLOWED_TIPOS),
        }),
      );
    }
  }

  if (ruralidad && typeof ruralidad !== "string") {
    return next(new HttpError(400, "Parámetro 'ruralidad' inválido"));
  }
  if (typeof ruralidad === "string" && !ALLOWED_RURALIDAD.has(ruralidad)) {
    return next(
      new HttpError(400, "Parámetro 'ruralidad' inválido", {
        allowed: Array.from(ALLOWED_RURALIDAD),
      }),
    );
  }

  if (servicio && typeof servicio !== "string") {
    return next(new HttpError(400, "Parámetro 'servicio' inválido"));
  }

  next();
}

module.exports = {
  validateHospitalQuery,
  ALLOWED_SECTORS,
  ALLOWED_TIPOS,
  ALLOWED_RURALIDAD,
};
