const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { HttpError } = require("../utils/httpError");
const { getEnvNumber, getEnvString } = require("../utils/env");
const { DB_ENABLED, DB_PATH, queryOne } = require("../db");
const hospitalRepository = require("../db/hospitalRepository");
const serumsOfferRepository = require("../db/serumsOfferRepository");
const { searchPlacesPe } = require("./nominatimService");

function cleanString(value) {
  if (value == null) return "";
  return String(value)
    .replace(/\uFEFF/g, "")
    .replace(/[\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalize(value) {
  return cleanString(value).toLowerCase();
}

function parseDelimited(text, delimiter) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        const next = text[i + 1];
        if (next === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      continue;
    }

    if (ch === delimiter) {
      row.push(field);
      field = "";
      continue;
    }

    if (ch === "\n") {
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
      continue;
    }

    if (ch === "\r") continue;

    field += ch;
  }

  row.push(field);
  rows.push(row);
  return rows;
}

function getCsvPath() {
  const configured = process.env.HOSPITALES_CSV_PATH;
  if (typeof configured === "string" && configured.trim().length > 0) {
    return path.resolve(configured.trim());
  }
  return path.resolve(__dirname, "../../../../hospitales_filtrados.csv");
}

function hashId(input) {
  return crypto.createHash("sha1").update(String(input)).digest("hex").slice(0, 12);
}

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
  return normalize(value)
    .replace(/[áàä]/g, "a")
    .replace(/[éèë]/g, "e")
    .replace(/[íìï]/g, "i")
    .replace(/[óòö]/g, "o")
    .replace(/[úùü]/g, "u")
    .replace(/ñ/g, "n")
    .replace(/\s+/g, "_")
    .toUpperCase();
}

function getCoordsForDepartment(departamento) {
  const key = normalizeDepartmentKey(departamento);
  const coords = DEPARTMENT_COORDS[key];
  if (coords) return coords;
  return { lat: -9.19, lng: -75.0152 };
}

function parseNumberOrNull(value) {
  const s = cleanString(value).replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function getRenipressCsvPath() {
  const configured = process.env.RENIPRESS_CSV_PATH;
  if (typeof configured === "string" && configured.trim().length > 0) {
    return path.resolve(configured.trim());
  }
  return path.resolve(__dirname, "../../../../RENIPRESS_27-02-2026.csv");
}

function padIpressCode(value) {
  const raw = cleanString(value);
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  if (!digits) return raw;
  return digits.padStart(8, "0");
}

function parsePeruScaledCoord(value, kind) {
  const s = cleanString(value);
  if (!s) return null;

  let normalized = s.replace(/\s+/g, "");
  if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(normalized)) {
    normalized = normalized.replace(/,/g, "");
  } else if (/^-?\d+(,\d+)+$/.test(normalized)) {
    normalized = normalized.replace(/,/g, "");
  } else {
    normalized = normalized.replace(/,/g, ".");
  }

  const base = Number(normalized);
  if (!Number.isFinite(base)) return null;

  const candidates = [];
  for (let exp = 0; exp <= 9; exp++) {
    const v = base / 10 ** exp;
    if (kind === "lat" && Math.abs(v) <= 90) candidates.push(v);
    if (kind === "lon" && Math.abs(v) <= 180) candidates.push(v);
  }
  if (candidates.length === 0) return null;

  const scoreLat = (v) => {
    if (v <= 0 && v >= -20) return 0;
    if (v > 0) return 1000 + v;
    return Math.abs(v + 10);
  };

  const scoreLon = (v) => {
    if (v <= -65 && v >= -90) return 0;
    if (v > 0) return 1000 + v;
    if (v < -90) return Math.abs(v + 75);
    return Math.abs(v + 75);
  };

  let best = candidates[0];
  let bestScore = kind === "lat" ? scoreLat(best) : scoreLon(best);
  for (let i = 1; i < candidates.length; i++) {
    const v = candidates[i];
    const sc = kind === "lat" ? scoreLat(v) : scoreLon(v);
    if (sc < bestScore) {
      best = v;
      bestScore = sc;
    }
  }

  return best;
}

function parseNumberLoose(value) {
  const s = cleanString(value);
  if (!s) return null;

  let normalized = s.replace(/\s+/g, "");
  if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(normalized)) {
    normalized = normalized.replace(/,/g, "");
  } else if (/^-?\d+(,\d+)+$/.test(normalized)) {
    normalized = normalized.replace(/,/g, "");
  } else {
    normalized = normalized.replace(/,/g, ".");
  }

  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

function isWithinPeruBBox(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (lat < -20.7 || lat > 1.2) return false;
  if (lng < -82.5 || lng > -67.0) return false;
  return true;
}

function squaredDistance(a, b) {
  const dLat = a.lat - b.lat;
  const dLng = a.lng - b.lng;
  return dLat * dLat + dLng * dLng;
}

function haversineKm(a, b) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function isReasonableForDepartment(coords, deptCenter) {
  if (!coords) return false;
  if (!deptCenter) return true;
  const km = haversineKm(coords, deptCenter);
  return km <= 400;
}

const GEOCODE_ENABLED = getEnvNumber("GEOCODE_ENABLED", 1) !== 0;
const GEOCODE_INTERVAL_MS = getEnvNumber("GEOCODE_INTERVAL_MS", 1500);
const GEOCODE_MAX_PER_BOOT = getEnvNumber("GEOCODE_MAX_PER_BOOT", 60);

