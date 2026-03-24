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
  if (tags.amenity === "bank" || tags.amenity === "atm") return "bancos";
  if (tags.amenity === "place_of_worship" || tags.building === "church") return "iglesias";
  if (tags.leisure === "fitness_centre" || tags.amenity === "fitness_centre" || tags.leisure === "sports_centre") return "gimnasios";
  if (tags.shop === "supermarket") return "supermercados";
  if (tags.shop === "mall" || tags.amenity === "marketplace") return "centros_comerciales";
  if (tags.shop === "convenience" || tags.shop === "general" || tags.shop === "kiosk") return "tiendas";

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

function mapElementWithCenter(el) {
  const tags = el && el.tags ? el.tags : {};
  const lat = typeof el.lat === "number" ? el.lat : el && el.center && typeof el.center.lat === "number" ? el.center.lat : null;
  const lon = typeof el.lon === "number" ? el.lon : el && el.center && typeof el.center.lon === "number" ? el.center.lon : null;
  if (lat == null || lon == null) return null;
  return {
    id: String(el.id),
    lat,
    lon,
    name: typeof tags.name === "string" ? tags.name : "",
    tags,
  };
}

function haversineMeters(a, b) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

async function getNearbyPlaces({ lat, lon, radius = 2000, types = null }) {
  const latN = parseNumber(lat);
  const lonN = parseNumber(lon);
  if (latN == null || lonN == null) {
    throw new HttpError(500, "Hospital sin coordenadas válidas");
  }

  const typesKey = Array.isArray(types) && types.length ? types.slice().sort().join(",") : "all";
  const cacheKey = `${Math.round(latN * 10_000) / 10_000},${Math.round(lonN * 10_000) / 10_000},${radius},${typesKey}`;
  const cached = readCache(cacheKey);
  if (cached) return cached;

  const wanted = new Set(
    Array.isArray(types) && types.length
      ? types.map((t) => String(t || "").trim().toLowerCase()).filter(Boolean)
      : [
          "hospedajes",
          "restaurantes",
          "centros_comerciales",
          "supermercados",
          "tiendas",
          "farmacias",
          "bancos",
          "comisarias",
          "gimnasios",
          "iglesias",
        ],
  );

  const lines = [];
  if (wanted.has("hospedajes")) lines.push(`  node(around:${radius},${latN},${lonN})["tourism"="hotel"];`);
  if (wanted.has("restaurantes")) lines.push(`  node(around:${radius},${latN},${lonN})["amenity"="restaurant"];`);
  if (wanted.has("farmacias")) lines.push(`  node(around:${radius},${latN},${lonN})["amenity"="pharmacy"];`);
  if (wanted.has("comisarias")) lines.push(`  node(around:${radius},${latN},${lonN})["amenity"="police"];`);
  if (wanted.has("bancos")) {
    lines.push(`  node(around:${radius},${latN},${lonN})["amenity"="bank"];`);
    lines.push(`  node(around:${radius},${latN},${lonN})["amenity"="atm"];`);
  }
  if (wanted.has("gimnasios")) {
    lines.push(`  node(around:${radius},${latN},${lonN})["leisure"="fitness_centre"];`);
    lines.push(`  node(around:${radius},${latN},${lonN})["amenity"="fitness_centre"];`);
    lines.push(`  node(around:${radius},${latN},${lonN})["leisure"="sports_centre"];`);
  }
  if (wanted.has("iglesias")) {
    lines.push(`  node(around:${radius},${latN},${lonN})["amenity"="place_of_worship"];`);
    lines.push(`  node(around:${radius},${latN},${lonN})["building"="church"];`);
  }
  if (wanted.has("centros_comerciales")) {
    lines.push(`  node(around:${radius},${latN},${lonN})["shop"="mall"];`);
    lines.push(`  node(around:${radius},${latN},${lonN})["amenity"="marketplace"];`);
  }
  if (wanted.has("supermercados")) lines.push(`  node(around:${radius},${latN},${lonN})["shop"="supermarket"];`);
  if (wanted.has("tiendas")) {
    lines.push(`  node(around:${radius},${latN},${lonN})["shop"="convenience"];`);
    lines.push(`  node(around:${radius},${latN},${lonN})["shop"="general"];`);
    lines.push(`  node(around:${radius},${latN},${lonN})["shop"="kiosk"];`);
  }

  if (!lines.length) {
    lines.push(`  node(around:${radius},${latN},${lonN})["amenity"="restaurant"];`);
  }

  const query = `[out:json];
(
${lines.join("\n")}
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
    gimnasios: [],
    bancos: [],
    iglesias: [],
    supermercados: [],
    centros_comerciales: [],
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

async function getNearestAirport({ lat, lon, maxRadius = 250000 }) {
  const latN = parseNumber(lat);
  const lonN = parseNumber(lon);
  if (latN == null || lonN == null) {
    throw new HttpError(500, "Hospital sin coordenadas válidas");
  }

  const cacheKey = `airport:${Math.round(latN * 10_000) / 10_000},${Math.round(lonN * 10_000) / 10_000},${maxRadius}`;
  const cached = readCache(cacheKey);
  if (cached) return cached;

  const radii = [10_000, 30_000, 80_000, 160_000, 250_000, 350_000].filter((r) => r <= maxRadius);
  const origin = { lat: latN, lon: lonN };

  for (const radius of radii.length ? radii : [maxRadius]) {
    const query = `[out:json];
(
  nwr(around:${radius},${latN},${lonN})["aeroway"="aerodrome"];
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
        throw new HttpError(504, "Servicio de aeropuertos (Overpass) lento o no disponible. Reintenta.", {
          timeoutMs: OVERPASS_TIMEOUT_MS,
        });
      }
      throw new HttpError(502, "No se pudo conectar al servicio de aeropuertos (Overpass). Reintenta.", {
        cause: err instanceof Error ? err.message : String(err),
      });
    } finally {
      clearTimeout(timeoutId);
    }

    const body = await res.json().catch(() => null);
    if (!res.ok) {
      const message =
        res.status === 429
          ? "Servicio de aeropuertos (Overpass) está limitando solicitudes. Reintenta en unos segundos."
          : "Error consultando aeropuertos (Overpass). Reintenta.";
      throw new HttpError(502, message, {
        status: res.status,
        body,
      });
    }

    const elements = body && Array.isArray(body.elements) ? body.elements : [];
    let best = null;
    for (const el of elements) {
      const mapped = mapElementWithCenter(el);
      if (!mapped) continue;
      const d = haversineMeters(origin, mapped);
      if (!best || d < best.distancia_meters) {
        best = { aeropuerto: mapped, distancia_meters: d, radius_meters: radius };
      }
    }

    if (best) {
      const result = { aeropuerto: best.aeropuerto, distancia_meters: best.distancia_meters, radius_meters: best.radius_meters };
      writeCache(cacheKey, result);
      return result;
    }
  }

  const result = { aeropuerto: null, distancia_meters: null, radius_meters: maxRadius };
  writeCache(cacheKey, result);
  return result;
}

module.exports = { getNearbyPlaces, getNearestAirport };
