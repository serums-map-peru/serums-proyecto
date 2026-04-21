const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

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
  if (!digits) return "";
  return digits.padStart(8, "0");
}

function parseIntOrZero(value) {
  const s = cleanString(value);
  if (!s) return 0;
  const digits = s.replace(/[^\d-]+/g, "");
  if (!digits) return 0;
  const n = Number.parseInt(digits, 10);
  return Number.isFinite(n) ? n : 0;
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
  throw new Error(`CSV no contiene columna requerida: ${label}`);
}

function normalizeAll(value) {
  const s = cleanString(value);
  if (!s) return null;
  const upper = s.toUpperCase();
  if (upper === "ALL" || upper === "*" || upper === "TODOS") return null;
  return s;
}

function readExpectedFromCsv(csvPath, { profesion, gd }) {
  const profesionFilter = normalizeAll(profesion);
  const gdFilter = normalizeAll(gd);

  const raw = fs.readFileSync(csvPath, "utf8");
  const rows = parseDelimited(raw, ";");
  if (!rows.length) return { offersByCode: new Map(), plazasByCode: new Map(), examplesByCode: new Map(), total: 0 };

  const headerRowIndex = findHeaderRowIndex(rows);
  if (headerRowIndex < 0) throw new Error(`No se encontró encabezado en CSV: ${csvPath}`);

  const headerRow = rows[headerRowIndex].map(cleanString);
  const headerIndex = buildHeaderIndex(headerRow);

  const idxProfesion = mustGetIndex(headerIndex, ["profesion", "profesin", "profesiona"], "PROFESION");
  const idxPlazas = mustGetIndex(headerIndex, ["nplazas", "plazas", "nplaza"], "N° PLAZAS");
  const idxGrado = mustGetIndex(headerIndex, ["gradodedificultad"], "GRADO DE DIFICULTAD");
  const idxCodigo = mustGetIndex(
    headerIndex,
    ["codigorenipressmodular", "cdigorenipressmodular", "codigorenipress", "cdigorenipress", "renipressmodular", "codigo"],
    "CODIGO RENIPRESS MODULAR",
  );

  const idxDept = headerIndex.get("departamento");
  const idxProv = headerIndex.get("provincia");
  const idxDist = headerIndex.get("distrito");
  const idxNombre = headerIndex.get("nombredestablecimiento");

  const offersByCode = new Map();
  const plazasByCode = new Map();
  const examplesByCode = new Map();
  let total = 0;

  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const row = rows[i] || [];
    const prof = idxProfesion < row.length ? cleanString(row[idxProfesion]) : "";
    const grado = idxGrado < row.length ? cleanString(row[idxGrado]) : "";
    const codigo = idxCodigo < row.length ? padIpressCode(row[idxCodigo]) : "";
    const plazas = idxPlazas < row.length ? parseIntOrZero(row[idxPlazas]) : 0;

    if (!codigo) continue;
    if (profesionFilter && prof.toLowerCase() !== profesionFilter.toLowerCase()) continue;
    if (gdFilter && grado.toUpperCase() !== gdFilter.toUpperCase()) continue;

    offersByCode.set(codigo, (offersByCode.get(codigo) || 0) + 1);
    plazasByCode.set(codigo, (plazasByCode.get(codigo) || 0) + (plazas > 0 ? plazas : 0));
    total += 1;

    if (!examplesByCode.has(codigo)) {
      const departamento = typeof idxDept === "number" && idxDept < row.length ? cleanString(row[idxDept]) : "";
      const provincia = typeof idxProv === "number" && idxProv < row.length ? cleanString(row[idxProv]) : "";
      const distrito = typeof idxDist === "number" && idxDist < row.length ? cleanString(row[idxDist]) : "";
      const nombre = typeof idxNombre === "number" && idxNombre < row.length ? cleanString(row[idxNombre]) : "";
      examplesByCode.set(codigo, { departamento, provincia, distrito, nombre });
    }
  }

  return { offersByCode, plazasByCode, examplesByCode, total };
}

function sumMapValues(m) {
  let total = 0;
  for (const v of m.values()) total += Number(v) || 0;
  return total;
}