const COORD_OVERRIDES_ENABLED = getEnvNumber("COORD_OVERRIDES_ENABLED", 1) !== 0;
const COORD_OVERRIDES_PATH = path.resolve(
  getEnvString("COORD_OVERRIDES_PATH", path.resolve(__dirname, "../../../../hospital_coords_overrides.json")),
);

const geocodeQueue = [];
const geocodeQueuedIds = new Set();
const geocodeInFlight = new Set();
let geocodeWorkerStarted = false;
let geocodedCount = 0;

let overridesCached = null;
let overridesDbRevision = 0;

async function loadCoordOverrides() {
  if (DB_ENABLED) {
    if (overridesCached && overridesCached.dbRevision === overridesDbRevision) return overridesCached;
    const byId = await hospitalRepository.listCoordOverridesById();
    overridesCached = { mtimeMs: null, dbRevision: overridesDbRevision, byId, path: null };
    return overridesCached;
  }

  if (!COORD_OVERRIDES_ENABLED) {
    overridesCached = { mtimeMs: null, byId: new Map(), path: COORD_OVERRIDES_PATH };
    return overridesCached;
  }

  let stat;
  try {
    stat = fs.statSync(COORD_OVERRIDES_PATH);
  } catch {
    overridesCached = { mtimeMs: null, byId: new Map(), path: COORD_OVERRIDES_PATH };
    return overridesCached;
  }

  if (overridesCached && overridesCached.mtimeMs === stat.mtimeMs) return overridesCached;

  let parsed;
  try {
    const raw = fs.readFileSync(COORD_OVERRIDES_PATH, "utf8");
    parsed = JSON.parse(raw);
  } catch {
    overridesCached = { mtimeMs: stat.mtimeMs, byId: new Map(), path: COORD_OVERRIDES_PATH };
    return overridesCached;
  }

  const byId = new Map();
  if (parsed && typeof parsed === "object") {
    for (const [id, v] of Object.entries(parsed)) {
      if (!id) continue;
      if (!v || typeof v !== "object") continue;
      const lat = Number(v.lat);
      const lng = Number(v.lng);
      const source = typeof v.source === "string" ? v.source : "OVERRIDE";
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      byId.set(String(id), { lat, lng, source, updatedAt: v.updatedAt });
    }
  }

  overridesCached = { mtimeMs: stat.mtimeMs, byId, path: COORD_OVERRIDES_PATH };
  return overridesCached;
}

async function persistCoordOverride(id, { lat, lng, source }) {
  if (!COORD_OVERRIDES_ENABLED) return;
  if (!id) return;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

  if (DB_ENABLED) {
    await hospitalRepository.upsertCoordOverride(String(id), { lat, lng, source: source || "OVERRIDE" });
    overridesDbRevision += 1;
    overridesCached = null;
    bumpDbHospitalsRevision();
    return;
  }

  let existing = {};
  try {
    const raw = fs.readFileSync(COORD_OVERRIDES_PATH, "utf8");
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") existing = parsed;
  } catch {
  }

  existing[String(id)] = {
    lat,
    lng,
    source: source || "OVERRIDE",
    updatedAt: new Date().toISOString(),
  };

  fs.writeFileSync(COORD_OVERRIDES_PATH, JSON.stringify(existing, null, 2));
  overridesCached = null;
}

function enqueueGeocodeIfNeeded(h) {
  if (!GEOCODE_ENABLED) return;
  if (!h || !h.id) return;
  if (geocodedCount >= GEOCODE_MAX_PER_BOOT) return;
  if (geocodeQueuedIds.has(h.id)) return;
  if (h.coordenadas_fuente === "RENIPRESS") return;
  if (h.coordenadas_fuente === "NOMINATIM") return;
  if (!cleanString(h.nombre_establecimiento) || !cleanString(h.departamento) || !cleanString(h.provincia) || !cleanString(h.distrito))
    return;
  geocodeQueuedIds.add(h.id);
  geocodeQueue.push(h);
}

function ensureGeocodeWorkerStarted() {
  if (!GEOCODE_ENABLED) return;
  if (geocodeWorkerStarted) return;
  geocodeWorkerStarted = true;

  setInterval(async () => {
    if (geocodedCount >= GEOCODE_MAX_PER_BOOT) return;
    const next = geocodeQueue.shift();
    if (!next) return;
    if (!next.id || geocodeInFlight.has(next.id)) return;
    geocodeInFlight.add(next.id);
    try {
      await geocodeHospitalRecord(next);
    } catch {
    } finally {
      geocodeInFlight.delete(next.id);
    }
  }, GEOCODE_INTERVAL_MS).unref?.();
}

