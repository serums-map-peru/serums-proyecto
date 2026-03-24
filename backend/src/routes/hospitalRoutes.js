const express = require("express");

const {
  getHospital,
  listHospitals,
  listHospitalsMap,
  listHospitalFacets,
  geocodeHospital,
} = require("../controllers/hospitalController");
const { requireAdmin } = require("../middlewares/requireAuth");
const { validateIdParam } = require("../middlewares/validateIdParam");
const { validateHospitalQuery } = require("../middlewares/validateHospitalQuery");

const router = express.Router();

router.get("/hospitales", validateHospitalQuery, listHospitals);
router.get("/hospitales/map", validateHospitalQuery, listHospitalsMap);
router.get("/hospitales/facets", validateHospitalQuery, listHospitalFacets);
router.post("/hospitales/:id/geocodificar", requireAdmin, validateIdParam("id"), geocodeHospital);
router.get("/hospitales/:id", validateIdParam("id"), getHospital);

module.exports = { hospitalsRouter: router };
