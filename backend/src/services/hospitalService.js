const { dataPath, readJsonFile } = require("../utils/jsonStore");
const { HttpError } = require("../utils/httpError");

function normalize(value) {
  if (typeof value !== "string") return "";
  return value.trim().toLowerCase();
}

function splitCsv(value) {
  if (typeof value !== "string") return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

async function listHospitals(filters) {
  const hospitals = await readJsonFile(dataPath("hospitales.json"));

  const region = normalize(filters.region);
  const provincia = normalize(filters.provincia);
  const distrito = normalize(filters.distrito);
  const ruralidad = normalize(filters.ruralidad);

  const sectores = splitCsv(filters.sector);
  const tipos = splitCsv(filters.tipo);
  const servicios = splitCsv(filters.servicio);

  return hospitals.filter((h) => {
    if (region && normalize(h.region) !== region) return false;
    if (provincia && normalize(h.provincia) !== provincia) return false;
    if (distrito && normalize(h.distrito) !== distrito) return false;
    if (ruralidad && normalize(h.nivel_ruralidad) !== ruralidad) return false;

    if (sectores.length && !sectores.includes(h.sector)) return false;
    if (tipos.length && !tipos.includes(h.tipo)) return false;

    if (servicios.length) {
      const set = new Set(h.servicios || []);
      for (const s of servicios) {
        if (!set.has(s)) return false;
      }
    }

    return true;
  });
}

async function getHospitalById(id) {
  const hospitals = await readJsonFile(dataPath("hospitales.json"));
  const hospital = hospitals.find((h) => h.id === id);
  if (!hospital) throw new HttpError(404, "Hospital no encontrado");
  return hospital;
}

module.exports = { listHospitals, getHospitalById };
