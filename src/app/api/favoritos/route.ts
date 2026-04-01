import { NextResponse } from "next/server";

import { generateId, nowIso } from "@/app/api/_shared/auth";
import { ensureAuthSchema, openDb } from "@/app/api/_shared/db";
import { getAuthUser } from "@/app/api/_shared/requireAuth";

export const runtime = "nodejs";

function safeJson(meta: unknown) {
  if (meta == null) return null;
  try {
    return JSON.stringify(meta);
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const auth = getAuthUser(request);
  if (!auth) return NextResponse.json({ error: { message: "No autorizado", status: 401 } }, { status: 401 });

  const url = new URL(request.url);
  const limitRaw = url.searchParams.get("limit");
  const limit = limitRaw ? Math.max(1, Math.min(500, Math.round(Number(limitRaw)))) : 200;

  const db = openDb();
  if (!db) return NextResponse.json({ error: { message: "Base de datos no encontrada.", status: 500 } }, { status: 500 });
  ensureAuthSchema(db);

  const rows = db
    .prepare(
      `
      SELECT
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
      LIMIT ?
    `,
    )
    .all(auth.id, limit) as Array<Record<string, unknown>>;

  const favorites = rows
    .map((row) => {
      const item_type = String(row.item_type || "").toLowerCase();
      const item_id = String(row.item_id || "");
      if (item_type !== "hospital" && item_type !== "place") return null;
      if (!item_id) return null;
      let meta: unknown = null;
      if (row.meta_json && typeof row.meta_json === "string") {
        try {
          meta = JSON.parse(row.meta_json);
        } catch {
          meta = null;
        }
      }
      const base = {
        id: String(row.id),
        item_type,
        item_id,
        name: row.name != null ? String(row.name) : null,
        lat: row.lat != null ? Number(row.lat) : null,
        lon: row.lon != null ? Number(row.lon) : null,
        meta,
        created_at: row.created_at ? String(row.created_at) : null,
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
    })
    .filter(Boolean);

  return NextResponse.json({ favorites }, { status: 200 });
}

export async function POST(request: Request) {
  const auth = getAuthUser(request);
  if (!auth) return NextResponse.json({ error: { message: "No autorizado", status: 401 } }, { status: 401 });

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const item_type = body && typeof body.item_type === "string" ? body.item_type : "";
  const item_id = body && typeof body.item_id === "string" ? body.item_id : "";
  const name = body && typeof body.name === "string" ? body.name : null;
  const lat = body && typeof body.lat === "number" ? body.lat : null;
  const lon = body && typeof body.lon === "number" ? body.lon : null;
  const meta = body && typeof body === "object" ? body["meta"] : null;

  const type = String(item_type || "").trim().toLowerCase();
  const id = String(item_id || "").trim();
  if ((type !== "hospital" && type !== "place") || !id) {
    return NextResponse.json({ error: { message: "Datos inválidos", status: 400 } }, { status: 400 });
  }

  const db = openDb();
  if (!db) return NextResponse.json({ error: { message: "Base de datos no encontrada.", status: 500 } }, { status: 500 });
  ensureAuthSchema(db);

  const favId = generateId();
  const created_at = nowIso();
  const meta_json = safeJson(meta);

  db.prepare(
    `INSERT INTO favorites (id, user_id, item_type, item_id, name, lat, lon, meta_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (user_id, item_type, item_id) DO UPDATE SET
       name = excluded.name,
       lat = excluded.lat,
       lon = excluded.lon,
       meta_json = excluded.meta_json`,
  ).run(favId, auth.id, type, id, name, lat, lon, meta_json, created_at);

  return NextResponse.json({ ok: true }, { status: 200 });
}
