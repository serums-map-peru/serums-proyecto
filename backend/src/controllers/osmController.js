const { HttpError } = require("../utils/httpError");
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
    const radiusMetersRaw = req.query.radius_meters != null ? String(req.query.radius_meters) : "";
    const radiusMeters = Number(radiusMetersRaw);
    const radius =
      Number.isFinite(radiusMeters) && radiusMeters > 0 ? Math.max(200, Math.min(20_000, Math.round(radiusMeters))) : undefined;

    const typesRaw = req.query.types != null ? String(req.query.types) : "";
    const types = typesRaw
      ? typesRaw
          .split(",")
          .map((t) => String(t || "").trim().toLowerCase())
          .filter(Boolean)
      : null;

    const data = await getNearbyPlaces({ lat: hospital.lat, lon: hospital.lng, radius, types });
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
    if (e instanceof HttpError) {
      res.status(200).json({ results: [], warning: e.message });
      return;
    }
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
