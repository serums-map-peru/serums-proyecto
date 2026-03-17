const fs = require("fs");
const path = require("path");

const { getEnvNumber, getEnvString } = require("../utils/env");

const DB_ENABLED = getEnvNumber("DB_ENABLED", 1) !== 0;
const DB_PATH = path.resolve(getEnvString("DB_PATH", path.resolve(__dirname, "../data/serums.sqlite")));

let dbInstance = null;

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

    CREATE INDEX IF NOT EXISTS idx_hospitals_departamento ON hospitals(departamento);
    CREATE INDEX IF NOT EXISTS idx_hospitals_provincia ON hospitals(provincia);
    CREATE INDEX IF NOT EXISTS idx_hospitals_distrito ON hospitals(distrito);
    CREATE INDEX IF NOT EXISTS idx_hospitals_institucion ON hospitals(institucion);
    CREATE INDEX IF NOT EXISTS idx_hospitals_categoria ON hospitals(categoria);
    CREATE INDEX IF NOT EXISTS idx_hospitals_grado ON hospitals(grado_dificultad);
    CREATE INDEX IF NOT EXISTS idx_email_verifications_expires ON email_verifications(expires_at);
  `);

  ensureColumn(db, "users", "email_verified INTEGER NOT NULL DEFAULT 0", "email_verified");
  ensureColumn(db, "users", "email_verified_at TEXT", "email_verified_at");
}

function getDb() {
  if (!DB_ENABLED) return null;
  if (dbInstance) return dbInstance;

  const Database = require("better-sqlite3");
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  initSchema(db);
  dbInstance = db;
  return dbInstance;
}

module.exports = { getDb, DB_ENABLED, DB_PATH };
