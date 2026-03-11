const express = require("express");
const swaggerUi = require("swagger-ui-express");

const { openapi } = require("../utils/openapi");

const router = express.Router();

router.use("/docs", swaggerUi.serve, swaggerUi.setup(openapi, { explorer: true }));

module.exports = { docsRouter: router };
