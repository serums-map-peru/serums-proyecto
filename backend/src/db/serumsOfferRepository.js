const { getDb } = require("./index");

function nowIso() {
  return new Date().toISOString();
}

function listHospitalRenipressIndex() {
  const db = getDb();
  if (!db) return [];
  return db
    .prepare("SELECT id, codigo_renipress_modular FROM hospitals WHERE codigo_renipress_modular IS NOT NULL")
    .all()
    .map((r) => ({ id: String(r.id), codigo_renipress_modular: r.codigo_renipress_modular ? String(r.codigo_renipress_modular) : "" }));
}

function upsertOffers(records) {
  const db = getDb();
  if (!db) return { upserted: 0 };
  const stmt = db.prepare(`
    INSERT INTO serums_offers (
      hospital_id, codigo_renipress_modular, periodo, modalidad, profesion,
      plazas, sede_adjudicacion, created_at, updated_at
    ) VALUES (
      @hospital_id, @codigo_renipress_modular, @periodo, @modalidad, @profesion,
      @plazas, @sede_adjudicacion, @created_at, @updated_at
    )
    ON CONFLICT(hospital_id, periodo, modalidad, profesion) DO UPDATE SET
      codigo_renipress_modular = excluded.codigo_renipress_modular,
      plazas = excluded.plazas,
      sede_adjudicacion = excluded.sede_adjudicacion,
      updated_at = excluded.updated_at
  `);

  const tx = db.transaction((rows) => {
    for (const r of rows) stmt.run(r);
  });
  tx(records);
  return { upserted: records.length };
}

function listOfferSummaryByHospitalIds(hospitalIds, { periodo, modalidad, profesion } = {}) {
  const db = getDb();
  if (!db) return [];
  const ids = Array.isArray(hospitalIds) ? hospitalIds.map(String).filter(Boolean) : [];
  if (ids.length === 0) return [];

  const where = ["hospital_id IN (" + ids.map(() => "?").join(",") + ")"];
  const params = [...ids];

  if (periodo) {
    where.push("periodo = ?");
    params.push(String(periodo));
  }
  if (modalidad) {
    where.push("modalidad = ?");
    params.push(String(modalidad));
  }
  if (profesion) {
    where.push("lower(profesion) = lower(?)");
    params.push(String(profesion));
  }

  const sql = `
    SELECT hospital_id, periodo, modalidad, SUM(plazas) as plazas_total
    FROM serums_offers
    WHERE ${where.join(" AND ")}
    GROUP BY hospital_id, periodo, modalidad
  `;
  return db.prepare(sql).all(...params).map((r) => ({
    hospital_id: String(r.hospital_id),
    periodo: String(r.periodo),
    modalidad: String(r.modalidad),
    plazas_total: typeof r.plazas_total === "number" ? r.plazas_total : Number(r.plazas_total) || 0,
  }));
}

function listOffersByHospitalId(hospitalId) {
  const db = getDb();
  if (!db) return [];
  const id = String(hospitalId || "");
  if (!id) return [];
  return db
    .prepare(
      `
        SELECT hospital_id, codigo_renipress_modular, periodo, modalidad, profesion, plazas, sede_adjudicacion, updated_at
        FROM serums_offers
        WHERE hospital_id = ?
        ORDER BY periodo DESC, modalidad ASC, profesion ASC
      `,
    )
    .all(id)
    .map((r) => ({
      hospital_id: String(r.hospital_id),
      codigo_renipress_modular: r.codigo_renipress_modular ? String(r.codigo_renipress_modular) : "",
      periodo: String(r.periodo),
      modalidad: String(r.modalidad),
      profesion: String(r.profesion),
      plazas: typeof r.plazas === "number" ? r.plazas : Number(r.plazas) || 0,
      sede_adjudicacion: r.sede_adjudicacion ? String(r.sede_adjudicacion) : "",
      updated_at: r.updated_at ? String(r.updated_at) : null,
    }));
}

function deleteOffersByPeriodo(periodo) {
  const db = getDb();
  if (!db) return { deleted: 0 };
  const r = db.prepare("DELETE FROM serums_offers WHERE periodo = ?").run(String(periodo || ""));
  return { deleted: r.changes || 0 };
}

function deleteOffersByPeriodoModalidad(periodo, modalidad) {
  const db = getDb();
  if (!db) return { deleted: 0 };
  const r = db
    .prepare("DELETE FROM serums_offers WHERE periodo = ? AND modalidad = ?")
    .run(String(periodo || ""), String(modalidad || ""));
  return { deleted: r.changes || 0 };
}

function buildOfferRecord({
  hospital_id,
  codigo_renipress_modular,
  periodo,
  modalidad,
  profesion,
  plazas,
  sede_adjudicacion,
}) {
  const ts = nowIso();
  return {
    hospital_id: String(hospital_id),
    codigo_renipress_modular: codigo_renipress_modular ? String(codigo_renipress_modular) : null,
    periodo: String(periodo),
    modalidad: String(modalidad),
    profesion: String(profesion),
    plazas: Number.isFinite(Number(plazas)) ? Number(plazas) : 0,
    sede_adjudicacion: sede_adjudicacion ? String(sede_adjudicacion) : null,
    created_at: ts,
    updated_at: ts,
  };
}

module.exports = {
  listHospitalRenipressIndex,
  upsertOffers,
  listOfferSummaryByHospitalIds,
  listOffersByHospitalId,
  deleteOffersByPeriodo,
  deleteOffersByPeriodoModalidad,
  buildOfferRecord,
};
