const { HttpError } = require("../utils/httpError");
const { getEnvNumber } = require("../utils/env");

const OSRM_TIMEOUT_MS = getEnvNumber("OSRM_TIMEOUT_MS", 12_000);
const ROUTE_CACHE_TTL_MS = getEnvNumber("ROUTE_CACHE_TTL_MS", 10 * 60_000);
const ROUTE_CACHE_MAX = getEnvNumber("ROUTE_CACHE_MAX", 800);

const routeCache = new Map();

function readCache(key) {
  const hit = routeCache.get(key);
  if (!hit) return null;
  if (hit.expiresAt <= Date.now()) {
    routeCache.delete(key);
    return null;
  }
  return hit.value;
}

function writeCache(key, value) {
  routeCache.set(key, { value, expiresAt: Date.now() + ROUTE_CACHE_TTL_MS });
  while (routeCache.size > ROUTE_CACHE_MAX) {
    const firstKey = routeCache.keys().next().value;
    if (firstKey == null) break;
    routeCache.delete(firstKey);
  }
}

function parseNumber(value) {
  if (typeof value !== "string") return null;
  const s = value.trim().replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function roundCoord(value) {
  return Math.round(value * 10_000) / 10_000;
}

function parseProfile(value) {
  if (typeof value !== "string") return "driving";
  const v = value.trim().toLowerCase();
  if (!v) return "driving";
  if (v === "driving" || v === "car" || v === "carro") return "driving";
  if (v === "walking" || v === "foot" || v === "pie") return "walking";
  return null;
}

function buildRouteCacheKey(profile, latU, lonU, latH, lonH) {
  return `${profile}:${roundCoord(latU)},${roundCoord(lonU)}->${roundCoord(latH)},${roundCoord(lonH)}`;
}

async function getRoute({ latUsuario, lonUsuario, latHospital, lonHospital, perfil, profile }) {
  const latU = parseNumber(latUsuario);
  const lonU = parseNumber(lonUsuario);
  const latH = parseNumber(latHospital);
  const lonH = parseNumber(lonHospital);

  const resolvedProfile = parseProfile(profile ?? perfil);
  if (!resolvedProfile) {
    throw new HttpError(400, "Parámetro 'perfil' inválido", {
      allowed: ["driving", "walking"],
    });
  }

  if (latU == null || lonU == null || latH == null || lonH == null) {
    throw new HttpError(400, "Parámetros de ruta inválidos", {
      required: ["latUsuario", "lonUsuario", "latHospital", "lonHospital"],
    });
  }

  const cacheKey = buildRouteCacheKey(resolvedProfile, latU, lonU, latH, lonH);
  const cached = readCache(cacheKey);
  if (cached) return cached;

  const url = `https://router.project-osrm.org/route/v1/${resolvedProfile}/${lonU},${latU};${lonH},${latH}?overview=full&geometries=geojson`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), OSRM_TIMEOUT_MS);
  let res;
  try {
    res = await fetch(url, {
      headers: {
        accept: "application/json",
      },
      signal: controller.signal,
    });
  } catch (err) {
    if (err && typeof err === "object" && "name" in err && err.name === "AbortError") {
      throw new HttpError(504, "Servicio de rutas (OSRM) lento o no disponible. Reintenta.", {
        timeoutMs: OSRM_TIMEOUT_MS,
      });
    }
    throw new HttpError(502, "No se pudo conectar al servicio de rutas (OSRM). Reintenta.", {
      cause: err instanceof Error ? err.message : String(err),
    });
  } finally {
    clearTimeout(timeoutId);
  }

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      res.status === 429
        ? "Servicio de rutas (OSRM) está limitando solicitudes. Reintenta en unos segundos."
        : "Error consultando servicio de rutas (OSRM). Reintenta.";
    throw new HttpError(502, message, {
      status: res.status,
      body,
    });
  }

  if (!body || body.code !== "Ok" || !Array.isArray(body.routes) || !body.routes[0]) {
    throw new HttpError(502, "Respuesta inválida del servicio de rutas (OSRM). Reintenta.", { body });
  }

  const route = body.routes[0];
  const result = {
    distancia: route.distance,
    duracion: route.duration,
    geometria: route.geometry,
  };
  writeCache(cacheKey, result);
  return result;
}

module.exports = { getRoute };
