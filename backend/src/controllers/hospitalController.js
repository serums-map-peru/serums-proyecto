const { asyncHandler } = require("../utils/asyncHandler");
const hospitalService = require("../services/hospitalService");

const listHospitals = asyncHandler(async (req, res) => {
  const hospitals = await hospitalService.listHospitals(req.query);
  res.json(hospitals);
});

const listHospitalsMap = asyncHandler(async (req, res) => {
  const hospitals = await hospitalService.listHospitals(req.query);
  const toFiniteNumberOrNull = (value) => {
    if (typeof value === "number") return Number.isFinite(value) ? value : null;
    if (typeof value === "string") {
      const n = Number(value);
      return Number.isFinite(n) ? n : null;
    }
    return null;
  };
  res.json(
    hospitals
      .map((h) => {
        const lat = toFiniteNumberOrNull(h.lat);
        const lng = toFiniteNumberOrNull(h.lng);
        if (lat == null || lng == null) return null;
        return {
          id: h.id,
          profesion: h.profesion,
          profesiones: h.profesiones,
          institucion: h.institucion,
          departamento: h.departamento,
          provincia: h.provincia,
          distrito: h.distrito,
          grado_dificultad: h.grado_dificultad,
          codigo_renipress_modular: h.codigo_renipress_modular,
          nombre_establecimiento: h.nombre_establecimiento,
          categoria: h.categoria,
          zaf: h.zaf,
          ze: h.ze,
          lat,
          lng,
        };
      })
      .filter(Boolean),
  );
});

const listHospitalFacets = asyncHandler(async (req, res) => {
  const facets = await hospitalService.listHospitalFacets(req.query);
  res.json(facets);
});

const getHospital = asyncHandler(async (req, res) => {
  const hospital = await hospitalService.getHospitalById(req.params.id);
  res.json(hospital);
});

const geocodeHospital = asyncHandler(async (req, res) => {
  const hospital = await hospitalService.geocodeHospitalById(req.params.id);
  res.json(hospital);
});

module.exports = { listHospitals, listHospitalsMap, listHospitalFacets, getHospital, geocodeHospital };