function tokenize(value) {
  return cleanString(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .split(/[^a-z0-9]+/g)
    .filter(Boolean);
}

function includesAllTokens(haystack, tokens) {
  if (!haystack) return false;
  const normalized = haystack
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
  return tokens.every((t) => normalized.includes(t));
}

function bestNominatimMatch(results, hospital, deptCenter) {
  const items = Array.isArray(results) ? results : [];
  if (items.length === 0) return null;

  const nameTokens = tokenize(hospital.nombre_establecimiento || "");
  const distTokens = tokenize(hospital.distrito);
  const provTokens = tokenize(hospital.provincia);
  const depTokens = tokenize(hospital.departamento);

  const parsed = items
    .map((it) => {
      const lat = Number(it.lat);
      const lng = Number(it.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      if (!isWithinPeruBBox(lat, lng)) return null;
      const candidate = normalizePeruLatLng(lat, lng, deptCenter);
      if (!candidate) return null;
      if (!isReasonableForDepartment(candidate, deptCenter)) return null;

      const display = cleanString(it.display_name);
      const score =
        (includesAllTokens(display, depTokens) ? 6 : 0) +
        (includesAllTokens(display, provTokens) ? 4 : 0) +
        (includesAllTokens(display, distTokens) ? 3 : 0) +
        (includesAllTokens(display, nameTokens) ? 7 : 0) +
        (typeof it.importance === "number" ? it.importance : 0);

      const distancePenalty = deptCenter ? haversineKm(candidate, deptCenter) / 120 : 0;
      return { lat: candidate.lat, lng: candidate.lng, score: score - distancePenalty };
    })
    .filter(Boolean);

  if (parsed.length === 0) return null;
  let best = parsed[0];
  for (let i = 1; i < parsed.length; i++) {
    if (parsed[i].score > best.score) best = parsed[i];
  }
  return { lat: best.lat, lng: best.lng };
}

async function geocodeHospitalRecord(hospital, { force = false } = {}) {
  if (!GEOCODE_ENABLED) return null;
  if (!hospital || !hospital.id) return null;

  const source = cleanString(hospital.coordenadas_fuente).toUpperCase();
  if (!force && source === "CSV" && isWithinPeruBBox(hospital.lat, hospital.lng)) return null;

  const deptCenter = getCoordsForDepartment(hospital.departamento);

  const nombre = cleanString(hospital.nombre_establecimiento);
  const distrito = cleanString(hospital.distrito);
  const provincia = cleanString(hospital.provincia);
  const departamento = cleanString(hospital.departamento);

  const queries = [
    `${nombre}, ${distrito}, ${provincia}, ${departamento}, Peru`,
    `${distrito}, ${provincia}, ${departamento}, Peru`,
    `${provincia}, ${departamento}, Peru`,
  ].filter((q) => cleanString(q).length > 0);

  for (const q of queries) {
    const results = await searchPlacesPe(q);
    const match = bestNominatimMatch(results, hospital, deptCenter);
    if (match) {
      hospital.lat = match.lat;
      hospital.lng = match.lng;
      hospital.coordenadas_fuente = "NOMINATIM";
      await persistCoordOverride(hospital.id, { lat: match.lat, lng: match.lng, source: "NOMINATIM" });
      geocodedCount += 1;
      return match;
    }
  }

  return null;
}

function normalizePeruLatLng(lat, lng, hintCenter) {
  if (lat == null || lng == null) return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const center = hintCenter && Number.isFinite(hintCenter.lat) && Number.isFinite(hintCenter.lng) ? hintCenter : null;

  const raw = { lat, lng };
  const candidates = [
    raw,
    { lat: raw.lat, lng: -raw.lng },
    { lat: -raw.lat, lng: raw.lng },
    { lat: -raw.lat, lng: -raw.lng },
    { lat: raw.lng, lng: raw.lat },
    { lat: raw.lng, lng: -raw.lat },
    { lat: -raw.lng, lng: raw.lat },
    { lat: -raw.lng, lng: -raw.lat },
  ];

  const valid = candidates.filter((c) => isWithinPeruBBox(c.lat, c.lng));
  if (valid.length === 0) return null;
  if (!center) return valid[0];

  let best = valid[0];
  let bestScore = squaredDistance(best, center);
  for (let i = 1; i < valid.length; i++) {
    const c = valid[i];
    const sc = squaredDistance(c, center);
    if (sc < bestScore) {
      best = c;
      bestScore = sc;
    }
  }
  return best;
}

function utmToLatLng(easting, northing, zoneNumber, southernHemisphere) {
  const a = 6378137;
  const eccSquared = 0.00669438;
  const k0 = 0.9996;

  const x = easting - 500000.0;
  let y = northing;
  if (southernHemisphere) y -= 10000000.0;

  const eccPrimeSquared = eccSquared / (1 - eccSquared);
  const M = y / k0;
  const mu = M / (a * (1 - eccSquared / 4 - (3 * eccSquared * eccSquared) / 64 - (5 * eccSquared * eccSquared * eccSquared) / 256));

  const e1 = (1 - Math.sqrt(1 - eccSquared)) / (1 + Math.sqrt(1 - eccSquared));

  const J1 = (3 * e1) / 2 - (27 * e1 * e1 * e1) / 32;
  const J2 = (21 * e1 * e1) / 16 - (55 * e1 * e1 * e1 * e1) / 32;
  const J3 = (151 * e1 * e1 * e1) / 96;
  const J4 = (1097 * e1 * e1 * e1 * e1) / 512;

  const phi1Rad = mu + J1 * Math.sin(2 * mu) + J2 * Math.sin(4 * mu) + J3 * Math.sin(6 * mu) + J4 * Math.sin(8 * mu);

  const sinPhi1 = Math.sin(phi1Rad);
  const cosPhi1 = Math.cos(phi1Rad);
  const tanPhi1 = Math.tan(phi1Rad);

  const N1 = a / Math.sqrt(1 - eccSquared * sinPhi1 * sinPhi1);
  const T1 = tanPhi1 * tanPhi1;
  const C1 = eccPrimeSquared * cosPhi1 * cosPhi1;
  const R1 = (a * (1 - eccSquared)) / Math.pow(1 - eccSquared * sinPhi1 * sinPhi1, 1.5);
  const D = x / (N1 * k0);

  const latRad =
    phi1Rad -
    (N1 * tanPhi1) /
      R1 *
      (D * D / 2 -
        ((5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * eccPrimeSquared) * D * D * D * D) / 24 +
        ((61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * eccPrimeSquared - 3 * C1 * C1) * D * D * D * D * D * D) / 720);

  const lonOrigin = (zoneNumber - 1) * 6 - 180 + 3;
  const lonRad =
    (D -
      ((1 + 2 * T1 + C1) * D * D * D) / 6 +
      ((5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * eccPrimeSquared + 24 * T1 * T1) * D * D * D * D * D) / 120) /
    cosPhi1;

  const lat = (latRad * 180) / Math.PI;
  const lng = lonOrigin + (lonRad * 180) / Math.PI;
  return { lat, lng };
}

function parseRenipressLatLng(norteRaw, esteRaw, departamentoHint) {
  const northing = parseNumberLoose(norteRaw);
  const easting = parseNumberLoose(esteRaw);
  const deptCenter = getCoordsForDepartment(departamentoHint);

  if (northing == null || easting == null) {
    const latA = parsePeruScaledCoord(norteRaw, "lat");
    const lngA = parsePeruScaledCoord(esteRaw, "lon");
    const normalizedA = latA != null && lngA != null ? normalizePeruLatLng(latA, lngA, deptCenter) : null;

    const latB = parsePeruScaledCoord(esteRaw, "lat");
    const lngB = parsePeruScaledCoord(norteRaw, "lon");
    const normalizedB = latB != null && lngB != null ? normalizePeruLatLng(latB, lngB, deptCenter) : null;

    if (normalizedA && normalizedB) {
      return squaredDistance(normalizedA, deptCenter) <= squaredDistance(normalizedB, deptCenter) ? normalizedA : normalizedB;
    }
    return normalizedA ?? normalizedB;
  }

  const looksUtm =
    Math.abs(easting) > 1000 &&
    Math.abs(northing) > 1000 &&
    easting >= 100000 &&
    easting <= 900000 &&
    northing >= 0 &&
    northing <= 10000000;

  if (!looksUtm) {
    const normalizedA = normalizePeruLatLng(parsePeruScaledCoord(norteRaw, "lat"), parsePeruScaledCoord(esteRaw, "lon"), deptCenter);
    const normalizedB = normalizePeruLatLng(parsePeruScaledCoord(esteRaw, "lat"), parsePeruScaledCoord(norteRaw, "lon"), deptCenter);
    if (normalizedA && normalizedB) {
      return squaredDistance(normalizedA, deptCenter) <= squaredDistance(normalizedB, deptCenter) ? normalizedA : normalizedB;
    }
    return normalizedA ?? normalizedB;
  }

  const zones = [17, 18, 19];
  const candidates = [];
  for (const zone of zones) {
    const converted = utmToLatLng(easting, northing, zone, true);
    const normalized = normalizePeruLatLng(converted.lat, converted.lng, deptCenter);
    if (normalized) candidates.push(normalized);
  }
  if (candidates.length === 0) return null;
  let best = candidates[0];
  let bestScore = squaredDistance(best, deptCenter);
  for (let i = 1; i < candidates.length; i++) {
    const c = candidates[i];
    const sc = squaredDistance(c, deptCenter);
    if (sc < bestScore) {
      best = c;
      bestScore = sc;
    }
  }
  return best;
}

let renipressCached = null;

function loadRenipressIndex() {
  const csvPath = getRenipressCsvPath();
  let stat;
  try {
    stat = fs.statSync(csvPath);
  } catch {
    renipressCached = {
      mtimeMs: null,
      byCode: new Map(),
      path: csvPath,
    };
    return renipressCached;
  }

  if (renipressCached && renipressCached.mtimeMs === stat.mtimeMs) return renipressCached;

  const raw = fs.readFileSync(csvPath, "utf8");
  const rows = parseDelimited(raw, ";");
  if (!rows.length) {
    renipressCached = {
      mtimeMs: stat.mtimeMs,
      byCode: new Map(),
      path: csvPath,
    };
    return renipressCached;
  }

  const header = rows[0].map((h) => cleanString(h).toUpperCase());
  const headerIndex = new Map();
  for (let i = 0; i < header.length; i++) {
    headerIndex.set(header[i].replace(/^"+|"+$/g, ""), i);
  }

  const idxCode = headerIndex.get("COD_IPRESS");
  const idxNorte = headerIndex.get("NORTE");
  const idxEste = headerIndex.get("ESTE");
  const idxImg1 = headerIndex.get("IMAGEN_1");
  const idxImg2 = headerIndex.get("IMAGEN_2");
  const idxImg3 = headerIndex.get("IMAGEN_3");
  const idxDepartamento = headerIndex.get("DEPARTAMENTO");

  const byCode = new Map();
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0) continue;

    const codeRaw = idxCode != null && idxCode < row.length ? row[idxCode] : "";
    const code = padIpressCode(codeRaw);
    if (!code) continue;

    const norteRaw = idxNorte != null && idxNorte < row.length ? row[idxNorte] : "";
    const esteRaw = idxEste != null && idxEste < row.length ? row[idxEste] : "";
    const departamento = idxDepartamento != null && idxDepartamento < row.length ? cleanString(row[idxDepartamento]) : "";

    const images = [];
    const img1 = idxImg1 != null && idxImg1 < row.length ? cleanString(row[idxImg1]) : "";
    const img2 = idxImg2 != null && idxImg2 < row.length ? cleanString(row[idxImg2]) : "";
    const img3 = idxImg3 != null && idxImg3 < row.length ? cleanString(row[idxImg3]) : "";
    if (img1) images.push(img1);
    if (img2) images.push(img2);
    if (img3) images.push(img3);

    const existing = byCode.get(code);
    if (existing) {
      if (!existing.norteRaw && norteRaw) existing.norteRaw = norteRaw;
      if (!existing.esteRaw && esteRaw) existing.esteRaw = esteRaw;
      if (!existing.departamento && departamento) existing.departamento = departamento;
      if ((!existing.imagenes || existing.imagenes.length === 0) && images.length > 0) {
        existing.imagenes = images;
      }
    } else {
      byCode.set(code, {
        norteRaw,
        esteRaw,
        departamento,
        imagenes: images,
      });
    }
  }

  renipressCached = {
    mtimeMs: stat.mtimeMs,
    byCode,
    path: csvPath,
  };
  return renipressCached;
}

