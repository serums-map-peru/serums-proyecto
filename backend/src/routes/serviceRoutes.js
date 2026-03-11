const express = require("express");

const { listServices } = require("../controllers/serviceCatalogController");

const router = express.Router();

router.get("/servicios", listServices);

module.exports = { servicesRouter: router };
