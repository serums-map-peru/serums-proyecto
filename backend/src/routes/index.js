const express = require("express");

const { healthRouter } = require("./healthRoutes");
const { hospitalsRouter } = require("./hospitalRoutes");
const { docsRouter } = require("./docsRoutes");
const { osmRouter } = require("./osmRoutes");

const router = express.Router();

router.use(healthRouter);
router.use(hospitalsRouter);
router.use(osmRouter);
router.use(docsRouter);

module.exports = { apiRouter: router };