let cached = null;
let dbHospitalsCache = null;
let dbHospitalsRevision = 0;
let dbHospitalsDataVersion = null;
let dbSeedPromise = null;

async function readDbDataVersion() {
  try {
    const row = await queryOne("PRAGMA data_version");
    const v = row && row.data_version != null ? Number(row.data_version) : null;
    return Number.isFinite(v) ? v : null;
  } catch {
    return null;
  }
}

async function loadHospitalsFromCsv() {
  const csvPath = getCsvPath();
  let stat;
  try {
    stat = fs.statSync(csvPath);
  } catch {
    throw new HttpError(500, "No se pudo leer el archivo hospitales_filtrados.csv", {
      path: csvPath,
    });
  }

  const renipressStore = loadRenipressIndex();
  const renipressMtime = renipressStore.mtimeMs;

  if (cached && cached.mtimeMs === stat.mtimeMs && cached.renipressMtimeMs === renipressMtime) return cached;

  const raw = fs.readFileSync(csvPath, "utf8");
  const rows = parseDelimited(raw, ";");
  if (!rows.length) {
    throw new HttpError(500, "El archivo hospitales_filtrados.csv está vacío", { path: csvPath });
  }

  const header = rows[0].map(cleanString);
  const headerIndex = new Map();
  for (let i = 0; i < header.length; i++) {
    headerIndex.set(header[i].replace(/^"+|"+$/g, ""), i);
  }

  const required = [
    "profesion",
    "institucion",
    "departamento",
    "provincia",
    "distrito",
    "grado_dificultad",
    "codigo_renipress_modular",
    "nombre_establecimiento",
    "presupuesto",
    "categoria",
    "zaf",
    "ze",
  ];

  for (const key of required) {
    if (!headerIndex.has(key)) {
      throw new HttpError(500, "El CSV no contiene todas las columnas requeridas", {
        missing: key,
        path: csvPath,
      });
    }
  }

  const records = [];
  const byId = new Map();
  const aggregations = new Map();
  const identityToBaseId = new Map();

  const latIndex = headerIndex.has("lat") ? headerIndex.get("lat") : null;
  const lonIndex = headerIndex.has("lon")
    ? headerIndex.get("lon")
    : headerIndex.has("lng")
      ? headerIndex.get("lng")
      : null;

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0) continue;

    const record = {};
    let any = false;

    for (const key of required) {
      const idx = headerIndex.get(key);
      const rawValue = idx < row.length ? row[idx] : "";
      const value = cleanString(rawValue);
      record[key] = value;
      if (value) any = true;
    }

    if (!any) continue;

    const codigo = padIpressCode(record.codigo_renipress_modular);
    record.codigo_renipress_modular = codigo;

    const identityKey = [
      normalize(record.nombre_establecimiento),
      normalize(record.institucion),
      normalize(record.departamento),
      normalize(record.provincia),
      normalize(record.distrito),
    ].join("|");

    const defaultId =
      codigo && codigo.length > 0
        ? codigo
        : hashId(identityKey);

    const existingIdForIdentity = identityKey ? identityToBaseId.get(identityKey) : null;
    let baseId = existingIdForIdentity || defaultId;

    const shouldUpgradeToCodigo =
      !!codigo &&
      codigo.length > 0 &&
      existingIdForIdentity &&
      existingIdForIdentity !== codigo &&
      /^[a-f0-9]{12}$/i.test(existingIdForIdentity);

    if (shouldUpgradeToCodigo) {
      const existingAgg = aggregations.get(existingIdForIdentity);
      if (existingAgg) {
        aggregations.delete(existingIdForIdentity);
        baseId = codigo;
        const merged = aggregations.get(baseId) || {
          ...existingAgg,
          id: baseId,
          codigo_renipress_modular: codigo,
          profesiones: Array.isArray(existingAgg.profesiones) ? existingAgg.profesiones.slice() : [],
        };
        if (!aggregations.has(baseId)) aggregations.set(baseId, merged);
      } else {
        baseId = codigo;
      }
    }

    if (identityKey) {
      const mapped = identityToBaseId.get(identityKey);
      if (!mapped || mapped === baseId || (!/^[a-f0-9]{12}$/i.test(baseId) && /^[a-f0-9]{12}$/i.test(mapped))) {
        identityToBaseId.set(identityKey, baseId);
      }
    }

    const renipress = codigo ? renipressStore.byCode.get(codigo) : null;

    const rawLat = latIndex != null && latIndex < row.length ? row[latIndex] : "";
    const rawLon = lonIndex != null && lonIndex < row.length ? row[lonIndex] : "";
    const lat = parseNumberOrNull(rawLat);
    const lon = parseNumberOrNull(rawLon);

    const profession = cleanString(record.profesion);

    let agg = aggregations.get(baseId);
    if (!agg) {
      agg = {
        ...record,
        id: baseId,
        codigo_renipress_modular: codigo,
        profesiones: profession ? [profession] : [],
      };

      const deptCoords = getCoordsForDepartment(record.departamento);
      const renipressBaseCoords =
        renipress && (renipress.norteRaw || renipress.esteRaw)
          ? parseRenipressLatLng(renipress.norteRaw, renipress.esteRaw, record.departamento || renipress.departamento || "")
          : null;
      const renipressCandidate = renipressBaseCoords
        ? normalizePeruLatLng(renipressBaseCoords.lat, renipressBaseCoords.lng, deptCoords)
        : null;
      const renipressCoords = isReasonableForDepartment(renipressCandidate, deptCoords) ? renipressCandidate : null;
      const csvCoords = lat != null && lon != null ? normalizePeruLatLng(lat, lon, deptCoords) : null;

      if (renipressCoords) {
        agg.lat = renipressCoords.lat;
        agg.lng = renipressCoords.lng;
        agg.coordenadas_fuente = "RENIPRESS";
      } else if (csvCoords && isReasonableForDepartment(csvCoords, deptCoords)) {
        agg.lat = csvCoords.lat;
        agg.lng = csvCoords.lng;
        agg.coordenadas_fuente = "CSV";
      } else {
        agg.lat = deptCoords.lat;
        agg.lng = deptCoords.lng;
        agg.coordenadas_fuente = "DEPARTAMENTO";
      }

      if (renipress && Array.isArray(renipress.imagenes) && renipress.imagenes.length > 0) {
        agg.imagenes = renipress.imagenes;
      }

      aggregations.set(baseId, agg);
    } else {
      if (profession && !agg.profesiones.includes(profession)) {
        agg.profesiones.push(profession);
      }
      if (agg.coordenadas_fuente !== "RENIPRESS" && renipress && (renipress.norteRaw || renipress.esteRaw)) {
        const deptCoords = getCoordsForDepartment(agg.departamento || record.departamento);
        const renipressBaseCoords = parseRenipressLatLng(
          renipress.norteRaw,
          renipress.esteRaw,
          agg.departamento || record.departamento || renipress.departamento || "",
        );
        const renipressCandidate = renipressBaseCoords
          ? normalizePeruLatLng(renipressBaseCoords.lat, renipressBaseCoords.lng, deptCoords)
          : null;
        const renipressCoords = isReasonableForDepartment(renipressCandidate, deptCoords) ? renipressCandidate : null;
        if (renipressCoords) {
          agg.lat = renipressCoords.lat;
          agg.lng = renipressCoords.lng;
          agg.coordenadas_fuente = "RENIPRESS";
        }
      }
      if (
        (!agg.imagenes || agg.imagenes.length === 0) &&
        renipress &&
        Array.isArray(renipress.imagenes) &&
        renipress.imagenes.length > 0
      ) {
        agg.imagenes = renipress.imagenes;
      }
      if (cleanString(record.zaf) === "SI") agg.zaf = "SI";
      if (cleanString(record.ze) === "SI") agg.ze = "SI";
    }
  }

  const overrides = await loadCoordOverrides();
  for (const agg of aggregations.values()) {
    const profs = Array.isArray(agg.profesiones) ? agg.profesiones.filter(Boolean) : [];
    profs.sort((a, b) => a.localeCompare(b));
    agg.profesiones = profs;
    agg.profesion = profs.length > 0 ? profs[0] : cleanString(agg.profesion);
    const override = overrides.byId.get(String(agg.id));
    if (override && isWithinPeruBBox(override.lat, override.lng)) {
      agg.lat = override.lat;
      agg.lng = override.lng;
      agg.coordenadas_fuente = override.source || "OVERRIDE";
    } else {
      enqueueGeocodeIfNeeded(agg);
    }
    records.push(agg);
    byId.set(agg.id, agg);
  }

  ensureGeocodeWorkerStarted();

  cached = {
    mtimeMs: stat.mtimeMs,
    renipressMtimeMs: renipressMtime,
    records,
    byId,
    path: csvPath,
    renipressPath: renipressStore.path,
  };

  return cached;
}

