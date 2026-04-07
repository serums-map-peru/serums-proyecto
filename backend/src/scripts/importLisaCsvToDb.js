const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const { DB_ENABLED, execute } = require("../db");
const hospitalRepository = require("../db/hospitalRepository");
const serumsOfferRepository = require("../db/serumsOfferRepository");
const { HttpError } = require("../utils/httpError");

function cleanString(value) {
  if (value == null) return "";
  return String(value)
    .replace(/\uFEFF/g, "")
    .replace(/[\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeKey(value) {
  return cleanString(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

function normalizeInstitutionKey(value) {
  return cleanString(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeInstitutionLabel(value) {
  const raw = cleanString(value);
  const key = normalizeInstitutionKey(raw);
  if (key.includes("gobierno regional")) return "MINSA";
  return raw;
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

function findHeaderRowIndex(rows) {
  if (!Array.isArray(rows)) return -1;
  // Heurística: fila que contenga "PROFESION" o "CODIGO RENIPRESS"
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] || [];
    const joined = row.map((c) => normalizeKey(c)).join("|");
    if (joined.includes("profesion") && (joined.includes("codigorenipress") || joined.includes("codigorenipressmodular"))) {
      return i;
    }
  }
  return 0;
}

function buildHeaderIndex(headerRow) {
  const index = new Map();
  for (let i = 0; i < headerRow.length; i++) {
    const k = normalizeKey(headerRow[i]);
    if (!k) continue;
    if (!index.has(k)) index.set(k, i);
  }
  return index;
}

function mustGetIndex(headerIndex, keys, label) {
  for (const k of keys) {
    const idx = headerIndex.get(k);
    if (typeof idx === "number") return idx;
  }
  throw new HttpError(500, `CSV no contiene columna requerida: ${label}`, { label, keys });
}

function parseIntOrNull(value) {
  const s = cleanString(value);
  if (!s) return null;
  const digits = s.replace(/[^\d-]+/g, "");
  if (!digits) return null;
  const n = Number.parseInt(digits, 10);
  return Number.isFinite(n) ? n : null;
}

function parseNumberOrNull(value) {
  const s = cleanString(value);
  if (!s) return null;

  let normalized = s.replace(/[\s'’]+/g, "");
  const hasDot = normalized.includes(".");
  const hasComma = normalized.includes(",");

  if (hasDot && hasComma) {
    const lastDot = normalized.lastIndexOf(".");
    const lastComma = normalized.lastIndexOf(",");
    if (lastComma > lastDot) {
      // 9.100.000,12 -> 9100000.12
      normalized = normalized.replace(/\./g, "").replace(/,/g, ".");
    } else {
      // 9,100,000.12 -> 9100000.12
      normalized = normalized.replace(/,/g, "");
    }
  } else if (hasComma && !hasDot) {
    const commas = (normalized.match(/,/g) || []).length;
    normalized = commas > 1 ? normalized.replace(/,/g, "") : normalized.replace(/,/g, ".");
  } else if (hasDot && !hasComma) {
    const dots = (normalized.match(/\./g) || []).length;
    if (dots > 1) normalized = normalized.replace(/\./g, "");
  }

  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

function parseScaledCoord(value, { isLat }) {
  const raw = parseNumberOrNull(value);
  if (raw == null) return null;
  if (raw === 0) return null;
  const limit = isLat ? 90 : 180;
  const divisors = [1, 1e2, 1e3, 1e4, 1e5, 1e6, 1e7, 1e8];
  for (const d of divisors) {
    const v = raw / d;
    if (!Number.isFinite(v)) continue;
    if (Math.abs(v) <= limit) {
      const rounded = Math.round(v * 1e8) / 1e8;
      if (!Number.isFinite(rounded)) continue;
      if (isLat) {
        const abs = Math.abs(rounded);
        if (abs > 20.7) continue;
      } else {
        const abs = Math.abs(rounded);
        if (abs < 67.0 || abs > 82.5) continue;
      }
      return rounded;
    }
  }
  return null;
}

function parseLatLngScaled(norte, este, center) {
  const divisors = [1, 1e2, 1e3, 1e4, 1e5, 1e6, 1e7, 1e8];
  const nRaw = parseNumberOrNull(norte);
  const eRaw = parseNumberOrNull(este);
  if (!Number.isFinite(nRaw) || !Number.isFinite(eRaw)) return null;
  if (nRaw === 0 || eRaw === 0) return null;

  const hint = center && Number.isFinite(center.lat) && Number.isFinite(center.lng) ? center : null;
  let best = null;
  let bestD = Number.POSITIVE_INFINITY;

  for (const dn of divisors) {
    const lat = Math.round((nRaw / dn) * 1e8) / 1e8;
    if (!Number.isFinite(lat)) continue;
    if (Math.abs(lat) > 20.7) continue;

    for (const de of divisors) {
      const lng = Math.round((eRaw / de) * 1e8) / 1e8;
      if (!Number.isFinite(lng)) continue;
      const absLng = Math.abs(lng);
      if (absLng < 67.0 || absLng > 82.5) continue;

      const norm = normalizePeruCandidate(lat, lng, hint);
      if (!norm) continue;
      if (!hint) return norm;
      const d = approxDistanceKm(hint, norm);
      if (d < bestD) {
        best = norm;
        bestD = d;
      }
    }
  }

  return best;
}

function isLikelyUtmPair(norte, este) {
  const n = parseNumberOrNull(norte);
  const e = parseNumberOrNull(este);
  if (!Number.isFinite(n) || !Number.isFinite(e)) return false;
  return e >= 160000 && e <= 834000 && n >= 8000000 && n <= 10000000;
}

function utmToLatLng(zone, easting, northing) {
  const a = 6378137.0;
  const f = 1 / 298.257223563;
  const k0 = 0.9996;
  const b = a * (1 - f);
  const e = Math.sqrt(1 - (b * b) / (a * a));
  const e1sq = e * e / (1 - e * e);
  const x = easting - 500000.0;
  const y = northing;
  const m = y / k0;
  const mu = m / (a * (1 - (e * e) / 4 - (3 * e ** 4) / 64 - (5 * e ** 6) / 256));
  const e1 = (1 - Math.sqrt(1 - e * e)) / (1 + Math.sqrt(1 - e * e));
  const j1 = (3 * e1) / 2 - (27 * e1 ** 3) / 32;
  const j2 = (21 * e1 ** 2) / 16 - (55 * e1 ** 4) / 32;
  const j3 = (151 * e1 ** 3) / 96;
  const j4 = (1097 * e1 ** 4) / 512;
  const fp = mu + j1 * Math.sin(2 * mu) + j2 * Math.sin(4 * mu) + j3 * Math.sin(6 * mu) + j4 * Math.sin(8 * mu);
  const c1 = e1sq * Math.cos(fp) ** 2;
  const t1 = Math.tan(fp) ** 2;
  const r1 = (a * (1 - e * e)) / Math.pow(1 - (e * Math.sin(fp)) ** 2, 1.5);
  const n1 = a / Math.sqrt(1 - (e * Math.sin(fp)) ** 2);
  const d = x / (n1 * k0);
  const q1 = d;
  const q2 = (d ** 3) / 6 * (1 + 2 * t1 + c1);
  const q3 = (d ** 5) / 120 * (5 - 2 * c1 + 28 * t1 - 3 * c1 ** 2 + 8 * e1sq + 24 * t1 ** 2);
  const lat = fp - (n1 * Math.tan(fp) / r1) * (q2 - q3);
  const q4 = (d ** 3) / 6 * (1 - t1 + c1);
  const q5 = (d ** 5) / 120 * (5 - 18 * t1 + t1 ** 2 + 72 * c1 - 58 * e1sq);
  const lon = ((d - q4 + q5) / Math.cos(fp));
  const lon0 = ((zone - 1) * 6 - 180 + 3) * (Math.PI / 180);
  const latDeg = (lat * 180) / Math.PI;
  const lonDeg = ((lon0 + lon) * 180) / Math.PI;
  return { lat: latDeg, lng: lonDeg };
}

function approxDistanceKm(a, b) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lng - a.lng) * Math.PI) / 180;
  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLon / 2);
  const h = s1 * s1 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * s2 * s2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function parseNorteEsteSmart(norte, este, departamento) {
  const center = getDeptCoords(departamento || "");
  const scaled = parseLatLngScaled(norte, este, center);
  if (scaled) return scaled;
  if (isLikelyUtmPair(norte, este)) {
    const n = parseNumberOrNull(norte);
    const e = parseNumberOrNull(este);
    const candidates = [17, 18, 19]
      .map((z) => utmToLatLng(z, e, n))
      .filter((p) => p && p.lat >= -20.7 && p.lat <= 1.2 && p.lng >= -82.5 && p.lng <= -67.0);
    if (candidates.length === 1) return candidates[0];
    if (candidates.length > 1) {
      let best = candidates[0];
      let bestD = approxDistanceKm(center, best);
      for (let i = 1; i < candidates.length; i++) {
        const d = approxDistanceKm(center, candidates[i]);
        if (d < bestD) {
          best = candidates[i];
          bestD = d;
        }
      }
      return best;
    }
  }
  return null;
}
 
function normalizePeruCandidate(lat, lng, center) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const raw = { lat, lng };
  const cands = [
    raw,
    { lat: raw.lat, lng: -raw.lng },
    { lat: -raw.lat, lng: raw.lng },
    { lat: -raw.lat, lng: -raw.lng },
    { lat: raw.lng, lng: raw.lat },
    { lat: raw.lng, lng: -raw.lat },
    { lat: -raw.lng, lng: raw.lat },
    { lat: -raw.lng, lng: -raw.lat },
  ].filter((p) => p.lat >= -20.7 && p.lat <= 1.2 && p.lng >= -82.5 && p.lng <= -67.0);
  if (cands.length === 0) return null;
  if (!center) return cands[0];
  let best = cands[0];
  let bestD = approxDistanceKm(center, best);
  for (let i = 1; i < cands.length; i++) {
    const d = approxDistanceKm(center, cands[i]);
    if (d < bestD) {
      best = cands[i];
      bestD = d;
    }
  }
  return best;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function nominatimSearch(q) {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "5");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("q", q);
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 12_000);
  try {
    const res = await fetch(url.toString(), {
      headers: { "user-agent": "SERUMS-Map-Peru/1.0" },
      signal: controller.signal,
    });
    if (!res.ok) return [];
    const json = await res.json().catch(() => []);
    return Array.isArray(json) ? json : [];
  } catch {
    return [];
  } finally {
    clearTimeout(t);
  }
}

function pickNominatimMatch(results) {
  for (const r of results) {
    if (!r || typeof r !== "object") continue;
    const lat = Number(r.lat);
    const lng = Number(r.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    if (lat < -25 || lat > 5) continue;
    if (lng < -90 || lng > -60) continue;
    const addr = r.address && typeof r.address === "object" ? r.address : null;
    const cc = addr && typeof addr.country_code === "string" ? addr.country_code.toLowerCase() : "";
    const display = typeof r.display_name === "string" ? r.display_name : "";
    if (cc === "pe" || /peru/i.test(display)) return { lat, lng };
  }
  return null;
}

function padIpressCode(value) {
  const raw = cleanString(value);
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  if (!digits) return raw;
  return digits.padStart(8, "0");
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

function deptKey(value) {
  return cleanString(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_")
    .toUpperCase();
}

function getDeptCoords(departamento) {
  const key = deptKey(departamento);
  return DEPARTMENT_COORDS[key] || { lat: -9.19, lng: -75.0152 };
}

function readCsv(csvPath) {
  const raw = fs.readFileSync(csvPath, "utf8");
  return parseDelimited(raw, ";");
}

async function main() {
  if (!DB_ENABLED) {
    process.stdout.write("DB deshabilitada (DB_ENABLED=0). Abortando.\n");
    process.exit(1);
  }

  const csvPath =
    process.env.LISA_CSV_PATH && String(process.env.LISA_CSV_PATH).trim()
      ? path.resolve(String(process.env.LISA_CSV_PATH).trim())
      : path.resolve(__dirname, "../../../../DB-LISA.csv");

  if (!fs.existsSync(csvPath)) {
    throw new HttpError(500, "No se encontró DB-LISA.csv", { path: csvPath });
  }

  const rows = readCsv(csvPath);
  if (!rows.length) {
    throw new HttpError(500, "CSV vacío", { path: csvPath });
  }

  const headerRowIndex = findHeaderRowIndex(rows);
  const headerRow = rows[headerRowIndex].map(cleanString);
  const headerIndex = buildHeaderIndex(headerRow);

  const idxProfesion = mustGetIndex(headerIndex, ["profesion", "profesin", "profesiona"], "PROFESION");
  const idxPlazas = mustGetIndex(headerIndex, ["nplazas", "plazas", "nplaza"], "N° PLAZAS");
  const idxInstitucion = mustGetIndex(headerIndex, ["institucion"], "INSTITUCION");
  const idxDepartamento = mustGetIndex(headerIndex, ["departamento"], "DEPARTAMENTO");
  const idxProvincia = mustGetIndex(headerIndex, ["provincia"], "PROVINCIA");
  const idxDistrito = mustGetIndex(headerIndex, ["distrito"], "DISTRITO");
  const idxGrado = mustGetIndex(headerIndex, ["gradodedificultad", "gradodificultad", "graddedificultad"], "GRADO DE DIFICULTAD");
  const idxCodigo = mustGetIndex(
    headerIndex,
    ["codigorenipressmodular", "codigorenipress", "cdigorenipressmodular", "cdigorenipress"],
    "CODIGO RENIPRESS MODULAR",
  );
  const idxNombre = mustGetIndex(headerIndex, ["nombredeestablecimiento", "nombreestablecimiento"], "NOMBRE DE ESTABLECIMIENTO");
  const idxCategoria = mustGetIndex(headerIndex, ["categoria"], "CATEGORIA");
  const idxPresupuesto = mustGetIndex(headerIndex, ["presupuesto"], "PRESUPUESTO");
  const idxZaf = headerIndex.get("zaf") ?? headerIndex.get("zaf");
  const idxZe = headerIndex.get("ze") ?? headerIndex.get("ze");
  const idxSede = headerIndex.get("sededeadjudicacion") ?? headerIndex.get("sededeadjudicacin");
  const idx2025I = mustGetIndex(headerIndex, ["2025i", "2025-i"], "2025-I");
  const idx2025II = mustGetIndex(headerIndex, ["2025ii", "2025-ii"], "2025-II");
  const idxRem = mustGetIndex(headerIndex, ["remunerada", "remunerado", "remuneradas", "remunerados"], "REMUNERADA");
  const idxEq = mustGetIndex(headerIndex, ["equivalente", "equivalentes"], "EQUIVALENTE");
  const idxNorte = mustGetIndex(headerIndex, ["norte"], "NORTE");
  const idxEste = mustGetIndex(headerIndex, ["este"], "ESTE");

  const hospitals = new Map(); // codigo -> agg hospital
  const offers = [];
  const missingForGeocode = new Map();
  let withCsvCoords = 0;

  for (let r = headerRowIndex + 1; r < rows.length; r++) {
    const row = rows[r] || [];
    const profesion = idxProfesion < row.length ? cleanString(row[idxProfesion]) : "";
    const plazas = idxPlazas < row.length ? parseIntOrNull(row[idxPlazas]) : null;
    const codigo = padIpressCode(idxCodigo < row.length ? row[idxCodigo] : "");
    const institucion = normalizeInstitutionLabel(idxInstitucion < row.length ? row[idxInstitucion] : "");
    const departamento = idxDepartamento < row.length ? cleanString(row[idxDepartamento]) : "";
    const provincia = idxProvincia < row.length ? cleanString(row[idxProvincia]) : "";
    const distrito = idxDistrito < row.length ? cleanString(row[idxDistrito]) : "";
    const grado = idxGrado < row.length ? cleanString(row[idxGrado]) : "";
    const nombre = idxNombre < row.length ? cleanString(row[idxNombre]) : "";
    const categoria = idxCategoria < row.length ? cleanString(row[idxCategoria]) : "";
    const presupuesto = idxPresupuesto < row.length ? cleanString(row[idxPresupuesto]) : "";
    const zaf = typeof idxZaf === "number" && idxZaf < row.length ? cleanString(row[idxZaf]).toUpperCase() : "";
    const ze = typeof idxZe === "number" && idxZe < row.length ? cleanString(row[idxZe]).toUpperCase() : "";
    const sede = typeof idxSede === "number" && idxSede < row.length ? cleanString(row[idxSede]) : "";
    const has2025I = idx2025I < row.length ? cleanString(row[idx2025I]).toUpperCase().startsWith("SI") : false;
    const has2025II = idx2025II < row.length ? cleanString(row[idx2025II]).toUpperCase().startsWith("SI") : false;
    const isRem = idxRem < row.length ? cleanString(row[idxRem]).toUpperCase().startsWith("SI") : false;
    const isEq = idxEq < row.length ? cleanString(row[idxEq]).toUpperCase().startsWith("SI") : false;
    const norteRaw = idxNorte < row.length ? row[idxNorte] : null;
    const esteRaw = idxEste < row.length ? row[idxEste] : null;
    let latFromCsv = null;
    let lngFromCsv = null;
    const smart = parseNorteEsteSmart(norteRaw, esteRaw, departamento);
    if (smart) {
      latFromCsv = smart.lat;
      lngFromCsv = smart.lng;
    } else {
      latFromCsv = parseScaledCoord(norteRaw, { isLat: true });
      lngFromCsv = parseScaledCoord(esteRaw, { isLat: false });
    }
    if (latFromCsv != null && lngFromCsv != null) {
      const norm = normalizePeruCandidate(latFromCsv, lngFromCsv, getDeptCoords(departamento));
      if (norm) {
        latFromCsv = norm.lat;
        lngFromCsv = norm.lng;
      } else {
        latFromCsv = null;
        lngFromCsv = null;
      }
    }
    const hasLatLngFromCsv = latFromCsv != null && lngFromCsv != null;

    if (!codigo) continue;

    let agg = hospitals.get(codigo);
    if (!agg) {
      const coords = getDeptCoords(departamento);
      agg = {
        id: codigo,
        codigo_renipress_modular: codigo,
        institucion,
        departamento,
        provincia,
        distrito,
        grado_dificultad: grado,
        nombre_establecimiento: nombre,
        presupuesto,
        categoria,
        zaf: zaf === "SI" ? "SI" : "NO",
        ze: ze === "SI" ? "SI" : "NO",
        profesiones: [],
        lat: hasLatLngFromCsv ? latFromCsv : coords.lat,
        lng: hasLatLngFromCsv ? lngFromCsv : coords.lng,
        coordenadas_fuente: hasLatLngFromCsv ? "CSV" : "DEPARTAMENTO",
        imagenes: [],
      };
      hospitals.set(codigo, agg);
      if (hasLatLngFromCsv) withCsvCoords += 1;
    }
    if (hasLatLngFromCsv && agg.coordenadas_fuente !== "CSV") {
      agg.lat = latFromCsv;
      agg.lng = lngFromCsv;
      agg.coordenadas_fuente = "CSV";
      withCsvCoords += 1;
    }
    if (profesion && !agg.profesiones.includes(profesion)) agg.profesiones.push(profesion);
    if (zaf === "SI") agg.zaf = "SI";
    if (ze === "SI") agg.ze = "SI";
    if (agg.coordenadas_fuente !== "CSV") {
      if (!missingForGeocode.has(codigo)) {
        missingForGeocode.set(codigo, {
          id: codigo,
          nombre_establecimiento: nombre,
          distrito,
          provincia,
          departamento,
        });
      }
    }

    if (plazas != null && plazas > 0 && profesion) {
      const combos = [];
      if (has2025I && isRem) combos.push({ periodo: "2025-I", modalidad: "remunerado" });
      if (has2025I && isEq) combos.push({ periodo: "2025-I", modalidad: "equivalente" });
      if (has2025II && isRem) combos.push({ periodo: "2025-II", modalidad: "remunerado" });
      if (has2025II && isEq) combos.push({ periodo: "2025-II", modalidad: "equivalente" });
      for (const c of combos) {
        offers.push(
          serumsOfferRepository.buildOfferRecord({
            hospital_id: codigo,
            codigo_renipress_modular: codigo,
            periodo: c.periodo,
            modalidad: c.modalidad,
            profesion,
            plazas,
            sede_adjudicacion: sede || null,
          }),
        );
      }
    }
  }

  await execute("DELETE FROM serums_offers", []);
  await execute("DELETE FROM hospital_coord_overrides", []);
  await execute("DELETE FROM hospitals", []);

  const hospitalRows = Array.from(hospitals.values()).map((h) => ({
    id: h.id,
    profesion: h.profesiones[0] || "",
    profesiones_json: JSON.stringify(h.profesiones),
    institucion: h.institucion,
    departamento: h.departamento,
    provincia: h.provincia,
    distrito: h.distrito,
    grado_dificultad: h.grado_dificultad,
    codigo_renipress_modular: h.codigo_renipress_modular,
    nombre_establecimiento: h.nombre_establecimiento,
    presupuesto: h.presupuesto,
    categoria: h.categoria,
    zaf: h.zaf,
    ze: h.ze,
    imagenes_json: JSON.stringify(h.imagenes || []),
    lat: h.lat,
    lng: h.lng,
    coordenadas_fuente: h.coordenadas_fuente,
    updated_at: new Date().toISOString(),
  }));
  await hospitalRepository.upsertHospitals(hospitalRows);

  if (offers.length > 0) {
    await serumsOfferRepository.upsertOffers(offers);
  }

  const geocodeEnabled = String(process.env.GEOCODE_MISSING_AFTER_IMPORT || "1").trim() !== "0";
  const geocodeMaxRaw = Number(String(process.env.GEOCODE_MAX_AFTER_IMPORT || "0").trim());
  const geocodeMax = Number.isFinite(geocodeMaxRaw) ? geocodeMaxRaw : 0;
  const geocodeDelayRaw = Number(String(process.env.GEOCODE_DELAY_MS || "1200").trim());
  const geocodeDelayMs = Number.isFinite(geocodeDelayRaw) ? geocodeDelayRaw : 1200;

  let geocoded = 0;
  let geocodeFailed = 0;

  if (geocodeEnabled) {
    const list = Array.from(missingForGeocode.values());
    const limit = geocodeMax > 0 ? Math.min(geocodeMax, list.length) : list.length;
    for (let i = 0; i < limit; i++) {
      const h = list[i];
      const nombre = cleanString(h.nombre_establecimiento);
      const distrito = cleanString(h.distrito);
      const provincia = cleanString(h.provincia);
      const departamento = cleanString(h.departamento);

      if (!nombre || !distrito || !provincia || !departamento) {
        geocodeFailed += 1;
        continue;
      }

      const queries = [
        `${nombre}, ${distrito}, ${provincia}, ${departamento}, Peru`,
        `${distrito}, ${provincia}, ${departamento}, Peru`,
        `${provincia}, ${departamento}, Peru`,
      ];

      let match = null;
      for (const q of queries) {
        const results = await nominatimSearch(q);
        match = pickNominatimMatch(results);
        if (match) break;
        if (geocodeDelayMs > 0) await sleep(geocodeDelayMs);
      }

      if (match) {
        await hospitalRepository.upsertCoordOverride(String(h.id), { lat: match.lat, lng: match.lng, source: "NOMINATIM" });
        geocoded += 1;
      } else {
        geocodeFailed += 1;
      }

      if ((i + 1) % 25 === 0 || i + 1 === limit) {
        process.stdout.write(`Geocoding: ${i + 1}/${limit} | ok=${geocoded} | fail=${geocodeFailed}\n`);
      }
    }
  }

  const deleteAfterImport = String(process.env.LISA_DELETE_AFTER_IMPORT || "0").trim() === "1";
  if (deleteAfterImport) {
    try {
      fs.unlinkSync(csvPath);
    } catch {
    }
  }

  process.stdout.write(
    `Importación desde DB-LISA: hospitales=${hospitalRows.length}, ofertas=${offers.length}, con_coords_csv=${withCsvCoords}, geocodificados=${geocoded}, geocode_fallidos=${geocodeFailed}.\n`,
  );
}

main().catch((e) => {
  const message = e instanceof Error ? e.message : "Error inesperado";
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
