const { asyncHandler } = require("../utils/asyncHandler");
const reportsService = require("../services/reportsService");

const createReport = asyncHandler(async (req, res) => {
  const userId = req.user && req.user.id ? String(req.user.id) : "";
  const { subject_type, subject_id, category, message } = req.body || {};
  const result = await reportsService.createReport({ userId, subject_type, subject_id, category, message });
  res.json(result);
});

const listReports = asyncHandler(async (req, res) => {
  const status = req.query.status != null ? String(req.query.status) : null;
  const subject_type = req.query.subject_type != null ? String(req.query.subject_type) : null;
  const subject_id = req.query.subject_id != null ? String(req.query.subject_id) : null;
  const limitRaw = req.query.limit != null ? String(req.query.limit) : "";
  const limitN = limitRaw ? Number(limitRaw) : undefined;
  const result = await reportsService.listReports({ status, subject_type, subject_id, limit: limitN });
  res.json(result);
});

const setReportStatus = asyncHandler(async (req, res) => {
  const id = String(req.params.id || "");
  const status = req.body && typeof req.body === "object" ? req.body.status : null;
  const result = await reportsService.setReportStatus({ id, status });
  res.json(result);
});

module.exports = { createReport, listReports, setReportStatus };

