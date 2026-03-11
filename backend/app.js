const express = require("express");
const cors = require("cors");

const { logger } = require("./src/middlewares/logger");
const { notFound } = require("./src/middlewares/notFound");
const { errorHandler } = require("./src/middlewares/errorHandler");
const { apiRouter } = require("./src/routes");

function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.use(cors());
  app.use(express.json({ limit: "1mb" }));
  app.use(logger);

  app.use("/api", apiRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
