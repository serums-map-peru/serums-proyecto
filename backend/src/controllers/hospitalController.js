const { asyncHandler } = require("../utils/asyncHandler");
const hospitalService = require("../services/hospitalService");

const listHospitals = asyncHandler(async (req, res) => {
  const hospitals = await hospitalService.listHospitals(req.query);
  res.json(hospitals);
});

const getHospital = asyncHandler(async (req, res) => {
  const hospital = await hospitalService.getHospitalById(req.params.id);
  res.json(hospital);
});

module.exports = { listHospitals, getHospital };
