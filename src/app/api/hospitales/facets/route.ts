import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type FacetGroup = { values: string[]; enabled: Record<string, boolean> };

function dbPath() {
  return path.join(process.cwd(), "backend", "src", "data", "serums.db");
}

function openDb() {
  const p = dbPath();
  if (!fs.existsSync(p)) return null;
  return new DatabaseSync(p);
}

function cleanString(value: string | null) {
  const s = typeof value === "string" ? value.trim() : "";
  return s.length ? s : null;
}

function cleanArray(values: string[]) {
  return values.map((v) => String(v || "").trim()).filter(Boolean);
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

function buildCanonicalValues(raw: unknown[]) {
  const lowerToLabel = new Map<string, string>();
  for (const v of raw) {
    const s = typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim();
    if (!s) continue;
    const lower = s.toLowerCase();
    const existing = lowerToLabel.get(lower);
    if (!existing || s.localeCompare(existing) < 0) lowerToLabel.set(lower, s);
  }

  const values = Array.from(lowerToLabel.values())
    .filter(Boolean)
    .sort((a, b) => String(a).localeCompare(String(b)));

  return { lowerToLabel, values };
}

function buildHospitalsWhere({
  profesion,
  instituciones,
  departamentos,
  provincias,
  distrito,
  grados,
  categorias,
  zaf,
  ze,
  serums_periodo,
  serums_modalidad,
  omit,
}: {
  profesion: string | null;
  instituciones: string[];
  departamentos: string[];
  provincias: string[];
  distrito: string | null;
  grados: string[];
  categorias: string[];
  zaf: string | null;
  ze: string | null;
  serums_periodo: string | null;
  serums_modalidad: string | null;
  omit: "departamento" | "institucion" | "grado_dificultad" | "categoria" | null;
}) {
  const where: string[] = [];
  const params: string[] = [];

  where.push("CAST(h.lat AS REAL) BETWEEN -90 AND 90");
  where.push("CAST(h.lng AS REAL) BETWEEN -180 AND 180");
  where.push("CAST(h.lat AS REAL) != 0");
  where.push("CAST(h.lng AS REAL) != 0");

  const addLowerEq = (column: string, value: string | null) => {
    if (!value) return;
    where.push(`LOWER(${column}) = ?`);
    params.push(value.toLowerCase());
  };

  const addLowerIn = (column: string, values: string[]) => {
    if (!values.length) return;
    const normalized = values.map((v) => v.toLowerCase());
    where.push(`LOWER(${column}) IN (${normalized.map(() => "?").join(", ")})`);
    params.push(...normalized);
  };

  if (omit !== "institucion") addLowerIn("h.institucion", instituciones);
  if (omit !== "departamento") addLowerIn("h.departamento", departamentos);
  addLowerIn("h.provincia", provincias);
  addLowerEq("h.distrito", distrito);
  if (omit !== "grado_dificultad") addLowerIn("h.grado_dificultad", grados);
  if (omit !== "categoria") addLowerIn("h.categoria", categorias);
  addLowerEq("h.zaf", zaf);
  addLowerEq("h.ze", ze);

  const requiresOfferFilter = !!serums_periodo || !!serums_modalidad;
  const offerFilter = requiresOfferFilter
    ? {
        where: [
          "o.hospital_id = h.id",
          ...(serums_periodo ? ["LOWER(o.periodo) = ?"] : []),
          ...(serums_modalidad ? ["LOWER(o.modalidad) = ?"] : []),
        ],
        params: [
          ...(serums_periodo ? [serums_periodo.toLowerCase()] : []),
          ...(serums_modalidad ? [serums_modalidad.toLowerCase()] : []),
        ],
      }
    : null;

  return { where, params, offerFilter };
}

function queryDistinctValues(db: DatabaseSync, column: string) {
  const rows = db
    .prepare(
      `
      SELECT DISTINCT ${column} AS v
      FROM hospitals
      WHERE
        ${column} IS NOT NULL
        AND LENGTH(TRIM(${column})) > 0
        AND CAST(lat AS REAL) BETWEEN -90 AND 90
        AND CAST(lng AS REAL) BETWEEN -180 AND 180
        AND CAST(lat AS REAL) != 0
        AND CAST(lng AS REAL) != 0
    `,
    )
    .all() as Array<{ v: unknown }>;
  return rows.map((r) => r.v);
}

function queryEnabledSet(db: DatabaseSync, column: string, whereSql: string, params: string[]) {
  const sql = `
    SELECT DISTINCT ${column} AS v
    FROM hospitals h
    ${whereSql}
  `;
  const rows = db.prepare(sql).all(...params) as Array<{ v: unknown }>;
  const set = new Set<string>();
  for (const r of rows) {
    const s = typeof r.v === "string" ? r.v.trim() : r.v == null ? "" : String(r.v).trim();
    if (!s) continue;
    set.add(s.toLowerCase());
  }
  return set;
}

export async function GET(request: Request) {
  const db = openDb();
  if (!db) {
    return NextResponse.json(
      { error: { message: "Base de datos no encontrada.", status: 500 } },
      { status: 500 },
    );
  }

  const url = new URL(request.url);
  const sp = url.searchParams;

  const profesion = cleanString(sp.get("profesion"));
  const instituciones = cleanArray(sp.getAll("institucion"));
  const departamentos = cleanArray(sp.getAll("departamento"));
  const provincias = cleanArray(sp.getAll("provincia"));
  const distrito = cleanString(sp.get("distrito"));
  const grados = cleanArray(sp.getAll("grado_dificultad"));
  const categorias = cleanArray(sp.getAll("categoria"));
  const zaf = cleanString(sp.get("zaf"));
  const ze = cleanString(sp.get("ze"));
  const serums_periodo = cleanString(sp.get("serums_periodo"));
  const serums_modalidad = cleanString(sp.get("serums_modalidad"));

  const requiresOfferFilter = !!serums_periodo || !!serums_modalidad;
  const needsOfferFilter = requiresOfferFilter || !!profesion;

  try {
    const allDept = buildCanonicalValues(queryDistinctValues(db, "departamento"));
    const allInst = buildCanonicalValues(queryDistinctValues(db, "institucion"));
    const allGrado = buildCanonicalValues(queryDistinctValues(db, "grado_dificultad"));
    const allCat = buildCanonicalValues(queryDistinctValues(db, "categoria"));

    const buildGroup = (key: "departamento" | "institucion" | "grado_dificultad" | "categoria", all: ReturnType<typeof buildCanonicalValues>) => {
      const base = buildHospitalsWhere({
        profesion,
        instituciones,
        departamentos,
        provincias,
        distrito,
        grados,
        categorias,
        zaf,
        ze,
        serums_periodo,
        serums_modalidad,
        omit: key,
      });

      if (needsOfferFilter) {
        if (!tableExists(db, "serums_offers")) {
          const enabled: Record<string, boolean> = {};
          for (const label of all.values) enabled[label] = false;
          return { values: all.values, enabled } satisfies FacetGroup;
        }

        const offerWhere: string[] = ["o.hospital_id = h.id"];
        const offerParams: string[] = [];
        if (serums_periodo) {
          offerWhere.push("LOWER(o.periodo) = ?");
          offerParams.push(serums_periodo.toLowerCase());
        }
        if (serums_modalidad) {
          offerWhere.push("LOWER(o.modalidad) = ?");
          offerParams.push(serums_modalidad.toLowerCase());
        }
        if (profesion) {
          offerWhere.push("LOWER(o.profesion) = ?");
          offerParams.push(profesion.toLowerCase());
        }
        base.where.push(`EXISTS (SELECT 1 FROM serums_offers o WHERE ${offerWhere.join(" AND ")})`);
        base.params.push(...offerParams);
      }

      const whereSql = base.where.length ? `WHERE ${base.where.join(" AND ")}` : "";
      const enabledLower = queryEnabledSet(db, key, whereSql, base.params);

      const enabled: Record<string, boolean> = {};
      for (const [lower, label] of all.lowerToLabel.entries()) {
        enabled[label] = enabledLower.has(lower);
      }

      return { values: all.values, enabled } satisfies FacetGroup;
    };

    const result = {
      departamentos: buildGroup("departamento", allDept),
      instituciones: buildGroup("institucion", allInst),
      grados_dificultad: buildGroup("grado_dificultad", allGrado),
      categorias: buildGroup("categoria", allCat),
    };

    return NextResponse.json(result, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: { message: "Error al cargar opciones de filtros.", status: 500 } },
      { status: 500 },
    );
  } finally {
    try {
      db.close();
    } catch {
    }
  }
}
