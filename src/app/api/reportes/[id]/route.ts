import { NextResponse } from "next/server";

import { ensureAuthSchema, openDb } from "@/app/api/_shared/db";
import { getAuthUser } from "@/app/api/_shared/requireAuth";

export const runtime = "nodejs";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = getAuthUser(request);
  if (!auth) return NextResponse.json({ error: { message: "No autorizado", status: 401 } }, { status: 401 });
  if (auth.role !== "admin") return NextResponse.json({ error: { message: "Solo Admin", status: 403 } }, { status: 403 });

  const params = await context.params;
  const id = String(params.id || "").trim();
  if (!id) return NextResponse.json({ error: { message: "ID inválido", status: 400 } }, { status: 400 });

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const statusRaw = body && typeof body.status === "string" ? body.status : "";
  const status = statusRaw.trim().toLowerCase();
  if (status !== "open" && status !== "closed") {
    return NextResponse.json({ error: { message: "Estado inválido", status: 400 } }, { status: 400 });
  }

  const db = openDb();
  if (!db) return NextResponse.json({ error: { message: "Base de datos no encontrada.", status: 500 } }, { status: 500 });
  ensureAuthSchema(db);

  const r = db.prepare("UPDATE reports SET status = ? WHERE id = ?").run(status, id);
  if (!r || typeof r.changes !== "number" || r.changes <= 0) {
    return NextResponse.json({ error: { message: "Reporte no encontrado", status: 404 } }, { status: 404 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}