function bumpDbHospitalsRevision() {
  dbHospitalsRevision += 1;
  dbHospitalsCache = null;
}

function hospitalToDbRow(h) {
  const profesiones = Array.isArray(h.profesiones) ? h.profesiones : [];
  const imagenes = Array.isArray(h.imagenes) ? h.imagenes : [];
  return {
    id: String(h.id),
    profesion: cleanString(h.profesion),
    profesiones_json: JSON.stringify(profesiones),
    institucion: cleanString(h.institucion),
    departamento: cleanString(h.departamento),
    provincia: cleanString(h.provincia),
    distrito: cleanString(h.distrito),
    grado_dificultad: cleanString(h.grado_dificultad),
    codigo_renipress_modular: cleanString(h.codigo_renipress_modular),
    nombre_establecimiento: cleanString(h.nombre_establecimiento),
    presupuesto: cleanString(h.presupuesto),
    categoria: cleanString(h.categoria),
    zaf: cleanString(h.zaf),
    ze: cleanString(h.ze),
    imagenes_json: JSON.stringify(imagenes),
    lat: Number.isFinite(Number(h.lat)) ? Number(h.lat) : null,
    lng: Number.isFinite(Number(h.lng)) ? Number(h.lng) : null,
    coordenadas_fuente: cleanString(h.coordenadas_fuente),
    updated_at: new Date().toISOString(),
  };
}

