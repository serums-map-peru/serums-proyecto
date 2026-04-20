const express = require("express");

const { healthRouter } = require("./healthRoutes");
const { hospitalsRouter } = require("./hospitalRoutes");
const { authRouter } = require("./authRoutes");
const { docsRouter } = require("./docsRoutes");
const { osmRouter } = require("./osmRoutes");
const { favoritesRouter } = require("./favoritesRoutes");
const { commentsRouter } = require("./commentsRoutes");
const { reportsRouter } = require("./reportsRoutes");

const router = express.Router();

router.use(healthRouter);
router.use(hospitalsRouter);
router.use(authRouter);
router.use(favoritesRouter);
router.use(commentsRouter);
router.use(reportsRouter);
router.use(osmRouter);
router.use(docsRouter);

module.exports = { apiRouter: router };
