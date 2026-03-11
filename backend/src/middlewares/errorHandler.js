const { HttpError } = require("../utils/httpError");

function errorHandler(err, req, res, next) {
  const status = err instanceof HttpError ? err.status : 500;
  const payload = {
    error: {
      message: err instanceof HttpError ? err.message : "Error interno del servidor",
      status,
      details: err instanceof HttpError ? err.details : undefined,
    },
  };

  if (status >= 500) {
    const safe = err && err.stack ? String(err.stack) : String(err);
    process.stderr.write(`${safe}\n`);
  }

  res.status(status).json(payload);
}

module.exports = { errorHandler };
