const { asyncHandler } = require("../utils/asyncHandler");
const hospitalService = require("../services/hospitalService");

const listHospitals = asyncHandler(async (req, res) => {
  const hospitals = await hospitalService.listHospitals(req.query);
  res.json(hospitals);
});

const listHospitalsMap = asyncHandler(async (req, res) => {
  const hospitals = await hospitalService.listHospitals(req.query);
  res.json(
    hospitals.map((h) => ({
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
      lat: h.lat,
      lng: h.lng,
    })),
  );
});

const getHospital = asyncHandler(async (req, res) => {
  const hospital = await hospitalService.getHospitalById(req.params.id);
  res.json(hospital);
});

const geocodeHospital = asyncHandler(async (req, res) => {
  const hospital = await hospitalService.geocodeHospitalById(req.params.id);
  res.json(hospital);
});

module.exports = { listHospitals, listHospitalsMap, getHospital, geocodeHospital };
