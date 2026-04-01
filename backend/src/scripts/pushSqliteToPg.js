const path = require("path");
const { Client } = require("pg");

function getEnv(name, def) {
  const v = process.env[name];
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : def;
}

function openSqlite(dbPath) {
  const Database = require("better-sqlite3");
  return new Database(dbPath, { readonly: true });
}

async function connectPg() {
  const cs = getEnv("DATABASE_URL", getEnv("PG_CONNECTION_STRING", ""));
  if (!cs) {
    throw new Error("DATABASE_URL requerido para conectar a Postgres");
  }
  const client = new Client({ connectionString: cs, ssl: getEnv("PGSSLMODE", "") ? { rejectUnauthorized: false } : undefined });
  await client.connect();
  return client;
}

async function truncatePg(client) {
  await client.query("BEGIN");
  try {
    await client.query(`TRUNCATE TABLE hospital_coord_overrides RESTART IDENTITY CASCADE`);
    await client.query(`TRUNCATE TABLE serums_offers RESTART IDENTITY CASCADE`);
    await client.query(`TRUNCATE TABLE hospitals RESTART IDENTITY CASCADE`);
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  }
}

function* iterateSqlite(stmt) {
  for (const row of stmt.iterate()) yield row;
}

async function pushHospitals(sqlite, pg) {
  const cols = [
    "id",
    "profesion",
    "profesiones_json",
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
    "imagenes_json",
    "lat",
    "lng",
    "coordenadas_fuente",
    "updated_at",
  ];
  const stmt = sqlite.prepare(`SELECT ${cols.join(", ")} FROM hospitals`);
  const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
  const sql = `INSERT INTO hospitals (${cols.join(", ")}) VALUES (${placeholders})`;
  let n = 0;
  await pg.query("BEGIN");
  try {
    for (const r of iterateSqlite(stmt)) {
      const values = cols.map((c) => r[c] ?? null);
      await pg.query(sql, values);
      n++;
      if (n % 1000 === 0) process.stdout.write(`insert hospitals: ${n}\n`);
    }
    await pg.query("COMMIT");
    return n;
  } catch (e) {
    await pg.query("ROLLBACK");
    throw e;
  }
}

async function pushOffers(sqlite, pg) {
  const cols = [
    "hospital_id",
    "codigo_renipress_modular",
    "periodo",
    "modalidad",
    "profesion",
    "plazas",
    "sede_adjudicacion",
    "created_at",
    "updated_at",
  ];
  const stmt = sqlite.prepare(`SELECT ${cols.join(", ")} FROM serums_offers`);
  const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
  const sql = `INSERT INTO serums_offers (${cols.join(", ")}) VALUES (${placeholders})`;
  let n = 0;
  await pg.query("BEGIN");
  try {
    for (const r of iterateSqlite(stmt)) {
      const values = cols.map((c) => r[c] ?? null);
      await pg.query(sql, values);
      n++;
      if (n % 1000 === 0) process.stdout.write(`insert offers: ${n}\n`);
    }
    await pg.query("COMMIT");
    return n;
  } catch (e) {
    await pg.query("ROLLBACK");
    throw e;
  }
}

async function pushOverrides(sqlite, pg) {
  const cols = ["hospital_id", "lat", "lng", "source", "created_at"];
  const stmt = sqlite.prepare(`SELECT ${cols.join(", ")} FROM hospital_coord_overrides`);
  const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
  const sql = `INSERT INTO hospital_coord_overrides (${cols.join(", ")}) VALUES (${placeholders})`;
  let n = 0;
  await pg.query("BEGIN");
  try {
    for (const r of iterateSqlite(stmt)) {
      const values = cols.map((c) => r[c] ?? null);
      await pg.query(sql, values);
      n++;
      if (n % 1000 === 0) process.stdout.write(`insert overrides: ${n}\n`);
    }
    await pg.query("COMMIT");
    return n;
  } catch (e) {
    await pg.query("ROLLBACK");
    throw e;
  }
}

async function main() {
  const dbPath = getEnv("SQLITE_PATH", path.resolve(__dirname, "../../data/serums.db"));
  const sqlite = openSqlite(dbPath);
  const pg = await connectPg();
  try {
    await truncatePg(pg);
    const n1 = await pushHospitals(sqlite, pg);
    const n2 = await pushOffers(sqlite, pg);
    let n3 = 0;
    try {
      const row = sqlite.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='hospital_coord_overrides'").get();
      if (row) n3 = await pushOverrides(sqlite, pg);
    } catch {
      // ignore
    }
    process.stdout.write(`OK: hospitals=${n1}, offers=${n2}, overrides=${n3}\n`);
  } finally {
    await pg.end().catch(() => {});
    try {
      sqlite.close();
    } catch {
      // ignore
    }
  }
}

main().catch((e) => {
  const msg = e && e.message ? e.message : String(e);
  process.stderr.write(`ERROR: ${msg}\n`);
  process.exit(1);
});

