const { asyncHandler } = require("../utils/asyncHandler");
const commentsService = require("../services/commentsService");

const getMyHospitalComment = asyncHandler(async (req, res) => {
  const userId = req.user && req.user.id ? String(req.user.id) : "";
  const hospitalId = String(req.params.id || "");
  const result = await commentsService.getMyHospitalComment({ userId, hospitalId });
  res.json(result);
});

const setMyHospitalComment = asyncHandler(async (req, res) => {
  const userId = req.user && req.user.id ? String(req.user.id) : "";
  const hospitalId = String(req.params.id || "");
  const comment = req.body && typeof req.body === "object" ? req.body.comment : "";
  const result = await commentsService.setMyHospitalComment({ userId, hospitalId, comment });
  res.json(result);
});

module.exports = { getMyHospitalComment, setMyHospitalComment };
