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

  const codeToId = await buildHospitalCodeToId();

  await serumsOfferRepository.deleteOffersByPeriodoModalidad(periodo, modalidad);

  let imported = 0;
  let skipped = 0;
  let missingHospitals = 0;
  const records = [];

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
      missingHospitals += 1;
      continue;
    }

    records.push(
      serumsOfferRepository.buildOfferRecord({
        hospital_id: hospitalId,
        codigo_renipress_modular: codigo,
        periodo,
        modalidad,
        profesion,
        plazas,
        sede_adjudicacion: sede || null,
      }),
    );
    imported += 1;
  }

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
