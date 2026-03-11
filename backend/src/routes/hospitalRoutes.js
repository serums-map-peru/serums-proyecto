const express = require("express");

const { getHospital, listHospitals } = require("../controllers/hospitalController");
const { validateIdParam } = require("../middlewares/validateIdParam");
const { validateHospitalQuery } = require("../middlewares/validateHospitalQuery");

const router = express.Router();

router.get("/hospitales", validateHospitalQuery, listHospitals);
router.get("/hospitales/:id", validateIdParam("id"), getHospital);

module.exports = { hospitalsRouter: router };
