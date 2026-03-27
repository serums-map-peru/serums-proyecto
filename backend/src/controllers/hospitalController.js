const { asyncHandler } = require("../utils/asyncHandler");
const hospitalService = require("../services/hospitalService");

const DEPARTMENT_COORDS = {
  AMAZONAS: { lat: -6.2317, lng: -77.869 },
  ANCASH: { lat: -9.5281, lng: -77.5289 },
  APURIMAC: { lat: -13.6352, lng: -72.8814 },
  AREQUIPA: { lat: -16.3988, lng: -71.5369 },
  AYACUCHO: { lat: -13.1631, lng: -74.2236 },
  CAJAMARCA: { lat: -7.164, lng: -78.5109 },
  CALLAO: { lat: -12.0566, lng: -77.1181 },
  CUSCO: { lat: -13.5319, lng: -71.9675 },
  HUANCAVELICA: { lat: -12.785, lng: -74.9717 },
  HUANUCO: { lat: -9.93, lng: -76.2422 },
  ICA: { lat: -14.0678, lng: -75.7286 },
  JUNIN: { lat: -12.0651, lng: -75.2049 },
  LA_LIBERTAD: { lat: -8.1117, lng: -79.0288 },
  LAMBAYEQUE: { lat: -6.7714, lng: -79.8409 },
  LIMA: { lat: -12.0464, lng: -77.0428 },
  LORETO: { lat: -3.7437, lng: -73.2516 },
  MADRE_DE_DIOS: { lat: -12.5933, lng: -69.1891 },
  MOQUEGUA: { lat: -17.1933, lng: -70.935 },
  PASCO: { lat: -10.684, lng: -76.2568 },
  PIURA: { lat: -5.1945, lng: -80.6328 },
  PUNO: { lat: -15.84, lng: -70.0219 },
  SAN_MARTIN: { lat: -6.4825, lng: -76.3733 },
  TACNA: { lat: -18.0146, lng: -70.2536 },
  TUMBES: { lat: -3.5669, lng: -80.4515 },
  UCAYALI: { lat: -8.3791, lng: -74.5539 },
};

function normalizeDepartmentKey(value) {
  return String(value || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_");
}

function getCoordsForDepartment(departamento) {
  const key = normalizeDepartmentKey(departamento);
  const coords = DEPARTMENT_COORDS[key];
  if (coords) return coords;
  return null;
}

function haversineKm(a, b) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLng / 2);
  const h = s1 * s1 + Math.cos(lat1) * Math.cos(lat2) * s2 * s2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

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
  const withinPeru = (lat, lng) => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
    if (lat < -20.7 || lat > 1.2) return false;
    if (lng < -82.5 || lng > -67.0) return false;
    return true;
  };
  res.json(
    hospitals
      .map((h) => {
        const lat = toFiniteNumberOrNull(h.lat);
        const lng = toFiniteNumberOrNull(h.lng);
        if (lat == null || lng == null) return null;
        if (!withinPeru(lat, lng)) return null;
        const deptCoords = getCoordsForDepartment(h.departamento);
        if (deptCoords) {
          const point = { lat, lng };
          const deptD = haversineKm(deptCoords, point);
          let nearestKey = null;
          let nearestD = Number.POSITIVE_INFINITY;
          for (const [k, c] of Object.entries(DEPARTMENT_COORDS)) {
            const d = haversineKm(c, point);
            if (d < nearestD) {
              nearestD = d;
              nearestKey = k;
            }
          }
          const deptKey = normalizeDepartmentKey(h.departamento);
          if (nearestKey && nearestKey !== deptKey && deptD > 450 && nearestD < deptD * 0.5) return null;
        }
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
  const forceRaw = typeof req.query.force === "string" ? req.query.force.trim().toLowerCase() : "";
  const force = forceRaw === "1" || forceRaw === "true";
  const hospital = await hospitalService.geocodeHospitalById(req.params.id, { force });
  res.json(hospital);
});

module.exports = { listHospitals, listHospitalsMap, listHospitalFacets, getHospital, geocodeHospital };
