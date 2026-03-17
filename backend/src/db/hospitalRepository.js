const { getDb } = require("./index");

function safeJsonParse(value, fallback) {
  if (typeof value !== "string" || value.trim() === "") return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function nowIso() {
  return new Date().toISOString();
}

function countHospitals() {
  const db = getDb();
  if (!db) return 0;
  return db.prepare("SELECT COUNT(*) as c FROM hospitals").get().c || 0;
}

function upsertHospitals(records) {
  const db = getDb();
  if (!db) return;
  const stmt = db.prepare(`
    INSERT INTO hospitals (
      id, profesion, profesiones_json, institucion, departamento, provincia, distrito,
      grado_dificultad, codigo_renipress_modular, nombre_establecimiento, presupuesto,
      categoria, zaf, ze, imagenes_json, lat, lng, coordenadas_fuente, updated_at
    ) VALUES (
      @id, @profesion, @profesiones_json, @institucion, @departamento, @provincia, @distrito,
      @grado_dificultad, @codigo_renipress_modular, @nombre_establecimiento, @presupuesto,
      @categoria, @zaf, @ze, @imagenes_json, @lat, @lng, @coordenadas_fuente, @updated_at
    )
    ON CONFLICT(id) DO UPDATE SET
      profesion = excluded.profesion,
      profesiones_json = excluded.profesiones_json,
      institucion = excluded.institucion,
      departamento = excluded.departamento,
      provincia = excluded.provincia,
      distrito = excluded.distrito,
      grado_dificultad = excluded.grado_dificultad,
      codigo_renipress_modular = excluded.codigo_renipress_modular,
      nombre_establecimiento = excluded.nombre_establecimiento,
      presupuesto = excluded.presupuesto,
      categoria = excluded.categoria,
      zaf = excluded.zaf,
      ze = excluded.ze,
      imagenes_json = excluded.imagenes_json,
      lat = excluded.lat,
      lng = excluded.lng,
      coordenadas_fuente = excluded.coordenadas_fuente,
      updated_at = excluded.updated_at
  `);

  const tx = db.transaction((rows) => {
    for (const r of rows) stmt.run(r);
  });
  tx(records);
}

function upsertCoordOverride(hospitalId, { lat, lng, source }) {
  const db = getDb();
  if (!db) return;
  db.prepare(`
    INSERT INTO hospital_coord_overrides (hospital_id, lat, lng, source, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(hospital_id) DO UPDATE SET
      lat = excluded.lat,
      lng = excluded.lng,
      source = excluded.source,
      updated_at = excluded.updated_at
  `).run(String(hospitalId), lat, lng, source || "OVERRIDE", nowIso());
}

function listCoordOverridesById() {
  const db = getDb();
  if (!db) return new Map();
  const rows = db.prepare("SELECT hospital_id, lat, lng, source, updated_at FROM hospital_coord_overrides").all();
  const byId = new Map();
  for (const r of rows) {
    if (!r || !r.hospital_id) continue;
    const lat = Number(r.lat);
    const lng = Number(r.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    byId.set(String(r.hospital_id), {
      lat,
      lng,
      source: typeof r.source === "string" && r.source.trim() ? r.source : "OVERRIDE",
      updatedAt: r.updated_at || null,
    });
  }
  return byId;
}

function listHospitalsWithOverrides() {
  const db = getDb();
  if (!db) return [];

  const rows = db.prepare(`
    SELECT
      h.*,
      o.lat AS override_lat,
      o.lng AS override_lng,
      o.source AS override_source,
      o.updated_at AS override_updated_at
    FROM hospitals h
    LEFT JOIN hospital_coord_overrides o
      ON o.hospital_id = h.id
  `).all();

  return rows.map((row) => {
    const profesiones = safeJsonParse(row.profesiones_json, []);
    const imagenes = safeJsonParse(row.imagenes_json, []);
    const hasOverride = row.override_lat != null && row.override_lng != null;
    return {
      id: String(row.id),
      profesion: row.profesion || "",
      profesiones: Array.isArray(profesiones) ? profesiones : [],
      institucion: row.institucion || "",
      departamento: row.departamento || "",
      provincia: row.provincia || "",
      distrito: row.distrito || "",
      grado_dificultad: row.grado_dificultad || "",
      codigo_renipress_modular: row.codigo_renipress_modular || "",
      nombre_establecimiento: row.nombre_establecimiento || "",
      presupuesto: row.presupuesto || "",
      categoria: row.categoria || "",
      zaf: row.zaf || "",
      ze: row.ze || "",
      imagenes: Array.isArray(imagenes) ? imagenes : [],
      lat: hasOverride ? row.override_lat : row.lat,
      lng: hasOverride ? row.override_lng : row.lng,
      coordenadas_fuente: hasOverride ? row.override_source || "OVERRIDE" : row.coordenadas_fuente || "",
      override_updated_at: hasOverride ? row.override_updated_at : null,
      updated_at: row.updated_at || null,
    };
  });
}

function getHospitalWithOverridesById(id) {
  const db = getDb();
  if (!db) return null;

  const row = db.prepare(`
    SELECT
      h.*,
      o.lat AS override_lat,
      o.lng AS override_lng,
      o.source AS override_source,
      o.updated_at AS override_updated_at
    FROM hospitals h
    LEFT JOIN hospital_coord_overrides o
      ON o.hospital_id = h.id
    WHERE h.id = ?
    LIMIT 1
  `).get(String(id));

  if (!row) return null;

  const profesiones = safeJsonParse(row.profesiones_json, []);
  const imagenes = safeJsonParse(row.imagenes_json, []);
  const hasOverride = row.override_lat != null && row.override_lng != null;

  return {
    id: String(row.id),
    profesion: row.profesion || "",
    profesiones: Array.isArray(profesiones) ? profesiones : [],
    institucion: row.institucion || "",
    departamento: row.departamento || "",
    provincia: row.provincia || "",
    distrito: row.distrito || "",
    grado_dificultad: row.grado_dificultad || "",
    codigo_renipress_modular: row.codigo_renipress_modular || "",
    nombre_establecimiento: row.nombre_establecimiento || "",
    presupuesto: row.presupuesto || "",
    categoria: row.categoria || "",
    zaf: row.zaf || "",
    ze: row.ze || "",
    imagenes: Array.isArray(imagenes) ? imagenes : [],
    lat: hasOverride ? row.override_lat : row.lat,
    lng: hasOverride ? row.override_lng : row.lng,
    coordenadas_fuente: hasOverride ? row.override_source || "OVERRIDE" : row.coordenadas_fuente || "",
    override_updated_at: hasOverride ? row.override_updated_at : null,
    updated_at: row.updated_at || null,
  };
}

module.exports = {
  countHospitals,
  upsertHospitals,
  upsertCoordOverride,
  listCoordOverridesById,
  listHospitalsWithOverrides,
  getHospitalWithOverridesById,
};
