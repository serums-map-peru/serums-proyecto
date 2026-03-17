const express = require("express");

const { validateIdParam } = require("../middlewares/validateIdParam");
const {
  routeController,
  nearbyPlacesController,
  searchController,
  nearestAirportController,
} = require("../controllers/osmController");

const router = express.Router();

router.get("/ruta", routeController);
router.get("/lugares-cercanos/:id", validateIdParam("id"), nearbyPlacesController);
router.get("/aeropuerto-cercano/:id", validateIdParam("id"), nearestAirportController);
router.get("/buscar", searchController);

module.exports = { osmRouter: router };
