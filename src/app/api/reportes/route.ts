import { NextResponse } from "next/server";

import { ensureAuthSchema, openDb } from "@/app/api/_shared/db";
import { generateId, nowIso } from "@/app/api/_shared/auth";
import { getAuthUser } from "@/app/api/_shared/requireAuth";

export const runtime = "nodejs";

function cleanMessage(value: unknown) {
  if (value == null) return "";
  return String(value).replace(/\r\n/g, "\n").trim();
}

export async function POST(request: Request) {
  const auth = getAuthUser(request);
  if (!auth) return NextResponse.json({ error: { message: "No autorizado", status: 401 } }, { status: 401 });

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const subject_type = body && typeof body.subject_type === "string" ? body.subject_type : "";
  const subject_id = body && typeof body.subject_id === "string" ? body.subject_id : "";
  const category = body && typeof body.category === "string" ? body.category : null;
  const message = cleanMessage(body && typeof body === "object" ? body["message"] : "");

  const t = String(subject_type || "").trim().toLowerCase();
  const id = String(subject_id || "").trim();
  if (t !== "hospital" || !id) {
    return NextResponse.json({ error: { message: "Datos inválidos", status: 400 } }, { status: 400 });
  }
  if (!message.trim()) {
    return NextResponse.json({ error: { message: "Mensaje requerido", status: 400 } }, { status: 400 });
  }

  const db = openDb();
  if (!db) return NextResponse.json({ error: { message: "Base de datos no encontrada.", status: 500 } }, { status: 500 });
  ensureAuthSchema(db);

  const now = nowIso();
  const rid = generateId();
  db.prepare(
    `INSERT INTO reports (id, user_id, subject_type, subject_id, category, message, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'open', ?)`,
  ).run(rid, auth.id, t, id, category, message, now);

  return NextResponse.json({ ok: true }, { status: 200 });
}

export async function GET(request: Request) {
  const auth = getAuthUser(request);
  if (!auth) return NextResponse.json({ error: { message: "No autorizado", status: 401 } }, { status: 401 });
  if (auth.role !== "admin") return NextResponse.json({ error: { message: "Solo Admin", status: 403 } }, { status: 403 });

  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const subject_type = url.searchParams.get("subject_type");
  const subject_id = url.searchParams.get("subject_id");
  const limitRaw = url.searchParams.get("limit");
  const limit = limitRaw ? Math.max(1, Math.min(500, Math.round(Number(limitRaw)))) : 100;

  const where: string[] = [];
  const params: Array<string | number | null> = [];
  if (status) {
    where.push("status = ?");
    params.push(status);
  }
  if (subject_type) {
    where.push("subject_type = ?");
    params.push(subject_type);
  }
  if (subject_id) {
    where.push("subject_id = ?");
    params.push(subject_id);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const db = openDb();
  if (!db) return NextResponse.json({ error: { message: "Base de datos no encontrada.", status: 500 } }, { status: 500 });
  ensureAuthSchema(db);

  const rows = db
    .prepare(
      `SELECT id, subject_type, subject_id, category, message, status, created_at
       FROM reports
       ${whereSql}
       ORDER BY created_at DESC
       LIMIT ?`,
    )
    .all(...params, limit) as Array<Record<string, unknown>>;

  const reports = rows.map((r) => ({
    id: String(r.id),
    subject_type: String(r.subject_type || ""),
    subject_id: String(r.subject_id || ""),
    category: r.category != null ? String(r.category) : null,
    message: String(r.message || ""),
    status: String(r.status || "open"),
    created_at: r.created_at ? String(r.created_at) : null,
  }));

  return NextResponse.json({ reports }, { status: 200 });
}

