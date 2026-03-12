const { HttpError } = require("../utils/httpError");

function parseNumber(value) {
  if (typeof value !== "string") return null;
  const s = value.trim().replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

async function getRoute({ latUsuario, lonUsuario, latHospital, lonHospital }) {
  const latU = parseNumber(latUsuario);
  const lonU = parseNumber(lonUsuario);
  const latH = parseNumber(latHospital);
  const lonH = parseNumber(lonHospital);

  if (latU == null || lonU == null || latH == null || lonH == null) {
    throw new HttpError(400, "Parámetros de ruta inválidos", {
      required: ["latUsuario", "lonUsuario", "latHospital", "lonHospital"],
    });
  }

  const url = `https://router.project-osrm.org/route/v1/driving/${lonU},${latU};${lonH},${latH}?overview=full&geometries=geojson`;
  const res = await fetch(url, {
    headers: {
      accept: "application/json",
    },
  });

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new HttpError(502, "Error consultando OSRM", {
      status: res.status,
      body,
    });
  }

  if (!body || body.code !== "Ok" || !Array.isArray(body.routes) || !body.routes[0]) {
    throw new HttpError(502, "Respuesta inválida de OSRM", { body });
  }

  const route = body.routes[0];
  return {
    distancia: route.distance,
    duracion: route.duration,
    geometria: route.geometry,
  };
}

module.exports = { getRoute };