function getDefaultCsvPath(name) {
  return path.join(__dirname, "..", "data", "serums_offers", name);
}

async function main() {
  const periodo = process.env.PERIODO || "2025-I";
  const profesion = process.env.PROFESION || "ALL";
  const gd = process.env.GD || "ALL";
  const profesionFilter = normalizeAll(profesion);
  const gdFilter = normalizeAll(gd);

  const csvEqEnv = process.env.SERUMS_2025_I_EQUIVALENTE_CSV_PATH;
  const csvRemEnv = process.env.SERUMS_2025_I_REMUNERADO_CSV_PATH;

  const csvEq = csvEqEnv && ["SKIP", "NONE"].includes(String(csvEqEnv).toUpperCase())
    ? null
    : csvEqEnv
      ? path.resolve(csvEqEnv)
      : getDefaultCsvPath("2025-i-equivalente.csv");

  const csvRem = csvRemEnv && ["SKIP", "NONE"].includes(String(csvRemEnv).toUpperCase())
    ? null
    : csvRemEnv
      ? path.resolve(csvRemEnv)
      : getDefaultCsvPath("2025-i-remunerado.csv");

  if (!csvEq && !csvRem) throw new Error("Debes proveer al menos un CSV (equivalente o remunerado). Puedes usar SKIP/NONE para omitir uno.");
  if (csvEq && !fs.existsSync(csvEq)) throw new Error(`No existe CSV equivalente: ${csvEq}`);
  if (csvRem && !fs.existsSync(csvRem)) throw new Error(`No existe CSV remunerado: ${csvRem}`);

  const eq = csvEq
    ? readExpectedFromCsv(csvEq, { profesion: profesionFilter, gd: gdFilter })
    : { offersByCode: new Map(), plazasByCode: new Map(), examplesByCode: new Map(), total: 0 };
  const rem = csvRem
    ? readExpectedFromCsv(csvRem, { profesion: profesionFilter, gd: gdFilter })
    : { offersByCode: new Map(), plazasByCode: new Map(), examplesByCode: new Map(), total: 0 };

  const expectedOffersByCode = new Map();
  const expectedPlazasByCode = new Map();
  const examplesByCode = new Map();

  for (const [code, n] of eq.offersByCode.entries()) expectedOffersByCode.set(code, (expectedOffersByCode.get(code) || 0) + n);
  for (const [code, n] of rem.offersByCode.entries()) expectedOffersByCode.set(code, (expectedOffersByCode.get(code) || 0) + n);

  for (const [code, n] of eq.plazasByCode.entries()) expectedPlazasByCode.set(code, (expectedPlazasByCode.get(code) || 0) + n);
  for (const [code, n] of rem.plazasByCode.entries()) expectedPlazasByCode.set(code, (expectedPlazasByCode.get(code) || 0) + n);

  for (const [code, ex] of eq.examplesByCode.entries()) if (!examplesByCode.has(code)) examplesByCode.set(code, ex);
  for (const [code, ex] of rem.examplesByCode.entries()) if (!examplesByCode.has(code)) examplesByCode.set(code, ex);

  const expectedOffersTotal = eq.total + rem.total;
  const expectedPlazasTotal = sumMapValues(expectedPlazasByCode);

  const baseCsvEq = process.env.SERUMS_BASE_EQUIVALENTE_CSV_PATH
    ? path.resolve(process.env.SERUMS_BASE_EQUIVALENTE_CSV_PATH)
    : null;
  const baseCsvRem = process.env.SERUMS_BASE_REMUNERADO_CSV_PATH
    ? path.resolve(process.env.SERUMS_BASE_REMUNERADO_CSV_PATH)
    : null;

  const summaryOnly = ["1", "true", "yes"].includes(String(process.env.SUMMARY_ONLY || "").toLowerCase());
  const baseListLimit = Number.isFinite(Number(process.env.BASE_LIST_LIMIT)) ? Number(process.env.BASE_LIST_LIMIT) : 200;

  let baseAddedCodes = null;

  if ((baseCsvEq && !baseCsvRem) || (!baseCsvEq && baseCsvRem)) {
    throw new Error("Para comparar base vs nuevo, debes setear ambos: SERUMS_BASE_EQUIVALENTE_CSV_PATH y SERUMS_BASE_REMUNERADO_CSV_PATH");
  }

  if (baseCsvEq && baseCsvRem) {
    if (!fs.existsSync(baseCsvEq)) throw new Error(`No existe CSV base equivalente: ${baseCsvEq}`);
    if (!fs.existsSync(baseCsvRem)) throw new Error(`No existe CSV base remunerado: ${baseCsvRem}`);

    const baseEq = readExpectedFromCsv(baseCsvEq, { profesion: profesionFilter, gd: gdFilter });
    const baseRem = readExpectedFromCsv(baseCsvRem, { profesion: profesionFilter, gd: gdFilter });

    const baseOffersByCode = new Map();
    const basePlazasByCode = new Map();
    const baseExamplesByCode = new Map();

    for (const [code, n] of baseEq.offersByCode.entries()) baseOffersByCode.set(code, (baseOffersByCode.get(code) || 0) + n);
    for (const [code, n] of baseRem.offersByCode.entries()) baseOffersByCode.set(code, (baseOffersByCode.get(code) || 0) + n);

    for (const [code, n] of baseEq.plazasByCode.entries()) basePlazasByCode.set(code, (basePlazasByCode.get(code) || 0) + n);
    for (const [code, n] of baseRem.plazasByCode.entries()) basePlazasByCode.set(code, (basePlazasByCode.get(code) || 0) + n);

    for (const [code, ex] of baseEq.examplesByCode.entries()) if (!baseExamplesByCode.has(code)) baseExamplesByCode.set(code, ex);
    for (const [code, ex] of baseRem.examplesByCode.entries()) if (!baseExamplesByCode.has(code)) baseExamplesByCode.set(code, ex);

    const baseOffersTotal = baseEq.total + baseRem.total;
    const basePlazasTotal = sumMapValues(basePlazasByCode);

    const baseCodes = new Set(baseOffersByCode.keys());
    const newCodes = new Set(expectedOffersByCode.keys());

    const added = [];
    const removed = [];
    const changed = [];

    for (const code of newCodes) {
      if (!baseCodes.has(code)) {
        added.push({
          code,
          ofertas: expectedOffersByCode.get(code) || 0,
          plazas: expectedPlazasByCode.get(code) || 0,
          ex: examplesByCode.get(code) || null,
        });
        continue;
      }
      const baseOf = baseOffersByCode.get(code) || 0;
      const basePl = basePlazasByCode.get(code) || 0;
      const nowOf = expectedOffersByCode.get(code) || 0;
      const nowPl = expectedPlazasByCode.get(code) || 0;
      const dOf = nowOf - baseOf;
      const dPl = nowPl - basePl;
      if (dOf !== 0 || dPl !== 0) {
        changed.push({
          code,
          delta_ofertas: dOf,
          delta_plazas: dPl,
          base_ofertas: baseOf,
          base_plazas: basePl,
          nuevo_ofertas: nowOf,
          nuevo_plazas: nowPl,
          ex: examplesByCode.get(code) || baseExamplesByCode.get(code) || null,
        });
      }
    }

    for (const code of baseCodes) {
      if (newCodes.has(code)) continue;
      removed.push({
        code,
        ofertas: baseOffersByCode.get(code) || 0,
        plazas: basePlazasByCode.get(code) || 0,
        ex: baseExamplesByCode.get(code) || null,
      });
    }

    added.sort((a, b) => b.plazas - a.plazas || b.ofertas - a.ofertas || a.code.localeCompare(b.code));
    removed.sort((a, b) => b.plazas - a.plazas || b.ofertas - a.ofertas || a.code.localeCompare(b.code));
    changed.sort(
      (a, b) =>
        Math.abs(b.delta_plazas) - Math.abs(a.delta_plazas) || Math.abs(b.delta_ofertas) - Math.abs(a.delta_ofertas) || a.code.localeCompare(b.code),
    );

    baseAddedCodes = added.map((a) => a.code);

    process.stdout.write(`\nComparacion CSV (base -> nuevo)\n`);
    process.stdout.write(`Base ofertas filas: ${baseOffersTotal} | Base plazas: ${basePlazasTotal} | Base codigos: ${baseOffersByCode.size}\n`);
    process.stdout.write(`Nuevo ofertas filas: ${expectedOffersTotal} | Nuevo plazas: ${expectedPlazasTotal} | Nuevo codigos: ${expectedOffersByCode.size}\n`);
    process.stdout.write(`Codigos nuevos: ${added.length} | Codigos removidos: ${removed.length} | Codigos con cambios: ${changed.length}\n\n`);

    if (!summaryOnly && baseListLimit > 0) {
      for (const a of added.slice(0, baseListLimit)) {
        const loc = a.ex ? `${a.ex.departamento} | ${a.ex.provincia} | ${a.ex.distrito}` : "";
        const nom = a.ex ? a.ex.nombre : "";
        process.stdout.write(`+ ${a.code} plazas=${a.plazas} filas=${a.ofertas} ${loc} ${nom}\n`);
      }
      if (added.length > baseListLimit) process.stdout.write(`... (${added.length - baseListLimit} codigos nuevos mas)\n`);

      for (const r of removed.slice(0, baseListLimit)) {
        const loc = r.ex ? `${r.ex.departamento} | ${r.ex.provincia} | ${r.ex.distrito}` : "";
        const nom = r.ex ? r.ex.nombre : "";
        process.stdout.write(`- ${r.code} plazas=${r.plazas} filas=${r.ofertas} ${loc} ${nom}\n`);
      }
      if (removed.length > baseListLimit) process.stdout.write(`... (${removed.length - baseListLimit} codigos removidos mas)\n`);

      for (const c of changed.slice(0, baseListLimit)) {
        const loc = c.ex ? `${c.ex.departamento} | ${c.ex.provincia} | ${c.ex.distrito}` : "";
        const nom = c.ex ? c.ex.nombre : "";
        process.stdout.write(
          `~ ${c.code} dPl=${c.delta_plazas} dFilas=${c.delta_ofertas} base(pl=${c.base_plazas},filas=${c.base_ofertas}) nuevo(pl=${c.nuevo_plazas},filas=${c.nuevo_ofertas}) ${loc} ${nom}\n`,
        );
      }
      if (changed.length > baseListLimit) process.stdout.write(`... (${changed.length - baseListLimit} codigos con cambios mas)\n`);

      process.stdout.write("\n");
    }
  }

  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Falta DATABASE_URL en el entorno.");

  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();

  if (baseAddedCodes && baseAddedCodes.length > 0) {
    const existing = await client.query(
      `
        SELECT DISTINCT LPAD(regexp_replace(codigo_renipress_modular::text, '[^0-9]', '', 'g'), 8, '0') AS code
        FROM hospitals
        WHERE codigo_renipress_modular IS NOT NULL
          AND LPAD(regexp_replace(codigo_renipress_modular::text, '[^0-9]', '', 'g'), 8, '0') = ANY($1::text[])
      `,
      [baseAddedCodes],
    );
    const have = new Set(existing.rows.map((r) => String(r.code)));
    const missingCount = baseAddedCodes.length - have.size;
    process.stdout.write(`Puntos nuevos (vs base) que faltan agregar en hospitals: ${missingCount}\n\n`);
  }

  const where = [
    "o.periodo::text ILIKE $1::text",
    "h.codigo_renipress_modular IS NOT NULL",
    "LENGTH(TRIM(h.codigo_renipress_modular::text)) > 0",
  ];
  const params = [periodo];
  if (profesionFilter) {
    where.push(`o.profesion::text ILIKE $${params.length + 1}::text`);
    params.push(profesionFilter);
  }
  if (gdFilter) {
    where.push(`h.grado_dificultad::text ILIKE $${params.length + 1}::text`);
    params.push(gdFilter);
  }

  const have = await client.query(
    `
      SELECT
        LPAD(regexp_replace(h.codigo_renipress_modular::text, '[^0-9]', '', 'g'), 8, '0') AS code,
        COUNT(*) AS ofertas,
        COALESCE(SUM(o.plazas),0) AS plazas
      FROM serums_offers o
      JOIN hospitals h ON h.id = o.hospital_id
      WHERE ${where.join("\n        AND ")}
      GROUP BY 1
    `,
    params,
  );

  const haveOffersByCode = new Map();
  const havePlazasByCode = new Map();
  for (const r of have.rows) {
    const code = String(r.code || "").trim();
    if (!code) continue;
    haveOffersByCode.set(code, Number(r.ofertas) || 0);
    havePlazasByCode.set(code, Number(r.plazas) || 0);
  }

  const missing = [];
  for (const [code, expOffers] of expectedOffersByCode.entries()) {
    const haveOffers = haveOffersByCode.get(code) || 0;
    if (haveOffers < expOffers) {
      const expPlazas = expectedPlazasByCode.get(code) || 0;
      const havePlazas = havePlazasByCode.get(code) || 0;
      missing.push({
        code,
        faltan_ofertas: expOffers - haveOffers,
        esperado_ofertas: expOffers,
        cargado_ofertas: haveOffers,
        esperado_plazas: expPlazas,
        cargado_plazas: havePlazas,
        ex: examplesByCode.get(code) || null,
      });
    }
  }

  missing.sort((a, b) => b.faltan_ofertas - a.faltan_ofertas || a.code.localeCompare(b.code));

  const haveOffersTotal = sumMapValues(haveOffersByCode);
  const havePlazasTotal = sumMapValues(havePlazasByCode);

  process.stdout.write(`Periodo=${periodo} Profesion=${profesionFilter || "ALL"} GD=${gdFilter || "ALL"}\n`);
  process.stdout.write(`CSV esperado (ofertas): ${expectedOffersTotal}\n`);
  process.stdout.write(`CSV esperado (plazas):  ${expectedPlazasTotal}\n`);
  process.stdout.write(`DB cargado (ofertas):   ${haveOffersTotal}\n`);
  process.stdout.write(`DB cargado (plazas):    ${havePlazasTotal}\n`);
  process.stdout.write(`Codigos con faltantes:  ${missing.length}\n\n`);

  const codesMissing = missing.map((m) => m.code);
  let missingHospitalCodes = [];
  if (codesMissing.length > 0) {
    const hospitals = await client.query(
      `
        SELECT DISTINCT LPAD(regexp_replace(codigo_renipress_modular::text, '[^0-9]', '', 'g'), 8, '0') AS code
        FROM hospitals
        WHERE codigo_renipress_modular IS NOT NULL
          AND LPAD(regexp_replace(codigo_renipress_modular::text, '[^0-9]', '', 'g'), 8, '0') = ANY($1::text[])
      `,
      [codesMissing],
    );
    const haveHospitalSet = new Set(hospitals.rows.map((r) => String(r.code)));
    missingHospitalCodes = codesMissing.filter((c) => !haveHospitalSet.has(c));
  }

  for (const m of missing.slice(0, 250)) {
    const loc = m.ex ? `${m.ex.departamento} | ${m.ex.provincia} | ${m.ex.distrito}` : "";
    const nom = m.ex ? m.ex.nombre : "";
    process.stdout.write(
      `${m.code} faltan_ofertas=${m.faltan_ofertas} (exp=${m.esperado_ofertas} have=${m.cargado_ofertas}) exp_plazas=${m.esperado_plazas} have_plazas=${m.cargado_plazas} ${loc} ${nom}\n`,
    );
  }

  if (missing.length > 250) process.stdout.write(`\n... (${missing.length - 250} más)\n`);
  if (missingHospitalCodes.length > 0) {
    process.stdout.write(`\nCodigos sin hospital en DB (no se pueden importar ofertas): ${missingHospitalCodes.length}\n`);
    process.stdout.write(missingHospitalCodes.slice(0, 200).join("\n"));
    process.stdout.write("\n");
  }

  await client.end();
}

main().catch((e) => {
  process.stderr.write(`${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
});
