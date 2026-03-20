const fs = require("fs");
const path = require("path");

const { getEnvNumber, getEnvString } = require("../utils/env");

const DB_ENABLED = getEnvNumber("DB_ENABLED", 1) !== 0;
const DB_PATH = path.resolve(getEnvString("DB_PATH", path.resolve(__dirname, "../data/serums.db")));
const DB_JOURNAL_MODE = getEnvString("DB_JOURNAL_MODE", "DELETE");
const DB_DRIVER_RAW = getEnvString("DB_DRIVER", "");
const DATABASE_URL = getEnvString("DATABASE_URL", "");
const PG_CONNECTION_STRING = getEnvString("PG_CONNECTION_STRING", DATABASE_URL);
const DB_DRIVER =
  (DB_DRIVER_RAW && DB_DRIVER_RAW.trim().toLowerCase()) ||
  (PG_CONNECTION_STRING && PG_CONNECTION_STRING.trim().length > 0 ? "postgres" : "sqlite");

let dbInstance = null;
let schemaReadyPromise = null;

function toPgSql(sql) {
  let i = 0;
  return String(sql).replace(/\?/g, () => `$${(i += 1)}`);
}

function ensureDbFileExists() {
  if (!DB_ENABLED) return;
  if (fs.existsSync(DB_PATH)) return;

  const seedPath = path.resolve(__dirname, "../data/serums.db");
  if (!fs.existsSync(seedPath)) return;

  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.copyFileSync(seedPath, DB_PATH);
}

function getBundledSqliteSeedPath() {
  return path.resolve(__dirname, "../data/serums.db");
}

async function shouldSeedPostgresFromBundledSqlite(db) {
  const seedPath = getBundledSqliteSeedPath();
  if (!fs.existsSync(seedPath)) return false;

  const safeCount = async (table) => {
    try {
      const r = await db.query(`SELECT COUNT(*)::bigint AS n FROM ${table}`);
      const n = r && r.rows && r.rows[0] && r.rows[0].n != null ? Number(r.rows[0].n) : 0;
      return Number.isFinite(n) ? n : 0;
    } catch {
      return 0;
    }
  };

  const hospitals = await safeCount("hospitals");
  const offers = await safeCount("serums_offers");
  const overrides = await safeCount("hospital_coord_overrides");
  const users = await safeCount("users");
  const verifications = await safeCount("email_verifications");

  return hospitals === 0 && offers === 0 && overrides === 0 && users === 0 && verifications === 0;
}

