const fs = require("fs");
const path = require("path");

const { DB_ENABLED } = require("../db");
const { HttpError } = require("../utils/httpError");
const { getEnvString } = require("../utils/env");
const hospitalRepository = require("../db/hospitalRepository");
const serumsOfferRepository = require("../db/serumsOfferRepository");
const hospitalService = require("../services/hospitalService");

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

function padIpressCode(value) {
  const raw = cleanString(value);
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  if (!digits) return raw;
  return digits.padStart(8, "0");
}

function parseIntOrNull(value) {
  const s = cleanString(value);
  if (!s) return null;
  const digits = s.replace(/[^\d-]+/g, "");
  if (!digits) return null;
  const n = Number.parseInt(digits, 10);
  return Number.isFinite(n) ? n : null;
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
  return cleanString(value)
    .toLowerCase()
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

function findHeaderRowIndex(rows) {
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] || [];
    for (const cell of row) {
      const k = normalizeKey(cell);
      if (k === "profesion" || k.startsWith("profes")) return i;
    }
  }
  return -1;
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
  throw new HttpError(500, `CSV de plazas no contiene columna requerida: ${label}`, { label, keys });
}

function readOffersCsv(csvPath) {
  if (!csvPath) return { path: null, rows: [] };
  let raw;
  try {
    raw = fs.readFileSync(csvPath, "utf8");
  } catch {
    return { path: csvPath, rows: [] };
  }
  const rows = parseDelimited(raw, ";");
  return { path: csvPath, rows };
}

async function buildHospitalCodeToId() {
  const indexRows = await serumsOfferRepository.listHospitalRenipressIndex();
  const map = new Map();
  for (const r of indexRows) {
    const code = padIpressCode(r.codigo_renipress_modular);
    if (!code) continue;
    if (!map.has(code)) map.set(code, r.id);
  }
  return map;
}

