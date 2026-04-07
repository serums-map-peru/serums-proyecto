const { queryAll, queryOne, execute, withTransaction } = require("./index");

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

function toNumberOrNull(v) {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function normalizeInstitutionKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function normalizeInstitutionLabel(value) {
  const raw = typeof value === "string" ? value : String(value || "");
  const key = normalizeInstitutionKey(raw);
  if (key.includes("gobierno regional")) return "MINSA";
  return raw.trim();
}

async function countHospitals() {
  const row = await queryOne("SELECT COUNT(*) as c FROM hospitals");
  const c = row && row.c != null ? Number(row.c) : 0;
  return Number.isFinite(c) ? c : 0;
}

async function upsertHospitals(records) {
  const rows = Array.isArray(records) ? records : [];
  if (rows.length === 0) return;

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

  const chunkSize = 200;
  for (let offset = 0; offset < rows.length; offset += chunkSize) {
    const chunk = rows.slice(offset, offset + chunkSize);
    const valuesSql = chunk.map(() => `(${columns.map(() => "?").join(", ")})`).join(", ");
    const params = [];
    for (const r of chunk) {
      params.push(
        r.id,
        r.profesion,
        r.profesiones_json,
        r.institucion,
        r.departamento,
        r.provincia,
        r.distrito,
        r.grado_dificultad,
        r.codigo_renipress_modular,
        r.nombre_establecimiento,
        r.presupuesto,
        r.categoria,
        r.zaf,
        r.ze,
        r.imagenes_json,
        r.lat,
        r.lng,
        r.coordenadas_fuente,
        r.updated_at,
      );
    }

    await withTransaction(async (tx) => {
      await tx.execute(
        `
          INSERT INTO hospitals (${columns.join(", ")})
          VALUES ${valuesSql}
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
        `,
        params,
      );
    });
  }
}

async function upsertCoordOverride(hospitalId, { lat, lng, source }) {
  await execute(
    `
      INSERT INTO hospital_coord_overrides (hospital_id, lat, lng, source, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(hospital_id) DO UPDATE SET
        lat = excluded.lat,
        lng = excluded.lng,
        source = excluded.source,
        updated_at = excluded.updated_at
    `,
    [String(hospitalId), lat, lng, source || "OVERRIDE", nowIso()],
  );
}

async function listCoordOverridesById() {
  const rows = await queryAll("SELECT hospital_id, lat, lng, source, updated_at FROM hospital_coord_overrides");
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

async function listHospitalsWithOverrides() {
  const rows = await queryAll(
    `
      SELECT
        h.*,
        o.lat AS override_lat,
        o.lng AS override_lng,
        o.source AS override_source,
        o.updated_at AS override_updated_at
      FROM hospitals h
      LEFT JOIN hospital_coord_overrides o
        ON o.hospital_id = h.id
    `,
  );

  return rows.map((row) => {
    const profesiones = safeJsonParse(row.profesiones_json, []);
    const imagenes = safeJsonParse(row.imagenes_json, []);
    const hasOverride = row.override_lat != null && row.override_lng != null;
    return {
      id: String(row.id),
      profesion: row.profesion || "",
      profesiones: Array.isArray(profesiones) ? profesiones : [],
      institucion: normalizeInstitutionLabel(row.institucion || ""),
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
      lat: hasOverride ? toNumberOrNull(row.override_lat) : toNumberOrNull(row.lat),
      lng: hasOverride ? toNumberOrNull(row.override_lng) : toNumberOrNull(row.lng),
      coordenadas_fuente: hasOverride ? row.override_source || "OVERRIDE" : row.coordenadas_fuente || "",
      override_updated_at: hasOverride ? row.override_updated_at : null,
      updated_at: row.updated_at || null,
    };
  });
}

async function getHospitalWithOverridesById(id) {
  const row = await queryOne(
    `
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
    `,
    [String(id)],
  );

  if (!row) return null;

  const profesiones = safeJsonParse(row.profesiones_json, []);
  const imagenes = safeJsonParse(row.imagenes_json, []);
  const hasOverride = row.override_lat != null && row.override_lng != null;

  return {
    id: String(row.id),
    profesion: row.profesion || "",
    profesiones: Array.isArray(profesiones) ? profesiones : [],
    institucion: normalizeInstitutionLabel(row.institucion || ""),
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
    lat: hasOverride ? toNumberOrNull(row.override_lat) : toNumberOrNull(row.lat),
    lng: hasOverride ? toNumberOrNull(row.override_lng) : toNumberOrNull(row.lng),
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
