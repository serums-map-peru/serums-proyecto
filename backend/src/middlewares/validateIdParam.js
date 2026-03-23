const { HttpError } = require("../utils/httpError");

function validateIdParam(paramName = "id") {
  return function validateIdParamMiddleware(req, res, next) {
    const value = req.params[paramName];
    if (typeof value !== "string" || value.trim().length === 0) {
      return next(new HttpError(400, `Parámetro '${paramName}' inválido`));
    }
    next();
  };
}

module.exports = { validateIdParam };
