const crypto = require("crypto");

const { queryAll, queryOne, execute } = require("./index");

function nowIso() {
  return new Date().toISOString();
}

function generateId() {
  return crypto.randomBytes(16).toString("hex");
}

function safeJsonParse(value) {
  if (value == null) return null;
  if (typeof value !== "string") return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function normalizeFavoriteRow(row) {
  if (!row) return null;
  const item_type = String(row.item_type || "").toLowerCase();
  const item_id = String(row.item_id || "");
  const created_at = row.created_at ? String(row.created_at) : null;

  const base = {
    id: String(row.id),
    item_type,
    item_id,
    name: row.name != null ? String(row.name) : null,
    lat: row.lat != null ? Number(row.lat) : null,
    lon: row.lon != null ? Number(row.lon) : null,
    meta: safeJsonParse(row.meta_json),
    created_at,
  };

  if (row.h_id) {
    return {
      ...base,
      hospital: {
        id: String(row.h_id),
        profesion: row.h_profesion ? String(row.h_profesion) : "",
        institucion: row.h_institucion ? String(row.h_institucion) : "",
        departamento: row.h_departamento ? String(row.h_departamento) : "",
        provincia: row.h_provincia ? String(row.h_provincia) : "",
        distrito: row.h_distrito ? String(row.h_distrito) : "",
        grado_dificultad: row.h_grado_dificultad ? String(row.h_grado_dificultad) : "",
        codigo_renipress_modular: row.h_codigo_renipress_modular ? String(row.h_codigo_renipress_modular) : "",
        nombre_establecimiento: row.h_nombre_establecimiento ? String(row.h_nombre_establecimiento) : "",
        categoria: row.h_categoria ? String(row.h_categoria) : "",
        zaf: row.h_zaf ? String(row.h_zaf) : "",
        ze: row.h_ze ? String(row.h_ze) : "",
        lat: row.h_lat != null ? Number(row.h_lat) : null,
        lng: row.h_lng != null ? Number(row.h_lng) : null,
      },
    };
  }

  return base;
}

async function upsertFavorite({
  userId,
  item_type,
  item_id,
  name = null,
  lat = null,
  lon = null,
  meta = null,
}) {
  const id = generateId();
  const created_at = nowIso();
  const meta_json = meta != null ? JSON.stringify(meta) : null;

  await execute(
    `INSERT INTO favorites (id, user_id, item_type, item_id, name, lat, lon, meta_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (user_id, item_type, item_id) DO UPDATE SET
       name = excluded.name,
       lat = excluded.lat,
       lon = excluded.lon,
       meta_json = excluded.meta_json`,
    [
      String(id),
      String(userId),
      String(item_type),
      String(item_id),
      name != null ? String(name) : null,
      lat != null ? Number(lat) : null,
      lon != null ? Number(lon) : null,
      meta_json,
      created_at,
    ],
  );

  return getFavorite({ userId, item_type, item_id });
}

async function getFavorite({ userId, item_type, item_id }) {
  const row = await queryOne(
    `SELECT id, item_type, item_id, name, lat, lon, meta_json, created_at
     FROM favorites
     WHERE user_id = ? AND item_type = ? AND item_id = ?
     LIMIT 1`,
    [String(userId), String(item_type), String(item_id)],
  );
  return normalizeFavoriteRow(row);
}

async function listFavorites({ userId, limit = 200 }) {
  const n = Number.isFinite(limit) ? Math.max(1, Math.min(500, Math.round(limit))) : 200;
  const rows = await queryAll(
    `SELECT
        f.id,
        f.item_type,
        f.item_id,
        f.name,
        f.lat,
        f.lon,
        f.meta_json,
        f.created_at,
        h.id AS h_id,
        h.profesion AS h_profesion,
        h.institucion AS h_institucion,
        h.departamento AS h_departamento,
        h.provincia AS h_provincia,
        h.distrito AS h_distrito,
        h.grado_dificultad AS h_grado_dificultad,
        h.codigo_renipress_modular AS h_codigo_renipress_modular,
        h.nombre_establecimiento AS h_nombre_establecimiento,
        h.categoria AS h_categoria,
        h.zaf AS h_zaf,
        h.ze AS h_ze,
        h.lat AS h_lat,
        h.lng AS h_lng
     FROM favorites f
     LEFT JOIN hospitals h
       ON (f.item_type = 'hospital' AND h.id = f.item_id)
     WHERE f.user_id = ?
     ORDER BY f.created_at DESC
     LIMIT ?`,
    [String(userId), n],
  );
  return rows.map(normalizeFavoriteRow).filter(Boolean);
}

async function deleteFavorite({ userId, item_type, item_id }) {
  const r = await execute("DELETE FROM favorites WHERE user_id = ? AND item_type = ? AND item_id = ?", [
    String(userId),
    String(item_type),
    String(item_id),
  ]);
  return (r && r.rowCount) > 0;
}

module.exports = { upsertFavorite, getFavorite, listFavorites, deleteFavorite };
