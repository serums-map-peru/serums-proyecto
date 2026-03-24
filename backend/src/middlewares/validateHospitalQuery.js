const { HttpError } = require("../utils/httpError");

function validateStringParam(value, name) {
  if (value == null) return;
  if (typeof value !== "string") {
    throw new HttpError(400, `Parámetro '${name}' inválido`);
  }
}

function validateStringOrArray(value, name) {
  if (value == null) return;
  if (typeof value === "string") return;
  if (Array.isArray(value)) {
    for (const v of value) {
      if (typeof v !== "string") throw new HttpError(400, `Parámetro '${name}' inválido`);
    }
    return;
  }
  throw new HttpError(400, `Parámetro '${name}' inválido`);
}

function validateHospitalQuery(req, res, next) {
  try {
    const {
      profesion,
      institucion,
      departamento,
      provincia,
      distrito,
      grado_dificultad,
      categoria,
      zaf,
      ze,
      serums_periodo,
      serums_modalidad,
      airport_hours_max,
    } = req.query;

    validateStringParam(profesion, "profesion");
    validateStringOrArray(institucion, "institucion");
    validateStringOrArray(departamento, "departamento");
    validateStringOrArray(provincia, "provincia");
    validateStringParam(distrito, "distrito");
    validateStringOrArray(grado_dificultad, "grado_dificultad");
    validateStringOrArray(categoria, "categoria");
    validateStringParam(zaf, "zaf");
    validateStringParam(ze, "ze");
    validateStringParam(serums_periodo, "serums_periodo");
    validateStringParam(serums_modalidad, "serums_modalidad");
    if (airport_hours_max != null && isNaN(Number(airport_hours_max))) {
      throw new HttpError(400, "Parámetro 'airport_hours_max' inválido");
    }

    next();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  validateHospitalQuery,
};
