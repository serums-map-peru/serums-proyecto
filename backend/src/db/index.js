const fs = require("fs");
const path = require("path");

const { getEnvNumber, getEnvString } = require("../utils/env");

const DB_ENABLED = getEnvNumber("DB_ENABLED", 1) !== 0;
const DB_PATH = path.resolve(getEnvString("DB_PATH", path.resolve(__dirname, "../data/serums.db")));
const DB_JOURNAL_MODE = getEnvString("DB_JOURNAL_MODE", "DELETE");

let dbInstance = null;

function ensureDbFileExists() {
  if (!DB_ENABLED) return;
  if (fs.existsSync(DB_PATH)) return;

  const seedPath = path.resolve(__dirname, "../data/serums.db");
  if (!fs.existsSync(seedPath)) return;

  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.copyFileSync(seedPath, DB_PATH);
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

function getDb() {
  if (!DB_ENABLED) return null;
  if (dbInstance) return dbInstance;

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

module.exports = { getDb, DB_ENABLED, DB_PATH };
