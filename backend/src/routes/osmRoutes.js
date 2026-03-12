const express = require("express");

const { validateIdParam } = require("../middlewares/validateIdParam");
const {
  routeController,
  nearbyPlacesController,
  searchController,
} = require("../controllers/osmController");

const router = express.Router();

router.get("/ruta", routeController);
router.get("/lugares-cercanos/:id", validateIdParam("id"), nearbyPlacesController);
router.get("/buscar", searchController);

module.exports = { osmRouter: router };
