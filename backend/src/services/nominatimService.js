const { HttpError } = require("../utils/httpError");
const { getEnvNumber } = require("../utils/env");

const NOMINATIM_TIMEOUT_MS = getEnvNumber("NOMINATIM_TIMEOUT_MS", 10_000);
const SEARCH_CACHE_TTL_MS = getEnvNumber("SEARCH_CACHE_TTL_MS", 10 * 60_000);
const SEARCH_CACHE_MAX = getEnvNumber("SEARCH_CACHE_MAX", 800);
const NOMINATIM_RETRY_ON_429 = getEnvNumber("NOMINATIM_RETRY_ON_429", 0) !== 0;
const NOMINATIM_RETRY_MAX_ATTEMPTS = getEnvNumber("NOMINATIM_RETRY_MAX_ATTEMPTS", 6);
const NOMINATIM_RETRY_BASE_DELAY_MS = getEnvNumber("NOMINATIM_RETRY_BASE_DELAY_MS", 5_000);

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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRetryAfterMs(res) {
  const h = res && typeof res.headers?.get === "function" ? res.headers.get("retry-after") : null;
  if (!h) return null;
  const sec = Number(h);
  if (Number.isFinite(sec) && sec > 0) return Math.round(sec * 1000);
  const when = Date.parse(h);
  if (Number.isFinite(when)) {
    const ms = when - Date.now();
    return ms > 0 ? ms : 0;
  }
  return null;
}

async function fetchNominatimJson(url) {
  let lastStatus = null;
  for (let attempt = 0; attempt < Math.max(1, NOMINATIM_RETRY_MAX_ATTEMPTS); attempt++) {
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

    if (res.status !== 429) {
      const body = await res.json().catch(() => null);
      return { res, body };
    }

    lastStatus = 429;
    if (!NOMINATIM_RETRY_ON_429) {
      const body = await res.json().catch(() => null);
      return { res, body };
    }

    const retryAfterMs = parseRetryAfterMs(res);
    const backoffMs = Math.round(NOMINATIM_RETRY_BASE_DELAY_MS * Math.pow(2, attempt));
    const waitMs = Math.min(60_000, retryAfterMs != null ? retryAfterMs : backoffMs);
    await sleep(waitMs);
  }

  throw new HttpError(502, "Servicio de búsqueda (Nominatim) está limitando solicitudes. Reintenta en unos segundos.", {
    status: lastStatus || 429,
  });
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
  const { res, body } = await fetchNominatimJson(url);
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
  const { res, body } = await fetchNominatimJson(url);
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
