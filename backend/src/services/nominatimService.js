const { HttpError } = require("../utils/httpError");
const { getEnvNumber } = require("../utils/env");

const NOMINATIM_TIMEOUT_MS = getEnvNumber("NOMINATIM_TIMEOUT_MS", 10_000);
const SEARCH_CACHE_TTL_MS = getEnvNumber("SEARCH_CACHE_TTL_MS", 10 * 60_000);
const SEARCH_CACHE_MAX = getEnvNumber("SEARCH_CACHE_MAX", 800);

const searchCache = new Map();

function normalizeQuery(value) {
  return cleanQuery(value).toLowerCase();
}

function readCache(key) {
  const hit = searchCache.get(key);
  if (!hit) return null;
  if (hit.expiresAt <= Date.now()) {
    searchCache.delete(key);
    return null;
  }
  return hit.value;
}

function writeCache(key, value) {
  searchCache.set(key, { value, expiresAt: Date.now() + SEARCH_CACHE_TTL_MS });
  while (searchCache.size > SEARCH_CACHE_MAX) {
    const firstKey = searchCache.keys().next().value;
    if (firstKey == null) break;
    searchCache.delete(firstKey);
  }
}

function cleanQuery(value) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim();
}

async function searchPlaces(q) {
  const query = cleanQuery(q);
  if (!query) throw new HttpError(400, "Parámetro 'q' requerido");

  const cacheKey = normalizeQuery(query);
  const cached = readCache(cacheKey);
  if (cached) return cached;

  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
    query,
  )}&format=json&addressdetails=1&limit=8`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), NOMINATIM_TIMEOUT_MS);
  let res;
  try {
    res = await fetch(url, {
      headers: {
        accept: "application/json",
        "user-agent": "SERUMS-Map-Peru/1.0",
      },
      signal: controller.signal,
    });
  } catch (err) {
    if (err && typeof err === "object" && "name" in err && err.name === "AbortError") {
      throw new HttpError(504, "Servicio de búsqueda (Nominatim) lento o no disponible. Reintenta.", {
        timeoutMs: NOMINATIM_TIMEOUT_MS,
      });
    }
    throw new HttpError(502, "No se pudo conectar al servicio de búsqueda (Nominatim). Reintenta.", {
      cause: err instanceof Error ? err.message : String(err),
    });
  } finally {
    clearTimeout(timeoutId);
  }

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      res.status === 429
        ? "Servicio de búsqueda (Nominatim) está limitando solicitudes. Reintenta en unos segundos."
        : "Error consultando servicio de búsqueda (Nominatim). Reintenta.";
    throw new HttpError(502, message, {
      status: res.status,
      body,
    });
  }

  const items = Array.isArray(body) ? body : [];
  const result = items.map((it) => ({
    place_id: it.place_id,
    display_name: it.display_name,
    lat: it.lat,
    lon: it.lon,
    type: it.type,
    class: it.class,
    importance: it.importance,
    boundingbox: it.boundingbox,
  }));
  writeCache(cacheKey, result);
  return result;
}

async function searchPlacesPe(q) {
  const query = cleanQuery(q);
  if (!query) throw new HttpError(400, "Parámetro 'q' requerido");

  const cacheKey = `pe:${normalizeQuery(query)}`;
  const cached = readCache(cacheKey);
  if (cached) return cached;

  const viewbox = "-82.5,1.2,-67.0,-20.7";
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
    query,
  )}&format=json&addressdetails=1&limit=8&countrycodes=pe&viewbox=${encodeURIComponent(viewbox)}&bounded=1`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), NOMINATIM_TIMEOUT_MS);
  let res;
  try {
    res = await fetch(url, {
      headers: {
        accept: "application/json",
        "user-agent": "SERUMS-Map-Peru/1.0",
      },
      signal: controller.signal,
    });
  } catch (err) {
    if (err && typeof err === "object" && "name" in err && err.name === "AbortError") {
      throw new HttpError(504, "Servicio de búsqueda (Nominatim) lento o no disponible. Reintenta.", {
        timeoutMs: NOMINATIM_TIMEOUT_MS,
      });
    }
    throw new HttpError(502, "No se pudo conectar al servicio de búsqueda (Nominatim). Reintenta.", {
      cause: err instanceof Error ? err.message : String(err),
    });
  } finally {
    clearTimeout(timeoutId);
  }

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      res.status === 429
        ? "Servicio de búsqueda (Nominatim) está limitando solicitudes. Reintenta en unos segundos."
        : "Error consultando servicio de búsqueda (Nominatim). Reintenta.";
    throw new HttpError(502, message, {
      status: res.status,
      body,
    });
  }

  const items = Array.isArray(body) ? body : [];
  const result = items.map((it) => ({
    place_id: it.place_id,
    display_name: it.display_name,
    lat: it.lat,
    lon: it.lon,
    type: it.type,
    class: it.class,
    importance: it.importance,
    boundingbox: it.boundingbox,
  }));
  writeCache(cacheKey, result);
  return result;
}

module.exports = { searchPlaces, searchPlacesPe };