async function importHospitalsToDb({ force } = {}) {
  if (!DB_ENABLED) {
    return { upserted: 0, csvPath: null, renipressPath: null, skipped: true };
  }

  const existingCount = await hospitalRepository.countHospitals();
  if (existingCount > 0 && !force) {
    return { upserted: 0, csvPath: null, renipressPath: null, skipped: true };
  }

  const store = await loadHospitalsFromCsv();
  const rows = store.records.map(hospitalToDbRow);
  await hospitalRepository.upsertHospitals(rows);
  bumpDbHospitalsRevision();

  return {
    upserted: rows.length,
    csvPath: store.path,
    renipressPath: store.renipressPath,
    skipped: false,
  };
}

async function ensureDbSeeded() {
  if (!DB_ENABLED) return;
  if (dbSeedPromise) return dbSeedPromise;
  dbSeedPromise = (async () => {
    const count = await hospitalRepository.countHospitals();
    if (count > 0) return;

    throw new HttpError(500, "Base de datos vacía. Falta poblarla.", { DB_PATH });
  })();
  return dbSeedPromise;
}

async function loadHospitalsFromDb() {
  const dv = await readDbDataVersion();
  if (dbHospitalsCache && dbHospitalsCache.revision === dbHospitalsRevision) {
    if (dv == null || (dbHospitalsDataVersion != null && dv === dbHospitalsDataVersion)) return dbHospitalsCache;
  }
  const records = await hospitalRepository.listHospitalsWithOverrides();
  const byId = new Map();
  for (const h of records) byId.set(String(h.id), h);
  dbHospitalsCache = { revision: dbHospitalsRevision, records, byId };
  dbHospitalsDataVersion = dv;
  return dbHospitalsCache;
}

