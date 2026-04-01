import { NextResponse } from "next/server";

import { ensureAuthSchema, openDb } from "@/app/api/_shared/db";
import { generateId, nowIso } from "@/app/api/_shared/auth";
import { getAuthUser } from "@/app/api/_shared/requireAuth";

export const runtime = "nodejs";

function cleanComment(value: unknown) {
  if (value == null) return "";
  return String(value).replace(/\r\n/g, "\n").trimEnd();
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = getAuthUser(request);
  if (!auth) return NextResponse.json({ error: { message: "No autorizado", status: 401 } }, { status: 401 });
  const params = await context.params;
  const hospitalId = String(params.id || "").trim();
  if (!hospitalId) return NextResponse.json({ error: { message: "ID inválido", status: 400 } }, { status: 400 });

  const db = openDb();
  if (!db) return NextResponse.json({ error: { message: "Base de datos no encontrada.", status: 500 } }, { status: 500 });
  ensureAuthSchema(db);

  const row = db
    .prepare("SELECT comment, updated_at FROM hospital_comments WHERE user_id = ? AND hospital_id = ? LIMIT 1")
    .get(auth.id, hospitalId) as { comment?: string; updated_at?: string } | undefined;
  return NextResponse.json({ comment: row && typeof row.comment === "string" ? row.comment : "", updated_at: row?.updated_at ?? null }, { status: 200 });
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = getAuthUser(request);
  if (!auth) return NextResponse.json({ error: { message: "No autorizado", status: 401 } }, { status: 401 });
  const params = await context.params;
  const hospitalId = String(params.id || "").trim();
  if (!hospitalId) return NextResponse.json({ error: { message: "ID inválido", status: 400 } }, { status: 400 });

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const commentRaw = body && typeof body === "object" ? body["comment"] : "";
  const comment = cleanComment(commentRaw);

  const db = openDb();
  if (!db) return NextResponse.json({ error: { message: "Base de datos no encontrada.", status: 500 } }, { status: 500 });
  ensureAuthSchema(db);

  if (!comment.trim()) {
    db.prepare("DELETE FROM hospital_comments WHERE user_id = ? AND hospital_id = ?").run(auth.id, hospitalId);
    return NextResponse.json({ comment: "", updated_at: null }, { status: 200 });
  }

  const id = generateId();
  const now = nowIso();
  db.prepare(
    `INSERT INTO hospital_comments (id, user_id, hospital_id, comment, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT (user_id, hospital_id) DO UPDATE SET
       comment = excluded.comment,
       updated_at = excluded.updated_at`,
  ).run(id, auth.id, hospitalId, comment, now, now);

  return NextResponse.json({ comment, updated_at: now }, { status: 200 });
}
