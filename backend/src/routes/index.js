const express = require("express");

const { healthRouter } = require("./healthRoutes");
const { hospitalsRouter } = require("./hospitalRoutes");
const { servicesRouter } = require("./serviceRoutes");
const { docsRouter } = require("./docsRoutes");

const router = express.Router();

router.use(healthRouter);
router.use(hospitalsRouter);
router.use(servicesRouter);
router.use(docsRouter);

module.exports = { apiRouter: router };
