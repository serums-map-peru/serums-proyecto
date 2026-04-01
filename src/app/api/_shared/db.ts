import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

function dbPath() {
  const fromEnv = process.env.SERUMS_DB_PATH;
  if (fromEnv && fromEnv.trim()) return fromEnv.trim();
  return path.join(process.cwd(), "backend", "src", "data", "serums.db");
}

export function openDb() {
  const p = dbPath();
  if (!fs.existsSync(p)) return null;
  return new DatabaseSync(p);
}

export function ensureAuthSchema(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT,
      role TEXT NOT NULL DEFAULT 'user',
      email_verified INTEGER NOT NULL DEFAULT 0,
      email_verified_at TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS favorites (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      item_type TEXT NOT NULL,
      item_id TEXT NOT NULL,
      name TEXT,
      lat REAL,
      lon REAL,
      meta_json TEXT,
      created_at TEXT,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, item_type, item_id)
    );

    CREATE TABLE IF NOT EXISTS hospital_comments (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      hospital_id TEXT NOT NULL,
      comment TEXT NOT NULL,
      created_at TEXT,
      updated_at TEXT,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE,
      UNIQUE(user_id, hospital_id)
    );

    CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);
    CREATE INDEX IF NOT EXISTS idx_hospital_comments_user ON hospital_comments(user_id);
  `);
}
