const { queryAll, execute, withTransaction } = require("./index");

function nowIso() {
  return new Date().toISOString();
}

async function listHospitalRenipressIndex() {
  const rows = await queryAll("SELECT id, codigo_renipress_modular FROM hospitals WHERE codigo_renipress_modular IS NOT NULL");
  return rows.map((r) => ({
    id: String(r.id),
    codigo_renipress_modular: r.codigo_renipress_modular ? String(r.codigo_renipress_modular) : "",
  }));
}

async function upsertOffers(records) {
  const rows = Array.isArray(records) ? records : [];
  if (rows.length === 0) return { upserted: 0 };

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

  const chunkSize = 500;
  for (let offset = 0; offset < rows.length; offset += chunkSize) {
    const chunk = rows.slice(offset, offset + chunkSize);
    const valuesSql = chunk.map(() => `(${columns.map(() => "?").join(", ")})`).join(", ");
    const params = [];
    for (const r of chunk) {
      params.push(
        r.hospital_id,
        r.codigo_renipress_modular,
        r.periodo,
        r.modalidad,
        r.profesion,
        r.plazas,
        r.sede_adjudicacion,
        r.created_at,
        r.updated_at,
      );
    }

    await withTransaction(async (tx) => {
      await tx.execute(
        `
          INSERT INTO serums_offers (${columns.join(", ")})
          VALUES ${valuesSql}
          ON CONFLICT(hospital_id, periodo, modalidad, profesion) DO UPDATE SET
            codigo_renipress_modular = excluded.codigo_renipress_modular,
            plazas = excluded.plazas,
            sede_adjudicacion = excluded.sede_adjudicacion,
            updated_at = excluded.updated_at
        `,
        params,
      );
    });
  }

  return { upserted: rows.length };
}

async function listOfferSummaryByHospitalIds(hospitalIds, { periodo, modalidad, profesion } = {}) {
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
  const rows = await queryAll(sql, params);
  return rows.map((r) => ({
    hospital_id: String(r.hospital_id),
    periodo: String(r.periodo),
    modalidad: String(r.modalidad),
    plazas_total: typeof r.plazas_total === "number" ? r.plazas_total : Number(r.plazas_total) || 0,
  }));
}

async function listOffersByHospitalId(hospitalId) {
  const id = String(hospitalId || "");
  if (!id) return [];
  const rows = await queryAll(
    `
      SELECT hospital_id, codigo_renipress_modular, periodo, modalidad, profesion, plazas, sede_adjudicacion, updated_at
      FROM serums_offers
      WHERE hospital_id = ?
      ORDER BY periodo DESC, modalidad ASC, profesion ASC
    `,
    [id],
  );
  return rows.map((r) => ({
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

async function deleteOffersByPeriodo(periodo) {
  const r = await execute("DELETE FROM serums_offers WHERE periodo = ?", [String(periodo || "")]);
  return { deleted: r.rowCount || 0 };
}

async function deleteOffersByPeriodoModalidad(periodo, modalidad) {
  const r = await execute("DELETE FROM serums_offers WHERE periodo = ? AND modalidad = ?", [
    String(periodo || ""),
    String(modalidad || ""),
  ]);
  return { deleted: r.rowCount || 0 };
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
