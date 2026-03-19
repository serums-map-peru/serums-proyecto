const { HttpError } = require("../utils/httpError");

function validateStringParam(value, name) {
  if (value == null) return;
  if (typeof value !== "string") {
    throw new HttpError(400, `Parámetro '${name}' inválido`);
  }
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
    } = req.query;

    validateStringParam(profesion, "profesion");
    validateStringParam(institucion, "institucion");
    validateStringParam(departamento, "departamento");
    validateStringParam(provincia, "provincia");
    validateStringParam(distrito, "distrito");
    validateStringParam(grado_dificultad, "grado_dificultad");
    validateStringParam(categoria, "categoria");
    validateStringParam(zaf, "zaf");
    validateStringParam(ze, "ze");
    validateStringParam(serums_periodo, "serums_periodo");
    validateStringParam(serums_modalidad, "serums_modalidad");

    next();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  validateHospitalQuery,
};
