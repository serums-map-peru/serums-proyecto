const express = require("express");

const { requireAuth, requireAdmin } = require("../middlewares/requireAuth");
const { createReport, listReports, setReportStatus } = require("../controllers/reportsController");

const router = express.Router();

router.post("/reportes", requireAuth, createReport);
router.get("/reportes", requireAdmin, listReports);
router.patch("/reportes/:id", requireAdmin, setReportStatus);

module.exports = { reportsRouter: router };

