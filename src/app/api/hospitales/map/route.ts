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

function safeLower(value: string) {
  return String(value || "").trim().toLowerCase();
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

export function GET(request: Request) {
  const url = new URL(request.url);
  const filters = {
    profesion: safeLower(url.searchParams.get("profesion") || ""),
    institucion: safeLower(url.searchParams.get("institucion") || ""),
    departamento: safeLower(url.searchParams.get("departamento") || ""),
    provincia: safeLower(url.searchParams.get("provincia") || ""),
    distrito: safeLower(url.searchParams.get("distrito") || ""),
    grado_dificultad: safeLower(url.searchParams.get("grado_dificultad") || ""),
    categoria: safeLower(url.searchParams.get("categoria") || ""),
    zaf: safeLower(url.searchParams.get("zaf") || ""),
    ze: safeLower(url.searchParams.get("ze") || ""),
    serums_periodo: String(url.searchParams.get("serums_periodo") || "").trim(),
    serums_modalidad: String(url.searchParams.get("serums_modalidad") || "").trim(),
  };

  const db = openDb();
  if (!db) {
    return NextResponse.json(
      { error: { message: "Base de datos no encontrada.", status: 500 } },
      { status: 500 },
    );
  }

  try {
    const clauses: string[] = [];
    const params: unknown[] = [];

    if (filters.profesion) {
      clauses.push(
        "(LOWER(COALESCE(h.profesion,'')) = ? OR LOWER(COALESCE(h.profesiones_json,'')) LIKE '%' || ? || '%')",
      );
      params.push(filters.profesion, filters.profesion);
    }
    if (filters.institucion) {
      clauses.push("LOWER(COALESCE(h.institucion,'')) = ?");
      params.push(filters.institucion);
    }
    if (filters.departamento) {
      clauses.push("LOWER(COALESCE(h.departamento,'')) = ?");
      params.push(filters.departamento);
    }
    if (filters.provincia) {
      clauses.push("LOWER(COALESCE(h.provincia,'')) = ?");
      params.push(filters.provincia);
    }
    if (filters.distrito) {
      clauses.push("LOWER(COALESCE(h.distrito,'')) = ?");
      params.push(filters.distrito);
    }
    if (filters.grado_dificultad) {
      clauses.push("LOWER(COALESCE(h.grado_dificultad,'')) = ?");
      params.push(filters.grado_dificultad);
    }
    if (filters.categoria) {
      clauses.push("LOWER(COALESCE(h.categoria,'')) = ?");
      params.push(filters.categoria);
    }
    if (filters.zaf) {
      clauses.push("LOWER(COALESCE(h.zaf,'')) = ?");
      params.push(filters.zaf);
    }
    if (filters.ze) {
      clauses.push("LOWER(COALESCE(h.ze,'')) = ?");
      params.push(filters.ze);
    }

    const wantsOffers = !!filters.serums_periodo || !!filters.serums_modalidad;
    if (wantsOffers && tableExists(db, "serums_offers")) {
      const offerClauses: string[] = ["o.hospital_id = h.id"];
      if (filters.serums_periodo) {
        offerClauses.push("o.periodo = ?");
        params.push(filters.serums_periodo);
      }
      if (filters.serums_modalidad) {
        offerClauses.push("o.modalidad = ?");
        params.push(filters.serums_modalidad);
      }
      clauses.push(`EXISTS (SELECT 1 FROM serums_offers o WHERE ${offerClauses.join(" AND ")})`);
    } else if (wantsOffers) {
      return NextResponse.json([], { status: 200 });
    }

    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const rows = db
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
          h.categoria,
          h.zaf,
          h.ze,
          h.lat,
          h.lng
        FROM hospitals h
        ${where}
      `,
      )
      .all(...params);

    const mapped = rows.map((r) => {
      const row = r as Record<string, unknown>;
      const profesiones = safeJsonArray(row.profesiones_json);
      return {
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
        categoria: String(row.categoria || ""),
        zaf: String(row.zaf || ""),
        ze: String(row.ze || ""),
        lat: Number(row.lat),
        lng: Number(row.lng),
      };
    });

    return NextResponse.json(mapped, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: { message: "Error al cargar establecimientos.", status: 500 } },
      { status: 500 },
    );
  } finally {
    try {
      db.close();
    } catch {
    }
  }
}