async function seedPostgresFromBundledSqlite(pool) {
  const seedPath = getBundledSqliteSeedPath();
  if (!fs.existsSync(seedPath)) return { seeded: false, reason: "no_seed_file" };

  const Database = require("better-sqlite3");
  const sqlite = new Database(seedPath, { readonly: true });

  const sqliteTableExists = (name) => {
    try {
      const row = sqlite
        .prepare("SELECT 1 AS ok FROM sqlite_master WHERE type='table' AND name = ? LIMIT 1")
        .get(String(name));
      return !!(row && row.ok);
    } catch {
      return false;
    }
  };

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const insertChunk = async ({ table, columns, rows, onConflict }) => {
      if (!rows || rows.length === 0) return;
      const colsSql = columns.map((c) => `"${c}"`).join(", ");
      const values = [];
      const groups = [];
      let paramIndex = 1;
      for (const row of rows) {
        const placeholders = [];
        for (const v of row) {
          values.push(v);
          placeholders.push(`$${paramIndex++}`);
        }
        groups.push(`(${placeholders.join(", ")})`);
      }
      const sql = `INSERT INTO ${table} (${colsSql}) VALUES ${groups.join(", ")} ${onConflict}`;
      await client.query(sql, values);
    };

    const batchSizeHospitals = 200;
    const batchSizeOffers = 500;
    const batchSizeSmall = 500;

    if (sqliteTableExists("hospitals")) {
      const columns = [
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
      const onConflict = `ON CONFLICT ("id") DO UPDATE SET
        "profesion" = EXCLUDED."profesion",
        "profesiones_json" = EXCLUDED."profesiones_json",
        "institucion" = EXCLUDED."institucion",
        "departamento" = EXCLUDED."departamento",
        "provincia" = EXCLUDED."provincia",
        "distrito" = EXCLUDED."distrito",
        "grado_dificultad" = EXCLUDED."grado_dificultad",
        "codigo_renipress_modular" = EXCLUDED."codigo_renipress_modular",
        "nombre_establecimiento" = EXCLUDED."nombre_establecimiento",
        "presupuesto" = EXCLUDED."presupuesto",
        "categoria" = EXCLUDED."categoria",
        "zaf" = EXCLUDED."zaf",
        "ze" = EXCLUDED."ze",
        "imagenes_json" = EXCLUDED."imagenes_json",
        "lat" = EXCLUDED."lat",
        "lng" = EXCLUDED."lng",
        "coordenadas_fuente" = EXCLUDED."coordenadas_fuente",
        "updated_at" = EXCLUDED."updated_at"`;

      const stmt = sqlite.prepare(
        `SELECT ${columns.join(", ")} FROM hospitals`,
      );
      let batch = [];
      for (const r of stmt.iterate()) {
        batch.push(columns.map((c) => r[c] ?? null));
        if (batch.length >= batchSizeHospitals) {
          await insertChunk({ table: "hospitals", columns, rows: batch, onConflict });
          batch = [];
        }
      }
      if (batch.length) await insertChunk({ table: "hospitals", columns, rows: batch, onConflict });
    }

    if (sqliteTableExists("serums_offers")) {
      const columns = [
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
      const onConflict = `ON CONFLICT ("hospital_id", "periodo", "modalidad", "profesion") DO UPDATE SET
        "codigo_renipress_modular" = EXCLUDED."codigo_renipress_modular",
        "plazas" = EXCLUDED."plazas",
        "sede_adjudicacion" = EXCLUDED."sede_adjudicacion",
        "updated_at" = EXCLUDED."updated_at"`;

      const stmt = sqlite.prepare(
        `SELECT ${columns.join(", ")} FROM serums_offers`,
      );
      let batch = [];
      for (const r of stmt.iterate()) {
        batch.push(columns.map((c) => r[c] ?? null));
        if (batch.length >= batchSizeOffers) {
          await insertChunk({ table: "serums_offers", columns, rows: batch, onConflict });
          batch = [];
        }
      }
      if (batch.length) await insertChunk({ table: "serums_offers", columns, rows: batch, onConflict });
    }

    if (sqliteTableExists("hospital_coord_overrides")) {
      const columns = ["hospital_id", "lat", "lng", "source", "updated_at"];
      const onConflict = `ON CONFLICT ("hospital_id") DO UPDATE SET
        "lat" = EXCLUDED."lat",
        "lng" = EXCLUDED."lng",
        "source" = EXCLUDED."source",
        "updated_at" = EXCLUDED."updated_at"`;

      const stmt = sqlite.prepare(
        `SELECT ${columns.join(", ")} FROM hospital_coord_overrides`,
      );
      let batch = [];
      for (const r of stmt.iterate()) {
        batch.push(columns.map((c) => r[c] ?? null));
        if (batch.length >= batchSizeSmall) {
          await insertChunk({ table: "hospital_coord_overrides", columns, rows: batch, onConflict });
          batch = [];
        }
      }
      if (batch.length) await insertChunk({ table: "hospital_coord_overrides", columns, rows: batch, onConflict });
    }

    if (sqliteTableExists("users")) {
      const columns = ["id", "email", "password_hash", "name", "email_verified", "email_verified_at", "created_at"];
      const onConflict = `ON CONFLICT ("id") DO UPDATE SET
        "email" = EXCLUDED."email",
        "password_hash" = EXCLUDED."password_hash",
        "name" = EXCLUDED."name",
        "email_verified" = EXCLUDED."email_verified",
        "email_verified_at" = EXCLUDED."email_verified_at",
        "created_at" = EXCLUDED."created_at"`;

      const stmt = sqlite.prepare(
        `SELECT ${columns.join(", ")} FROM users`,
      );
      let batch = [];
      for (const r of stmt.iterate()) {
        const row = columns.map((c) => {
          if (c === "email_verified") {
            if (typeof r[c] === "boolean") return r[c];
            if (typeof r[c] === "number") return r[c] === 1;
            return !!r[c];
          }
          return r[c] ?? null;
        });
        batch.push(row);
        if (batch.length >= batchSizeSmall) {
          await insertChunk({ table: "users", columns, rows: batch, onConflict });
          batch = [];
        }
      }
      if (batch.length) await insertChunk({ table: "users", columns, rows: batch, onConflict });
    }

    if (sqliteTableExists("email_verifications")) {
      const columns = ["user_id", "code_hash", "expires_at", "attempts", "last_sent_at", "created_at"];
      const onConflict = `ON CONFLICT ("user_id") DO UPDATE SET
        "code_hash" = EXCLUDED."code_hash",
        "expires_at" = EXCLUDED."expires_at",
        "attempts" = EXCLUDED."attempts",
        "last_sent_at" = EXCLUDED."last_sent_at",
        "created_at" = EXCLUDED."created_at"`;

      const stmt = sqlite.prepare(
        `SELECT ${columns.join(", ")} FROM email_verifications`,
      );
      let batch = [];
      for (const r of stmt.iterate()) {
        batch.push(columns.map((c) => r[c] ?? null));
        if (batch.length >= batchSizeSmall) {
          await insertChunk({ table: "email_verifications", columns, rows: batch, onConflict });
          batch = [];
        }
      }
      if (batch.length) await insertChunk({ table: "email_verifications", columns, rows: batch, onConflict });
    }

    await client.query("COMMIT");
    return { seeded: true, reason: "seeded" };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
    sqlite.close();
  }
}

function canSafelySeedFromBundledDb(db) {
  if (!DB_ENABLED) return false;
  const seedPath = path.resolve(__dirname, "../data/serums.db");
  if (!fs.existsSync(seedPath)) return false;
  if (path.resolve(seedPath) === path.resolve(DB_PATH)) return false;

  const count = (table) => db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get()?.n ?? 0;
  const hospitals = count("hospitals");
  const offers = count("serums_offers");
  const overrides = count("hospital_coord_overrides");
  const users = count("users");

  return hospitals === 0 && offers === 0 && overrides === 0 && users === 0;
}

function columnExists(db, table, column) {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all();
  return rows.some((r) => String(r.name) === column);
}

function ensureColumn(db, table, columnDef, columnName) {
  if (columnExists(db, table, columnName)) return;
  db.exec(`ALTER TABLE ${table} ADD COLUMN ${columnDef}`);
}

function initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT,
      email_verified INTEGER NOT NULL DEFAULT 0,
      email_verified_at TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS email_verifications (
      user_id TEXT PRIMARY KEY,
      code_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      last_sent_at TEXT,
      created_at TEXT,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS hospitals (
      id TEXT PRIMARY KEY,
      profesion TEXT,
      profesiones_json TEXT,
      institucion TEXT,
      departamento TEXT,
      provincia TEXT,
      distrito TEXT,
      grado_dificultad TEXT,
      codigo_renipress_modular TEXT,
      nombre_establecimiento TEXT,
      presupuesto TEXT,
      categoria TEXT,
      zaf TEXT,
      ze TEXT,
      imagenes_json TEXT,
      lat REAL,
      lng REAL,
      coordenadas_fuente TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS hospital_coord_overrides (
      hospital_id TEXT PRIMARY KEY,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      source TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS serums_offers (
      hospital_id TEXT NOT NULL,
      codigo_renipress_modular TEXT,
      periodo TEXT NOT NULL,
      modalidad TEXT NOT NULL,
      profesion TEXT NOT NULL,
      plazas INTEGER NOT NULL DEFAULT 0,
      sede_adjudicacion TEXT,
      created_at TEXT,
      updated_at TEXT,
      PRIMARY KEY (hospital_id, periodo, modalidad, profesion),
      FOREIGN KEY(hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_hospitals_departamento ON hospitals(departamento);
    CREATE INDEX IF NOT EXISTS idx_hospitals_provincia ON hospitals(provincia);
    CREATE INDEX IF NOT EXISTS idx_hospitals_distrito ON hospitals(distrito);
    CREATE INDEX IF NOT EXISTS idx_hospitals_institucion ON hospitals(institucion);
    CREATE INDEX IF NOT EXISTS idx_hospitals_categoria ON hospitals(categoria);
    CREATE INDEX IF NOT EXISTS idx_hospitals_grado ON hospitals(grado_dificultad);
    CREATE INDEX IF NOT EXISTS idx_email_verifications_expires ON email_verifications(expires_at);
    CREATE INDEX IF NOT EXISTS idx_serums_offers_periodo ON serums_offers(periodo);
    CREATE INDEX IF NOT EXISTS idx_serums_offers_modalidad ON serums_offers(modalidad);
    CREATE INDEX IF NOT EXISTS idx_serums_offers_profesion ON serums_offers(profesion);
    CREATE INDEX IF NOT EXISTS idx_serums_offers_codigo ON serums_offers(codigo_renipress_modular);
  `);

  ensureColumn(db, "users", "email_verified INTEGER NOT NULL DEFAULT 0", "email_verified");
  ensureColumn(db, "users", "email_verified_at TEXT", "email_verified_at");
}

async function ensureSchemaReady() {
  if (!DB_ENABLED) return;
  if (schemaReadyPromise) return schemaReadyPromise;
  schemaReadyPromise = (async () => {
    if (DB_DRIVER === "postgres") {
      const db = getDb();
      if (!db) return;
      await db.query(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          name TEXT,
          email_verified BOOLEAN NOT NULL DEFAULT FALSE,
          email_verified_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ
        );
      `);
      await db.query(`
        CREATE TABLE IF NOT EXISTS email_verifications (
          user_id TEXT PRIMARY KEY,
          code_hash TEXT NOT NULL,
          expires_at TIMESTAMPTZ NOT NULL,
          attempts INTEGER NOT NULL DEFAULT 0,
          last_sent_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ,
          CONSTRAINT fk_email_verifications_user
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );
      `);
      await db.query(`
        CREATE TABLE IF NOT EXISTS hospitals (
          id TEXT PRIMARY KEY,
          profesion TEXT,
          profesiones_json TEXT,
          institucion TEXT,
          departamento TEXT,
          provincia TEXT,
          distrito TEXT,
          grado_dificultad TEXT,
          codigo_renipress_modular TEXT,
          nombre_establecimiento TEXT,
          presupuesto TEXT,
          categoria TEXT,
          zaf TEXT,
          ze TEXT,
          imagenes_json TEXT,
          lat DOUBLE PRECISION,
          lng DOUBLE PRECISION,
          coordenadas_fuente TEXT,
          updated_at TIMESTAMPTZ
        );
      `);
      await db.query(`
        CREATE TABLE IF NOT EXISTS hospital_coord_overrides (
          hospital_id TEXT PRIMARY KEY,
          lat DOUBLE PRECISION NOT NULL,
          lng DOUBLE PRECISION NOT NULL,
          source TEXT,
          updated_at TIMESTAMPTZ,
          CONSTRAINT fk_overrides_hospital
            FOREIGN KEY(hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE
        );
      `);
      await db.query(`
        CREATE TABLE IF NOT EXISTS serums_offers (
          hospital_id TEXT NOT NULL,
          codigo_renipress_modular TEXT,
          periodo TEXT NOT NULL,
          modalidad TEXT NOT NULL,
          profesion TEXT NOT NULL,
          plazas INTEGER NOT NULL DEFAULT 0,
          sede_adjudicacion TEXT,
          created_at TIMESTAMPTZ,
          updated_at TIMESTAMPTZ,
          PRIMARY KEY (hospital_id, periodo, modalidad, profesion),
          CONSTRAINT fk_offers_hospital
            FOREIGN KEY(hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE
        );
      `);

      await db.query(`CREATE INDEX IF NOT EXISTS idx_hospitals_departamento ON hospitals(departamento);`);
      await db.query(`CREATE INDEX IF NOT EXISTS idx_hospitals_provincia ON hospitals(provincia);`);
      await db.query(`CREATE INDEX IF NOT EXISTS idx_hospitals_distrito ON hospitals(distrito);`);
      await db.query(`CREATE INDEX IF NOT EXISTS idx_hospitals_institucion ON hospitals(institucion);`);
      await db.query(`CREATE INDEX IF NOT EXISTS idx_hospitals_categoria ON hospitals(categoria);`);
      await db.query(`CREATE INDEX IF NOT EXISTS idx_hospitals_grado ON hospitals(grado_dificultad);`);
      await db.query(`CREATE INDEX IF NOT EXISTS idx_email_verifications_expires ON email_verifications(expires_at);`);
      await db.query(`CREATE INDEX IF NOT EXISTS idx_serums_offers_periodo ON serums_offers(periodo);`);
      await db.query(`CREATE INDEX IF NOT EXISTS idx_serums_offers_modalidad ON serums_offers(modalidad);`);
      await db.query(`CREATE INDEX IF NOT EXISTS idx_serums_offers_profesion ON serums_offers(profesion);`);
      await db.query(`CREATE INDEX IF NOT EXISTS idx_serums_offers_codigo ON serums_offers(codigo_renipress_modular);`);

      const shouldSeed = await shouldSeedPostgresFromBundledSqlite(db);
      if (shouldSeed) {
        await seedPostgresFromBundledSqlite(db);
      }
      return;
    }

    const db = getDb();
    if (!db) return;
    initSchema(db);
  })();
  return schemaReadyPromise;
}

function getDb() {
  if (!DB_ENABLED) return null;
  if (dbInstance) return dbInstance;

  if (DB_DRIVER === "postgres") {
    if (!PG_CONNECTION_STRING || PG_CONNECTION_STRING.trim().length === 0) {
      throw new Error("PG_CONNECTION_STRING/DATABASE_URL no configurado");
    }
    const { Pool } = require("pg");
    dbInstance = new Pool({ connectionString: PG_CONNECTION_STRING });
    return dbInstance;
  }

  const Database = require("better-sqlite3");
  ensureDbFileExists();
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

  const open = () => {
    const db = new Database(DB_PATH);
    db.pragma(`journal_mode = ${DB_JOURNAL_MODE}`);
    db.pragma("foreign_keys = ON");
    initSchema(db);
    return db;
  };

  let db = open();
  if (canSafelySeedFromBundledDb(db)) {
    db.close();
    const seedPath = path.resolve(__dirname, "../data/serums.db");
    fs.copyFileSync(seedPath, DB_PATH);
    db = open();
  }

  dbInstance = db;
  return db;
}

async function queryAll(sql, params = []) {
  const db = getDb();
  if (!db) return [];
  await ensureSchemaReady();
  if (DB_DRIVER === "postgres") {
    const r = await db.query(toPgSql(sql), params);
    return r.rows || [];
  }
  return db.prepare(String(sql)).all(...params);
}

async function queryOne(sql, params = []) {
  const db = getDb();
  if (!db) return null;
  await ensureSchemaReady();
  if (DB_DRIVER === "postgres") {
    const r = await db.query(toPgSql(sql), params);
    return (r.rows && r.rows[0]) || null;
  }
  return db.prepare(String(sql)).get(...params) || null;
}

async function execute(sql, params = []) {
  const db = getDb();
  if (!db) return { rowCount: 0 };
  await ensureSchemaReady();
  if (DB_DRIVER === "postgres") {
    const r = await db.query(toPgSql(sql), params);
    return { rowCount: typeof r.rowCount === "number" ? r.rowCount : 0 };
  }
  const r = db.prepare(String(sql)).run(...params);
  return { rowCount: typeof r.changes === "number" ? r.changes : 0 };
}

async function withTransaction(fn) {
  const db = getDb();
  if (!db) return await fn();
  await ensureSchemaReady();
  if (DB_DRIVER === "postgres") {
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      const result = await fn({
        queryAll: async (sql, params = []) => (await client.query(toPgSql(sql), params)).rows || [],
        queryOne: async (sql, params = []) => ((await client.query(toPgSql(sql), params)).rows || [])[0] || null,
        execute: async (sql, params = []) => {
          const r = await client.query(toPgSql(sql), params);
          return { rowCount: typeof r.rowCount === "number" ? r.rowCount : 0 };
        },
      });
      await client.query("COMMIT");
      return result;
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }
  return await fn({ queryAll, queryOne, execute });
}

module.exports = { getDb, DB_ENABLED, DB_PATH, DB_DRIVER, queryAll, queryOne, execute, withTransaction };
