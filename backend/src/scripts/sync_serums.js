const fs = require("fs");
const path = require("path");

function nowIso() {
  return new Date().toISOString();
}

function stripDiacritics(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizeHeader(value) {
  return stripDiacritics(String(value || ""))
    .replace(/\r?\n/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function normalizeValue(value) {
  return String(value || "")
    .replace(/\r?\n/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function normalizeRenipress(value) {
  const raw = String(value || "").replace(/\r?\n/g, " ").trim();
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  return digits.padStart(8, "0");
}

function parseIntSafe(value) {
  if (typeof value === "number") return Number.isFinite(value) ? Math.trunc(value) : 0;
  const s = String(value || "").replace(/\r?\n/g, " ").trim();
  const digits = s.replace(/[^\d-]/g, "");
  const n = Number(digits);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

function parseSemicolonCsvWithQuotes(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < raw.length; i += 1) {
    const ch = raw[i];

    if (inQuotes) {
      if (ch === '"') {
        const next = raw[i + 1];
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

    if (ch === ";") {
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

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

function readTabularFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".csv") return parseSemicolonCsvWithQuotes(filePath);

  let XLSX;
  try {
    XLSX = require("xlsx");
  } catch {
    throw new Error(`Falta dependencia 'xlsx'. Instala con: npm i xlsx (archivo: ${filePath})`);
  }

  const wb = XLSX.readFile(filePath, { cellDates: false });
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: "" });
}

function findHeaderRowIndex(rows) {
  const required = ["CODIGO RENIPRESS", "PROFESION", "PLAZAS", "SEDE DE ADJUDICACION"];

  const maxScan = Math.min(rows.length, 50);
  for (let i = 0; i < maxScan; i += 1) {
    const row = rows[i] || [];
    const normalizedCells = row.map((c) => normalizeHeader(c));
    const joined = normalizedCells.join(" | ");

    let hits = 0;
    if (/CODIGO\s+RENIPRESS/.test(joined)) hits += 1;
    if (/\bPROFESION\b/.test(joined)) hits += 1;
    if (/(N[°º]?\s*)?PLAZAS/.test(joined)) hits += 1;
    if (/SEDE\s+DE\s+ADJUDICACION/.test(joined)) hits += 1;

    if (hits >= 3) return i;

    const hasAll = required.every((r) => joined.includes(r));
    if (hasAll) return i;
  }
  return -1;
}

function getColumnIndexes(headerRow) {
  const cells = (headerRow || []).map((c) => normalizeHeader(c));
  const col = { renipress: -1, profesion: -1, plazas: -1, sede: -1 };

  for (let i = 0; i < cells.length; i += 1) {
    const v = cells[i];
    if (col.renipress === -1 && /CODIGO\s+RENIPRESS/.test(v)) col.renipress = i;
    if (col.profesion === -1 && /\bPROFESION\b/.test(v)) col.profesion = i;
    if (col.plazas === -1 && /(N[°º]?\s*)?PLAZAS/.test(v)) col.plazas = i;
    if (col.sede === -1 && /SEDE\s+DE\s+ADJUDICACION/.test(v)) col.sede = i;
  }

  return col;
}

function makeKey({ renipress, profesion, modalidad }) {
  return `${renipress}__${profesion}__${modalidad}`;
}

function readOffersFromFile({ filePath, modalidad }) {
  const rows = readTabularFile(filePath);
  const headerIdx = findHeaderRowIndex(rows);
  if (headerIdx === -1) {
    throw new Error(`No se encontró encabezado en ${filePath}`);
  }

  const col = getColumnIndexes(rows[headerIdx]);
  if (col.renipress === -1 || col.profesion === -1 || col.plazas === -1 || col.sede === -1) {
    throw new Error(`Encabezados incompletos en ${filePath}`);
  }

  const byKey = new Map();
  for (let i = headerIdx + 1; i < rows.length; i += 1) {
    const r = rows[i] || [];
    const renipress = normalizeRenipress(r[col.renipress]);
    const profesion = normalizeValue(r[col.profesion]);
    const sede = normalizeValue(r[col.sede]);
    const plazas = parseIntSafe(r[col.plazas]);

    if (!renipress || !profesion || plazas <= 0) continue;

    const key = makeKey({ renipress, profesion, modalidad });
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, { renipress, profesion, modalidad, plazas, sede });
      continue;
    }

    existing.plazas += plazas;
    if (!existing.sede && sede) existing.sede = sede;
  }

  return Array.from(byKey.values());
}

async function ensureActivoColumn(client) {
  await client.query(`ALTER TABLE serums_offers ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true`);
  await client.query(`UPDATE serums_offers SET activo = true WHERE activo IS NULL`);
}

async function loadHospitalIdByRenipress(client, renipressCodes) {
  const codes = Array.from(new Set(renipressCodes)).filter(Boolean);
  if (codes.length === 0) return new Map();

  const res = await client.query(
    `SELECT id, codigo_renipress_modular FROM hospitals WHERE codigo_renipress_modular = ANY($1::text[])`,
    [codes],
  );

  const map = new Map();
  for (const r of res.rows) {
    if (!r || !r.codigo_renipress_modular || !r.id) continue;
    map.set(String(r.codigo_renipress_modular), String(r.id));
  }
  return map;
}

async function loadExistingOffers(client, { periodo, modalidades }) {
  const res = await client.query(
    `
      SELECT hospital_id, codigo_renipress_modular, periodo, modalidad, profesion, plazas, sede_adjudicacion, activo
      FROM serums_offers
      WHERE periodo = $1 AND modalidad = ANY($2::text[])
    `,
    [periodo, modalidades],
  );

  const byKey = new Map();
  for (const r of res.rows) {
    const renipress = normalizeRenipress(r.codigo_renipress_modular);
    const profesion = normalizeValue(r.profesion);
    const modalidad = normalizeValue(r.modalidad);
    const key = makeKey({ renipress, profesion, modalidad });
    byKey.set(key, {
      hospitalId: String(r.hospital_id),
      renipress,
      profesion,
      modalidad,
      plazas: typeof r.plazas === "number" ? r.plazas : Number(r.plazas) || 0,
      sede: normalizeValue(r.sede_adjudicacion),
      activo: r.activo !== false,
    });
  }
  return byKey;
}

async function syncSerumsOffers({
  databaseUrl,
  periodo,
  files,
  preview,
  parseOnlyIfNoDb,
}) {
  const modalidades = Array.from(new Set(files.map((f) => normalizeValue(f.modalidad))));
  const allOffers = files.flatMap((f) => readOffersFromFile(f));

  const uniqueKeyCount = new Set(allOffers.map((o) => makeKey(o))).size;
  process.stdout.write(
    `Archivos: filas_agrupadas=${uniqueKeyCount}, modalidades=${modalidades.join(", ")}, periodo=${periodo}\n`,
  );

  if (!databaseUrl) {
    if (preview && parseOnlyIfNoDb) {
      process.stdout.write("DATABASE_URL no configurado: preview solo de parseo (sin BD).\n");
      return { inserted: 0, updated: 0, hidden: 0, previewOnly: true };
    }
    throw new Error("DATABASE_URL no está configurado en process.env");
  }

  let Client;
  try {
    ({ Client } = require("pg"));
  } catch {
    throw new Error("Falta dependencia 'pg'. Instala con: npm i pg");
  }

  const client = new Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();

  let inserted = 0;
  let updated = 0;
  let hidden = 0;

  try {
    await client.query("BEGIN");
    await ensureActivoColumn(client);

    const renipressCodes = allOffers.map((o) => o.renipress);
    const hospitalIdByRenipress = await loadHospitalIdByRenipress(client, renipressCodes);

    const desiredByKey = new Map();
    for (const o of allOffers) {
      const hospitalId = hospitalIdByRenipress.get(o.renipress);
      if (!hospitalId) {
        process.stderr.write(
          `WARN: Renipress sin hospital: codigo_renipress_modular=${o.renipress}, profesion=${o.profesion}, modalidad=${o.modalidad}\n`,
        );
        continue;
      }

      const key = makeKey(o);
      desiredByKey.set(key, { ...o, hospitalId });
    }

    const existingByKey = await loadExistingOffers(client, { periodo, modalidades });

    for (const [key, desired] of desiredByKey.entries()) {
      const existing = existingByKey.get(key);
      if (!existing) {
        await client.query(
          `
            INSERT INTO serums_offers (
              hospital_id,
              codigo_renipress_modular,
              periodo,
              modalidad,
              profesion,
              plazas,
              sede_adjudicacion,
              activo,
              created_at,
              updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8, $8)
          `,
          [
            desired.hospitalId,
            desired.renipress,
            periodo,
            desired.modalidad,
            desired.profesion,
            desired.plazas,
            desired.sede || null,
            nowIso(),
          ],
        );
        inserted += 1;
        continue;
      }

      const plazasChanged = existing.plazas !== desired.plazas;
      const sedeChanged = normalizeValue(existing.sede) !== normalizeValue(desired.sede);
      const wasInactive = existing.activo === false;

      if (plazasChanged || wasInactive || sedeChanged) {
        await client.query(
          `
            UPDATE serums_offers
            SET plazas = $1,
                sede_adjudicacion = $2,
                activo = true,
                updated_at = $3
            WHERE periodo = $4
              AND modalidad = $5
              AND codigo_renipress_modular = $6
              AND profesion = $7
          `,
          [
            desired.plazas,
            desired.sede || null,
            nowIso(),
            periodo,
            desired.modalidad,
            desired.renipress,
            desired.profesion,
          ],
        );
        updated += 1;
      }
    }

    for (const [key, existing] of existingByKey.entries()) {
      if (desiredByKey.has(key)) continue;
      if (existing.activo === false) continue;
      await client.query(
        `
          UPDATE serums_offers
          SET activo = false,
              updated_at = $1
          WHERE periodo = $2
            AND modalidad = $3
            AND codigo_renipress_modular = $4
            AND profesion = $5
        `,
        [nowIso(), periodo, existing.modalidad, existing.renipress, existing.profesion],
      );
      hidden += 1;
    }

    if (preview) {
      await client.query("ROLLBACK");
      process.stdout.write("Preview: ROLLBACK aplicado (sin cambios persistidos).\n");
    } else {
      await client.query("COMMIT");
    }

    return { inserted, updated, hidden, previewOnly: preview };
  } catch (e) {
    try {
      await client.query("ROLLBACK");
    } catch {
    }
    throw e;
  } finally {
    await client.end();
  }
}

function parseArgs(argv) {
  const args = { preview: false, periodo: "2026-I", parseOnlyIfNoDb: true };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--preview") args.preview = true;
    else if (a === "--periodo" && argv[i + 1]) {
      args.periodo = String(argv[i + 1]);
      i += 1;
    } else if (a === "--strict-db") {
      args.parseOnlyIfNoDb = false;
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv);
  const dataDir = path.resolve(__dirname, "../data/serums_offers");

  const remuneradoPath = path.resolve(dataDir, "2026-i-remunerado.csv");
  const equivalentePath = path.resolve(dataDir, "2026-i-equivalente.csv");

  const files = [
    { filePath: remuneradoPath, modalidad: "REMUNERADA" },
    { filePath: equivalentePath, modalidad: "EQUIVALENTE" },
  ];

  for (const f of files) {
    if (!fs.existsSync(f.filePath)) {
      throw new Error(`No existe el archivo: ${f.filePath}`);
    }
  }

  const result = await syncSerumsOffers({
    databaseUrl: process.env.DATABASE_URL,
    periodo: args.periodo,
    files,
    preview: args.preview,
    parseOnlyIfNoDb: args.parseOnlyIfNoDb,
  });

  process.stdout.write(
    `Resumen: insertados=${result.inserted}, actualizados=${result.updated}, ocultados=${result.hidden}\n`,
  );
}

main().catch((e) => {
  const msg = e instanceof Error ? e.message : String(e || "Error inesperado");
  process.stderr.write(`${msg}\n`);
  process.exit(1);
});
