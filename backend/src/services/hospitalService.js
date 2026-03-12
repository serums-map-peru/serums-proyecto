const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { HttpError } = require("../utils/httpError");

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

  const byCode = new Map();
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0) continue;

    const codeRaw = idxCode != null && idxCode < row.length ? row[idxCode] : "";
    const code = padIpressCode(codeRaw);
    if (!code) continue;

    const norteRaw = idxNorte != null && idxNorte < row.length ? row[idxNorte] : "";
    const esteRaw = idxEste != null && idxEste < row.length ? row[idxEste] : "";
    const lat = parsePeruScaledCoord(norteRaw, "lat");
    const lng = parsePeruScaledCoord(esteRaw, "lon");

    const images = [];
    const img1 = idxImg1 != null && idxImg1 < row.length ? cleanString(row[idxImg1]) : "";
    const img2 = idxImg2 != null && idxImg2 < row.length ? cleanString(row[idxImg2]) : "";
    const img3 = idxImg3 != null && idxImg3 < row.length ? cleanString(row[idxImg3]) : "";
    if (img1) images.push(img1);
    if (img2) images.push(img2);
    if (img3) images.push(img3);

    const existing = byCode.get(code);
    if (existing) {
      if (existing.lat == null && lat != null) existing.lat = lat;
      if (existing.lng == null && lng != null) existing.lng = lng;
      if ((!existing.imagenes || existing.imagenes.length === 0) && images.length > 0) {
        existing.imagenes = images;
      }
    } else {
      byCode.set(code, {
        lat,
        lng,
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

function loadHospitalsFromCsv() {
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
    const baseId =
      codigo && codigo.length > 0
        ? codigo
        : hashId(
            JSON.stringify({
              nombre_establecimiento: record.nombre_establecimiento,
              institucion: record.institucion,
              departamento: record.departamento,
              provincia: record.provincia,
              distrito: record.distrito,
            }),
          );

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

      if (renipress && renipress.lat != null && renipress.lng != null) {
        agg.lat = renipress.lat;
        agg.lng = renipress.lng;
        agg.coordenadas_fuente = "RENIPRESS";
      } else if (lat != null && lon != null) {
        agg.lat = lat;
        agg.lng = lon;
        agg.coordenadas_fuente = "CSV";
      } else {
        const coords = getCoordsForDepartment(record.departamento);
        agg.lat = coords.lat;
        agg.lng = coords.lng;
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
      if (agg.coordenadas_fuente !== "RENIPRESS" && renipress && renipress.lat != null && renipress.lng != null) {
        agg.lat = renipress.lat;
        agg.lng = renipress.lng;
        agg.coordenadas_fuente = "RENIPRESS";
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

  for (const agg of aggregations.values()) {
    const profs = Array.isArray(agg.profesiones) ? agg.profesiones.filter(Boolean) : [];
    profs.sort((a, b) => a.localeCompare(b));
    agg.profesiones = profs;
    agg.profesion = profs.length > 0 ? profs[0] : cleanString(agg.profesion);
    records.push(agg);
    byId.set(agg.id, agg);
  }

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

function matchesFilter(fieldValue, filterValue) {
  if (!filterValue) return true;
  if (Array.isArray(fieldValue)) {
    return fieldValue.some((v) => normalize(v) === normalize(filterValue));
  }
  return normalize(fieldValue) === normalize(filterValue);
}

async function listHospitals(filters) {
  const store = loadHospitalsFromCsv();

  const profesion = cleanString(filters.profesion);
  const institucion = cleanString(filters.institucion);
  const departamento = cleanString(filters.departamento);
  const provincia = cleanString(filters.provincia);
  const distrito = cleanString(filters.distrito);
  const grado_dificultad = cleanString(filters.grado_dificultad);
  const categoria = cleanString(filters.categoria);
  const zaf = cleanString(filters.zaf);
  const ze = cleanString(filters.ze);

  return store.records.filter((h) => {
    if (!matchesFilter(h.profesion, profesion)) return false;
    if (!matchesFilter(h.institucion, institucion)) return false;
    if (!matchesFilter(h.departamento, departamento)) return false;
    if (!matchesFilter(h.provincia, provincia)) return false;
    if (!matchesFilter(h.distrito, distrito)) return false;
    if (!matchesFilter(h.grado_dificultad, grado_dificultad)) return false;
    if (!matchesFilter(h.categoria, categoria)) return false;
    if (!matchesFilter(h.zaf, zaf)) return false;
    if (!matchesFilter(h.ze, ze)) return false;
    return true;
  });
}

async function getHospitalById(id) {
  const store = loadHospitalsFromCsv();
  const hospital = store.byId.get(String(id));
  if (!hospital) throw new HttpError(404, "Hospital no encontrado");
  return hospital;
}

module.exports = { listHospitals, getHospitalById };
