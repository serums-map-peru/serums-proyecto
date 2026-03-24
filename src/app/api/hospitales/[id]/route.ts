import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function dbPath() {
  return path.join(process.cwd(), "backend", "src", "data", "serums.db");
}

function openDb() {
  const p = dbPath();
  if (!fs.existsSync(p)) return null;
  return new DatabaseSync(p);
}

function safeJsonArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
  } catch {
  }
  return [];
}

function tableExists(db: DatabaseSync, name: string) {
  try {
    const row = db
      .prepare("SELECT 1 AS ok FROM sqlite_master WHERE type='table' AND name = ? LIMIT 1")
      .get(String(name));
    return !!(row && (row as { ok?: number }).ok);
  } catch {
    return false;
  }
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } | Promise<{ id: string }> },
) {
  const resolvedParams = await Promise.resolve(params);
  const id = String(resolvedParams?.id || "").trim();
  if (!id) {
    return NextResponse.json({ error: { message: "ID inválido.", status: 400 } }, { status: 400 });
  }

  const db = openDb();
  if (!db) {
    return NextResponse.json(
      { error: { message: "Base de datos no encontrada.", status: 500 } },
      { status: 500 },
    );
  }

  try {
    const row = db
      .prepare(
        `
        SELECT
          h.id,
          h.profesion,
          h.profesiones_json,
          h.institucion,
          h.departamento,
          h.provincia,
          h.distrito,
          h.grado_dificultad,
          h.codigo_renipress_modular,
          h.nombre_establecimiento,
          h.presupuesto,
          h.categoria,
          h.zaf,
          h.ze,
          h.imagenes_json,
          h.lat,
          h.lng,
          h.coordenadas_fuente
        FROM hospitals h
        WHERE h.id = ? OR h.codigo_renipress_modular = ?
        ORDER BY CASE WHEN h.id = ? THEN 0 ELSE 1 END
        LIMIT 1
      `,
      )
      .get(id, id, id) as Record<string, unknown> | undefined;

    if (!row) {
      return NextResponse.json({ error: { message: "Hospital no encontrado", status: 404 } }, { status: 404 });
    }

    const profesiones = safeJsonArray(row.profesiones_json);
    const imagenes = safeJsonArray(row.imagenes_json);

    const base = {
      id: String(row.id || ""),
      profesion: String(row.profesion || ""),
      profesiones: profesiones.length ? profesiones : undefined,
      institucion: String(row.institucion || ""),
      departamento: String(row.departamento || ""),
      provincia: String(row.provincia || ""),
      distrito: String(row.distrito || ""),
      grado_dificultad: String(row.grado_dificultad || ""),
      codigo_renipress_modular: String(row.codigo_renipress_modular || ""),
      nombre_establecimiento: String(row.nombre_establecimiento || ""),
      presupuesto: String(row.presupuesto || ""),
      categoria: String(row.categoria || ""),
      zaf: String(row.zaf || ""),
      ze: String(row.ze || ""),
      lat: Number(row.lat),
      lng: Number(row.lng),
      imagenes: imagenes.length ? imagenes : undefined,
      coordenadas_fuente: row.coordenadas_fuente != null ? String(row.coordenadas_fuente) : undefined,
    } as Record<string, unknown>;

    if (!tableExists(db, "serums_offers")) {
      return NextResponse.json(base, { status: 200 });
    }

    const hospitalId = String(row.id || "");
    const offers = db
      .prepare(
        `
        SELECT
          hospital_id,
          codigo_renipress_modular,
          periodo,
          modalidad,
          profesion,
          plazas,
          sede_adjudicacion,
          updated_at
        FROM serums_offers
        WHERE hospital_id = ?
      `,
      )
      .all(hospitalId)
      .map((r) => {
        const o = r as Record<string, unknown>;
        return {
          hospital_id: String(o.hospital_id || ""),
          codigo_renipress_modular: String(o.codigo_renipress_modular || ""),
          periodo: String(o.periodo || ""),
          modalidad: String(o.modalidad || ""),
          profesion: String(o.profesion || ""),
          plazas: Number(o.plazas),
          sede_adjudicacion: String(o.sede_adjudicacion || ""),
          updated_at: o.updated_at != null ? String(o.updated_at) : null,
        };
      });

    const summaryMap = new Map<string, { periodo: string; modalidad: string; plazas_total: number }>();
    for (const o of offers) {
      const key = `${o.periodo}__${o.modalidad}`;
      const existing = summaryMap.get(key);
      if (!existing) {
        summaryMap.set(key, { periodo: o.periodo, modalidad: o.modalidad, plazas_total: Number.isFinite(o.plazas) ? o.plazas : 0 });
      } else {
        existing.plazas_total += Number.isFinite(o.plazas) ? o.plazas : 0;
      }
    }

    const serums_resumen = Array.from(summaryMap.values()).sort((a, b) => {
      const p = b.periodo.localeCompare(a.periodo);
      if (p !== 0) return p;
      return a.modalidad.localeCompare(b.modalidad);
    });

    return NextResponse.json(
      {
        ...base,
        serums_ofertas: offers,
        serums_resumen,
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json(
      { error: { message: "Error al obtener el establecimiento.", status: 500 } },
      { status: 500 },
    );
  } finally {
    try {
      db.close();
    } catch {
    }
  }
}
