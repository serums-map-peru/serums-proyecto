const { HttpError } = require("../utils/httpError");
const { getEnvNumber } = require("../utils/env");

const OVERPASS_TIMEOUT_MS = getEnvNumber("OVERPASS_TIMEOUT_MS", 18_000);
const NEARBY_CACHE_TTL_MS = getEnvNumber("NEARBY_CACHE_TTL_MS", 15 * 60_000);
const NEARBY_CACHE_MAX = getEnvNumber("NEARBY_CACHE_MAX", 800);

const nearbyCache = new Map();

function readCache(key) {
  const hit = nearbyCache.get(key);
  if (!hit) return null;
  if (hit.expiresAt <= Date.now()) {
    nearbyCache.delete(key);
    return null;
  }
  return hit.value;
}

function writeCache(key, value) {
  nearbyCache.set(key, { value, expiresAt: Date.now() + NEARBY_CACHE_TTL_MS });
  while (nearbyCache.size > NEARBY_CACHE_MAX) {
    const firstKey = nearbyCache.keys().next().value;
    if (firstKey == null) break;
    nearbyCache.delete(firstKey);
  }
}

function parseNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const s = value.trim().replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function groupKeyForElement(el) {
  const tags = el && el.tags ? el.tags : {};

  if (tags.tourism === "hotel") return "hospedajes";
  if (tags.amenity === "restaurant") return "restaurantes";
  if (tags.amenity === "pharmacy") return "farmacias";
  if (tags.amenity === "police") return "comisarias";
  if (tags.shop) return "tiendas";

  return null;
}

function mapElement(el) {
  const tags = el && el.tags ? el.tags : {};
  return {
    id: String(el.id),
    lat: el.lat,
    lon: el.lon,
    name: typeof tags.name === "string" ? tags.name : "",
    tags,
  };
}

async function getNearbyPlaces({ lat, lon, radius = 2000 }) {
  const latN = parseNumber(lat);
  const lonN = parseNumber(lon);
  if (latN == null || lonN == null) {
    throw new HttpError(500, "Hospital sin coordenadas válidas");
  }

  const cacheKey = `${Math.round(latN * 10_000) / 10_000},${Math.round(lonN * 10_000) / 10_000},${radius}`;
  const cached = readCache(cacheKey);
  if (cached) return cached;

  const query = `[out:json];
(
  node(around:${radius},${latN},${lonN})["tourism"="hotel"];
  node(around:${radius},${latN},${lonN})["amenity"="restaurant"];
  node(around:${radius},${latN},${lonN})["amenity"="pharmacy"];
  node(around:${radius},${latN},${lonN})["shop"];
  node(around:${radius},${latN},${lonN})["amenity"="police"];
);
out center;`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), OVERPASS_TIMEOUT_MS);
  let res;
  try {
    res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
        accept: "application/json",
        "user-agent": "SERUMS-Map-Peru/1.0",
      },
      body: `data=${encodeURIComponent(query)}`,
      signal: controller.signal,
    });
  } catch (err) {
    if (err && typeof err === "object" && "name" in err && err.name === "AbortError") {
      throw new HttpError(504, "Servicio de lugares cercanos (Overpass) lento o no disponible. Reintenta.", {
        timeoutMs: OVERPASS_TIMEOUT_MS,
      });
    }
    throw new HttpError(502, "No se pudo conectar al servicio de lugares cercanos (Overpass). Reintenta.", {
      cause: err instanceof Error ? err.message : String(err),
    });
  } finally {
    clearTimeout(timeoutId);
  }

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      res.status === 429
        ? "Servicio de lugares cercanos (Overpass) está limitando solicitudes. Reintenta en unos segundos."
        : "Error consultando lugares cercanos (Overpass). Reintenta.";
    throw new HttpError(502, message, {
      status: res.status,
      body,
    });
  }

  const grouped = {
    hospedajes: [],
    restaurantes: [],
    farmacias: [],
    tiendas: [],
    comisarias: [],
  };

  const elements = body && Array.isArray(body.elements) ? body.elements : [];
  for (const el of elements) {
    const key = groupKeyForElement(el);
    if (!key) continue;
    grouped[key].push(mapElement(el));
  }

  writeCache(cacheKey, grouped);
  return grouped;
}

module.exports = { getNearbyPlaces };