function toArrayQuery(value) {
  if (value == null) return [];
  if (Array.isArray(value)) return value.map((v) => cleanString(String(v))).filter(Boolean);
  if (typeof value === "string") {
    const s = value.trim();
    if (!s) return [];
    // soporta CSV "A,B,C"
    return s.split(",").map((v) => cleanString(v)).filter(Boolean);
  }
  return [];
}

function matchesAny(fieldValue, allowed) {
  if (!allowed || allowed.length === 0) return true;
  const normAllowed = new Set(allowed.map((v) => normalize(v)));
  if (Array.isArray(fieldValue)) {
    for (const v of fieldValue) if (normAllowed.has(normalize(v))) return true;
    return false;
  }
  return normAllowed.has(normalize(fieldValue));
}

function summarizeOffers(offers) {
  const items = Array.isArray(offers) ? offers : [];
  const byKey = new Map();
  for (const o of items) {
    if (!o || typeof o !== "object") continue;
    const periodo = typeof o.periodo === "string" ? o.periodo : "";
    const modalidad = typeof o.modalidad === "string" ? o.modalidad : "";
    const plazas = typeof o.plazas === "number" ? o.plazas : Number(o.plazas) || 0;
    if (!periodo || !modalidad) continue;
    const key = `${periodo}::${modalidad}`;
    byKey.set(key, (byKey.get(key) || 0) + plazas);
  }
  return Array.from(byKey.entries())
    .map(([key, plazas_total]) => {
      const [periodo, modalidad] = key.split("::");
      return { periodo, modalidad, plazas_total };
    })
    .sort((a, b) => {
      const p = String(b.periodo).localeCompare(String(a.periodo));
      if (p !== 0) return p;
      return String(a.modalidad).localeCompare(String(b.modalidad));
    });
}

