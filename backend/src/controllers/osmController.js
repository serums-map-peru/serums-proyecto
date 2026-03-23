const { getRoute } = require("../services/osrmService");
const { getNearbyPlaces, getNearestAirport } = require("../services/overpassService");
const { searchPlaces } = require("../services/nominatimService");
const { getHospitalById } = require("../services/hospitalService");

async function routeController(req, res, next) {
  try {
    const data = await getRoute(req.query);
    res.json(data);
  } catch (e) {
    next(e);
  }
}

async function nearbyPlacesController(req, res, next) {
  try {
    const hospital = await getHospitalById(req.params.id);
    const data = await getNearbyPlaces({ lat: hospital.lat, lon: hospital.lng });
    res.json({ id: hospital.id, ...data });
  } catch (e) {
    next(e);
  }
}

async function searchController(req, res, next) {
  try {
    const data = await searchPlaces(req.query.q);
    res.json(data);
  } catch (e) {
    next(e);
  }
}

async function nearestAirportController(req, res, next) {
  try {
    const hospital = await getHospitalById(req.params.id);
    const data = await getNearestAirport({ lat: hospital.lat, lon: hospital.lng });
    res.json({ id: hospital.id, ...data });
  } catch (e) {
    next(e);
  }
}

module.exports = { routeController, nearbyPlacesController, searchController, nearestAirportController };