async function importOffersFromCsv({ csvPath, periodo, modalidad }) {
  const { path: resolvedPath, rows } = readOffersCsv(csvPath);
  if (!resolvedPath) return { imported: 0, skipped: 0, missingHospitals: 0, path: null, skippedFile: true };
  if (!rows.length) return { imported: 0, skipped: 0, missingHospitals: 0, path: resolvedPath, skippedFile: true };

  const headerRowIndex = findHeaderRowIndex(rows);
  if (headerRowIndex < 0) {
    throw new HttpError(500, "No se encontró encabezado de columnas en el CSV de plazas", { path: resolvedPath });
  }

  const headerRow = rows[headerRowIndex].map(cleanString);
  const headerIndex = buildHeaderIndex(headerRow);

  const idxProfesion = mustGetIndex(headerIndex, ["profesion", "profesin", "profesiona"], "PROFESION");
  const idxPlazas = mustGetIndex(headerIndex, ["nplazas", "plazas", "nplaza"], "N° PLAZAS");
  const idxCodigo = mustGetIndex(
    headerIndex,
    [
      "codigorenipressmodular",
      "cdigorenipressmodular",
      "codigorenipress",
      "cdigorenipress",
      "renipressmodular",
    ],
    "CODIGO RENIPRESS MODULAR",
  );
  const idxSede = headerIndex.get("sededeadjudicacion") ?? headerIndex.get("sededeadjudicacin");

  const idxInstitucion = headerIndex.get("institucion") ?? headerIndex.get("institucionofertante");
  const idxDepartamento = headerIndex.get("departamento");
  const idxProvincia = headerIndex.get("provincia");
  const idxDistrito = headerIndex.get("distrito");
  const idxGrado = headerIndex.get("gradodedificultad");
  const idxNombre = headerIndex.get("nombredestablecimiento");
  const idxCategoria = headerIndex.get("categoria");
  const idxPresupuesto = headerIndex.get("presupuesto");
  const idxZaf = headerIndex.get("zaf");
  const idxZe = headerIndex.get("ze");

  let codeToId = await buildHospitalCodeToId();

  await serumsOfferRepository.deleteOffersByPeriodoModalidad(periodo, modalidad);

  let imported = 0;
  let skipped = 0;
  let missingHospitals = 0;
  const aggregatedByKey = new Map();
  const missingHospitalsByCode = new Map();
  const pendingOffers = [];

  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const row = rows[i] || [];
    const profesion = idxProfesion < row.length ? cleanString(row[idxProfesion]) : "";
    const plazas = idxPlazas < row.length ? parseIntOrNull(row[idxPlazas]) : null;
    const codeRaw = idxCodigo < row.length ? row[idxCodigo] : "";
    const codigo = padIpressCode(codeRaw);
    const sede = typeof idxSede === "number" && idxSede < row.length ? cleanString(row[idxSede]) : "";

    if (!profesion || plazas == null || plazas <= 0 || !codigo) {
      skipped += 1;
      continue;
    }

    const hospitalId = codeToId.get(codigo);
    if (!hospitalId) {
      const institucion = typeof idxInstitucion === "number" && idxInstitucion < row.length ? cleanString(row[idxInstitucion]) : "";
      const departamento = typeof idxDepartamento === "number" && idxDepartamento < row.length ? cleanString(row[idxDepartamento]) : "";
      const provincia = typeof idxProvincia === "number" && idxProvincia < row.length ? cleanString(row[idxProvincia]) : "";
      const distrito = typeof idxDistrito === "number" && idxDistrito < row.length ? cleanString(row[idxDistrito]) : "";
      const grado_dificultad = typeof idxGrado === "number" && idxGrado < row.length ? cleanString(row[idxGrado]) : "";
      const nombre_establecimiento = typeof idxNombre === "number" && idxNombre < row.length ? cleanString(row[idxNombre]) : "";
      const categoria = typeof idxCategoria === "number" && idxCategoria < row.length ? cleanString(row[idxCategoria]) : "";
      const presupuesto = typeof idxPresupuesto === "number" && idxPresupuesto < row.length ? cleanString(row[idxPresupuesto]) : "";
      const zaf = typeof idxZaf === "number" && idxZaf < row.length ? cleanString(row[idxZaf]) : "";
      const ze = typeof idxZe === "number" && idxZe < row.length ? cleanString(row[idxZe]) : "";

      const existing = missingHospitalsByCode.get(codigo);
      if (existing) {
        if (!existing.institucion && institucion) existing.institucion = institucion;
        if (!existing.departamento && departamento) existing.departamento = departamento;
        if (!existing.provincia && provincia) existing.provincia = provincia;
        if (!existing.distrito && distrito) existing.distrito = distrito;
        if (!existing.grado_dificultad && grado_dificultad) existing.grado_dificultad = grado_dificultad;
        if (!existing.nombre_establecimiento && nombre_establecimiento) existing.nombre_establecimiento = nombre_establecimiento;
        if (!existing.categoria && categoria) existing.categoria = categoria;
        if (!existing.presupuesto && presupuesto) existing.presupuesto = presupuesto;
        if (!existing.zaf && zaf) existing.zaf = zaf;
        if (!existing.ze && ze) existing.ze = ze;
        existing.profesiones.add(profesion);
      } else {
        missingHospitalsByCode.set(codigo, {
          id: codigo,
          codigo_renipress_modular: codigo,
          institucion,
          departamento,
          provincia,
          distrito,
          grado_dificultad,
          nombre_establecimiento,
          presupuesto,
          categoria,
          zaf,
          ze,
          profesiones: new Set([profesion]),
        });
      }
      pendingOffers.push({ codigo, profesion, plazas, sede });
      continue;
    }

    const key = `${hospitalId}::${String(profesion).toLowerCase()}`;
    const prev = aggregatedByKey.get(key);
    if (prev) {
      prev.plazas += plazas;
      if (!prev.sede_adjudicacion && sede) prev.sede_adjudicacion = sede;
    } else {
      aggregatedByKey.set(key, {
        hospital_id: hospitalId,
        codigo_renipress_modular: codigo,
        periodo,
        modalidad,
        profesion,
        plazas,
        sede_adjudicacion: sede || null,
      });
    }
    imported += 1;
  }

  if (missingHospitalsByCode.size > 0) {
    const now = new Date().toISOString();
    const hospitalRows = [];
    for (const v of missingHospitalsByCode.values()) {
      const profs = Array.from(v.profesiones).filter(Boolean).sort((a, b) => a.localeCompare(b));
      const { lat, lng } = getCoordsForDepartment(v.departamento);
      hospitalRows.push({
        id: v.id,
        profesion: profs[0] || "",
        profesiones_json: JSON.stringify(profs),
        institucion: normalizeInstitutionLabel(v.institucion),
        departamento: v.departamento,
        provincia: v.provincia,
        distrito: v.distrito,
        grado_dificultad: v.grado_dificultad,
        codigo_renipress_modular: v.codigo_renipress_modular,
        nombre_establecimiento: v.nombre_establecimiento,
        presupuesto: v.presupuesto,
        categoria: v.categoria,
        zaf: v.zaf,
        ze: v.ze,
        imagenes_json: "[]",
        lat,
        lng,
        coordenadas_fuente: "SERUMS_CSV",
        updated_at: now,
      });
    }
    await hospitalRepository.upsertHospitals(hospitalRows);
    codeToId = await buildHospitalCodeToId();

    for (const o of pendingOffers) {
      const hospitalId = codeToId.get(o.codigo);
      if (!hospitalId) {
        missingHospitals += 1;
        continue;
      }
      const key = `${hospitalId}::${String(o.profesion).toLowerCase()}`;
      const prev = aggregatedByKey.get(key);
      if (prev) {
        prev.plazas += o.plazas;
        if (!prev.sede_adjudicacion && o.sede) prev.sede_adjudicacion = o.sede;
      } else {
        aggregatedByKey.set(key, {
          hospital_id: hospitalId,
          codigo_renipress_modular: o.codigo,
          periodo,
          modalidad,
          profesion: o.profesion,
          plazas: o.plazas,
          sede_adjudicacion: o.sede || null,
        });
      }
    }
  }

  const records = [];
  for (const v of aggregatedByKey.values()) records.push(serumsOfferRepository.buildOfferRecord(v));

  if (records.length > 0) await serumsOfferRepository.upsertOffers(records);
  return { imported, skipped, missingHospitals, path: resolvedPath, skippedFile: false };
}