async function listHospitals(filters) {
  if (DB_ENABLED) await ensureDbSeeded();
  const store = DB_ENABLED ? await loadHospitalsFromDb() : await loadHospitalsFromCsv();

  const profesion = cleanString(filters.profesion);
  const instituciones = toArrayQuery(filters.institucion);
  const departamentos = toArrayQuery(filters.departamento);
  const provincias = toArrayQuery(filters.provincia);
  const distrito = cleanString(filters.distrito);
  const grados = toArrayQuery(filters.grado_dificultad);
  const categorias = toArrayQuery(filters.categoria);
  const zaf = cleanString(filters.zaf);
  const ze = cleanString(filters.ze);
  const serums_periodo = cleanString(filters.serums_periodo);
  const serums_modalidad = cleanString(filters.serums_modalidad);
  const airportHoursMax = Number(filters.airport_hours_max);

  const requiresOfferFilter = !!serums_periodo || !!serums_modalidad;
  const needsOfferFilter = DB_ENABLED && (!!profesion || requiresOfferFilter);

  let base = store.records.filter((h) => {
    if (!needsOfferFilter) {
      const profField = Array.isArray(h.profesiones) && h.profesiones.length > 0 ? h.profesiones : h.profesion;
      if (!matchesAny(profField, profesion ? [profesion] : [])) return false;
    }
    if (!matchesAny(h.institucion, instituciones)) return false;
    if (!matchesAny(h.departamento, departamentos)) return false;
    if (!matchesAny(h.provincia, provincias)) return false;
    if (!matchesAny(h.distrito, distrito ? [distrito] : [])) return false;
    if (!matchesAny(h.grado_dificultad, grados)) return false;
    if (!matchesAny(h.categoria, categorias)) return false;
    if (!matchesAny(h.zaf, zaf ? [zaf] : [])) return false;
    if (!matchesAny(h.ze, ze ? [ze] : [])) return false;
    return true;
  });

  // Filtro por tiempo máximo al aeropuerto (aprox. basado en distancia geodésica)
  if (Number.isFinite(airportHoursMax) && airportHoursMax > 0) {
    const { getNearestAirport } = require("./overpassService");
    const MAX_CONCURRENCY = 5;
    const queue = base.slice();
    const results = [];
    const workers = Array.from({ length: Math.min(MAX_CONCURRENCY, queue.length) }, async () => {
      while (queue.length) {
        const h = queue.pop();
        if (!h) break;
        if (!Number.isFinite(h.lat) || !Number.isFinite(h.lng)) continue;
        try {
          const nearest = await getNearestAirport({ lat: h.lat, lon: h.lng });
          const dMeters = nearest && Number.isFinite(nearest.distancia_meters) ? nearest.distancia_meters : null;
          if (dMeters == null) continue;
          const km = dMeters / 1000;
          const hours = km / 60; // ~60 km/h
          if (hours <= airportHoursMax) results.push(h);
        } catch {
          // Ignorar errores de API; no incluir hospital si falla
        }
      }
    });
    await Promise.all(workers);
    base = results;
  }

  if (!needsOfferFilter) return base;
  if (!DB_ENABLED) return [];

  const ids = base.map((h) => String(h.id)).filter(Boolean);
  const summary = await serumsOfferRepository.listOfferSummaryByHospitalIds(ids, {
    periodo: serums_periodo || null,
    modalidad: serums_modalidad || null,
    profesion: profesion || null,
  });
  const allowed = new Set(summary.map((r) => String(r.hospital_id)));
  return base.filter((h) => allowed.has(String(h.id)));
}

async function listHospitalFacets(filters) {
  const incoming = filters && typeof filters === "object" ? filters : {};
  const baseFilters = { ...incoming };
  delete baseFilters.airport_hours_max;

  const allHospitals = await listHospitals({});

  async function buildFacet(key) {
    const others = { ...baseFilters };
    delete others[key];

    const filtered = await listHospitals(others);
    const countsByLower = new Set();
    for (const h of filtered) {
      const raw = cleanString(h && h[key] != null ? h[key] : "");
      if (!raw) continue;
      countsByLower.add(raw.toLowerCase());
    }

    const lowerToLabel = new Map();
    for (const h of allHospitals) {
      const raw = cleanString(h && h[key] != null ? h[key] : "");
      if (!raw) continue;
      const lower = raw.toLowerCase();
      const existing = lowerToLabel.get(lower);
      if (!existing || raw.localeCompare(existing) < 0) lowerToLabel.set(lower, raw);
    }

    const values = Array.from(lowerToLabel.values())
      .filter(Boolean)
      .sort((a, b) => String(a).localeCompare(String(b)));

    const enabled = {};
    for (const [lower, label] of lowerToLabel.entries()) {
      enabled[label] = countsByLower.has(lower);
    }

    return { values, enabled };
  }

  const [departamentos, instituciones, grados_dificultad, categorias] = await Promise.all([
    buildFacet("departamento"),
    buildFacet("institucion"),
    buildFacet("grado_dificultad"),
    buildFacet("categoria"),
  ]);

  return { departamentos, instituciones, grados_dificultad, categorias };
}

async function getHospitalById(id) {
  if (DB_ENABLED) await ensureDbSeeded();
  const store = DB_ENABLED ? await loadHospitalsFromDb() : await loadHospitalsFromCsv();
  const key = String(id || "").trim();
  let hospital = store.byId.get(key);
  if (!hospital) {
    hospital = store.records.find((h) => String(h && h.codigo_renipress_modular ? h.codigo_renipress_modular : "").trim() === key);
  }
  if (!hospital) throw new HttpError(404, "Hospital no encontrado");
  if (!DB_ENABLED) return hospital;

  const offers = await serumsOfferRepository.listOffersByHospitalId(hospital.id);
  const resumen = summarizeOffers(offers);
  return { ...hospital, serums_ofertas: offers, serums_resumen: resumen };
}

async function geocodeHospitalById(id, { force = false } = {}) {
  if (DB_ENABLED) await ensureDbSeeded();
  const hospital = await getHospitalById(id);
  try {
    await geocodeHospitalRecord(hospital, { force });
  } catch {
  }
  if (DB_ENABLED) return await getHospitalById(id);
  return hospital;
}

async function __persistCoordOverrideForImport(id, { lat, lng, source }) {
  if (!id) return;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
  if (DB_ENABLED) {
    await hospitalRepository.upsertCoordOverride(String(id), { lat, lng, source: source || "OVERRIDE" });
    overridesDbRevision += 1;
    overridesCached = null;
    bumpDbHospitalsRevision();
    return;
  }
  await persistCoordOverride(id, { lat, lng, source });
}

module.exports = {
  listHospitals,
  listHospitalFacets,
  getHospitalById,
  geocodeHospitalById,
  importHospitalsToDb,
  __persistCoordOverrideForImport,
};
