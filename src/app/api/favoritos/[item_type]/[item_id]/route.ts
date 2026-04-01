import { NextResponse } from "next/server";

import { ensureAuthSchema, openDb } from "@/app/api/_shared/db";
import { getAuthUser } from "@/app/api/_shared/requireAuth";

export const runtime = "nodejs";

export async function DELETE(_request: Request, context: { params: Promise<{ item_type: string; item_id: string }> }) {
  const params = await context.params;
  const item_type = String(params.item_type || "").trim().toLowerCase();
  const item_id = String(params.item_id || "").trim();

  const auth = getAuthUser(_request);
  if (!auth) return NextResponse.json({ error: { message: "No autorizado", status: 401 } }, { status: 401 });

  if ((item_type !== "hospital" && item_type !== "place") || !item_id) {
    return NextResponse.json({ error: { message: "Datos inválidos", status: 400 } }, { status: 400 });
  }

  const db = openDb();
  if (!db) return NextResponse.json({ error: { message: "Base de datos no encontrada.", status: 500 } }, { status: 500 });
  ensureAuthSchema(db);

  db.prepare("DELETE FROM favorites WHERE user_id = ? AND item_type = ? AND item_id = ?").run(auth.id, item_type, item_id);
  return NextResponse.json({ ok: true }, { status: 200 });
}