async function ensureHospitalsSeeded() {
  if (!DB_ENABLED) return;
  const count = await hospitalRepository.countHospitals();
  if (count > 0) return;
  await hospitalService.importHospitalsToDb({ force: true });
}

async function main() {
  if (!DB_ENABLED) {
    process.stdout.write("DB_ENABLED=0: importación omitida.\n");
    process.exit(0);
  }

  await ensureHospitalsSeeded();

  const repoDataPath = (name) => path.resolve(__dirname, "..", "data", "serums_offers", name);

  const sources = [
    {
      periodo: "2025-I",
      modalidad: "remunerado",
      pathKey: "SERUMS_2025_I_REMUNERADO_CSV_PATH",
      defaultPath: path.resolve(__dirname, "../../../../6675608-oferta-de-plazas-serums-2025-i-remunerado(2) (1).csv"),
    },
    {
      periodo: "2025-I",
      modalidad: "equivalente",
      pathKey: "SERUMS_2025_I_EQUIVALENTE_CSV_PATH",
      defaultPath: path.resolve(__dirname, "../../../../oferta-de-plazas-serums-2025-i-equivalente.csv"),
    },
    {
      periodo: "2025-II",
      modalidad: "remunerado",
      pathKey: "SERUMS_2025_II_REMUNERADO_CSV_PATH",
      defaultPath: path.resolve(__dirname, "../../../../oferta-de-plazas-serums-2025-ii-remunerado.csv"),
    },
    {
      periodo: "2025-II",
      modalidad: "equivalente",
      pathKey: "SERUMS_2025_II_EQUIVALENTE_CSV_PATH",
      defaultPath: path.resolve(__dirname, "../../../../oferta-de-plazas-serums-2025-ii-equivalente.csv"),
    },
    {
      periodo: "2026-I",
      modalidad: "remunerado",
      pathKey: "SERUMS_2026_I_REMUNERADO_CSV_PATH",
      defaultPath: repoDataPath("2026-i-remunerado.csv"),
    },
    {
      periodo: "2026-I",
      modalidad: "equivalente",
      pathKey: "SERUMS_2026_I_EQUIVALENTE_CSV_PATH",
      defaultPath: repoDataPath("2026-i-equivalente.csv"),
    },
  ];

  for (const s of sources) {
    const configured = getEnvString(s.pathKey, "");
    const csvPath = configured && configured.trim().length > 0 ? path.resolve(configured.trim()) : s.defaultPath;
    const result = await importOffersFromCsv({ csvPath, periodo: s.periodo, modalidad: s.modalidad });
    const displayedPath = result.path || csvPath;
    process.stdout.write(
      `Plazas ${s.periodo} ${s.modalidad}: importadas=${result.imported}, omitidas=${result.skipped}, sin_hospital=${result.missingHospitals}, path=${displayedPath}\n`,
    );
  }
}

main().catch((e) => {
  const message = e instanceof Error ? e.message : "Error inesperado";
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
