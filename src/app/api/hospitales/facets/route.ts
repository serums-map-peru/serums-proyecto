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

export function GET(request: Request) {
  const url = new URL(request.url);
  const getAllLower = (key: string) => url.searchParams.getAll(key).map((v) => safeLower(v)).filter(Boolean);
  const filters = {
    profesion: safeLower(url.searchParams.get("profesion") || ""),
    institucion: getAllLower("institucion"),
    departamento: getAllLower("departamento"),
    grado_dificultad: getAllLower("grado_dificultad"),
    categoria: getAllLower("categoria"),
    zaf: safeLower(url.searchParams.get("zaf") || ""),
    ze: safeLower(url.searchParams.get("ze") || ""),
    serums_periodo: String(url.searchParams.get("serums_periodo") || "").trim(),
    serums_modalidad: String(url.searchParams.get("serums_modalidad") || "").trim(),
  };

  const db = openDb();
  if (!db) {
    return NextResponse.json({ error: { message: "Base de datos no encontrada.", status: 500 } }, { status: 500 });
  }
  const dbConn = db;

  try {
    function whereExcept(except: Array<keyof typeof filters>) {
      const clauses: string[] = [];
      const params: string[] = [];
      const ex = new Set(except);

      if (!ex.has("profesion") && filters.profesion) {
        clauses.push(
          "(LOWER(COALESCE(h.profesion,'')) = ? OR LOWER(COALESCE(h.profesiones_json,'')) LIKE '%' || ? || '%')",
        );
        params.push(filters.profesion, filters.profesion);
      }
      if (!ex.has("institucion") && Array.isArray(filters.institucion) && filters.institucion.length) {
        clauses.push(`LOWER(COALESCE(h.institucion,'')) IN (${filters.institucion.map(() => "?").join(",")})`);
        params.push(...filters.institucion);
      }
      if (!ex.has("departamento") && Array.isArray(filters.departamento) && filters.departamento.length) {
        clauses.push(`LOWER(COALESCE(h.departamento,'')) IN (${filters.departamento.map(() => "?").join(",")})`);
        params.push(...filters.departamento);
      }
      if (
        !ex.has("grado_dificultad") &&
        Array.isArray(filters.grado_dificultad) &&
        filters.grado_dificultad.length
      ) {
        clauses.push(
          `LOWER(COALESCE(h.grado_dificultad,'')) IN (${filters.grado_dificultad.map(() => "?").join(",")})`,
        );
        params.push(...filters.grado_dificultad);
      }
      if (!ex.has("categoria") && Array.isArray(filters.categoria) && filters.categoria.length) {
        clauses.push(`LOWER(COALESCE(h.categoria,'')) IN (${filters.categoria.map(() => "?").join(",")})`);
        params.push(...filters.categoria);
      }
      if (!ex.has("zaf") && filters.zaf) {
        clauses.push("LOWER(COALESCE(h.zaf,'')) = ?");
        params.push(filters.zaf);
      }
      if (!ex.has("ze") && filters.ze) {
        clauses.push("LOWER(COALESCE(h.ze,'')) = ?");
        params.push(filters.ze);
      }

      if (!ex.has("serums_periodo") || !ex.has("serums_modalidad")) {
        const wantsOffers = !!filters.serums_periodo || !!filters.serums_modalidad;
        if (wantsOffers) {
          clauses.push(
            `EXISTS (SELECT 1 FROM serums_offers o WHERE o.hospital_id = h.id${
              filters.serums_periodo ? " AND o.periodo = ?" : ""
            }${filters.serums_modalidad ? " AND o.modalidad = ?" : ""})`,
          );
          if (filters.serums_periodo) params.push(filters.serums_periodo);
          if (filters.serums_modalidad) params.push(filters.serums_modalidad);
        }
      }

      const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
      return { where, params };
    }

    function groupFacet(column: "departamento" | "institucion" | "grado_dificultad" | "categoria") {
      const { where, params } = whereExcept([column]);
      const counts = dbConn
        .prepare(
          `
          SELECT LOWER(COALESCE(${column},'')) AS v_lower, MIN(COALESCE(${column},'')) AS v_label, COUNT(*) AS c
          FROM hospitals h
          ${where}
          GROUP BY v_lower
        `,
        )
        .all(...params) as Array<{ v_lower: string; v_label: string; c: number }>;

      const distinct = dbConn
        .prepare(`SELECT DISTINCT LOWER(COALESCE(${column},'')) AS v_lower, MIN(COALESCE(${column},'')) AS v_label FROM hospitals GROUP BY v_lower`)
        .all() as Array<{ v_lower: string; v_label: string }>;

      const enabled: Record<string, boolean> = {};
      for (const row of counts) {
        enabled[row.v_label] = Number(row.c) > 0;
      }
      const values = distinct.map((r) => r.v_label).filter((v) => v && v.trim().length > 0).sort((a, b) => a.localeCompare(b));
      return { values, enabled };
    }

    const departamentos = groupFacet("departamento");
    const instituciones = groupFacet("institucion");
    const grados_dificultad = groupFacet("grado_dificultad");
    const categorias = groupFacet("categoria");

    return NextResponse.json({ departamentos, instituciones, grados_dificultad, categorias }, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: { message: "Error al cargar opciones de filtros.", status: 500 } },
      { status: 500 },
    );
  } finally {
    try {
      dbConn.close();
    } catch {}
  }
}
