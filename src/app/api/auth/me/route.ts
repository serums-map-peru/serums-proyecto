import { NextResponse } from "next/server";

import { ensureAuthSchema, openDb } from "@/app/api/_shared/db";
import { verifyJwt } from "@/app/api/_shared/auth";

export const runtime = "nodejs";

function authUserFromRequest(request: Request) {
  const raw = request.headers.get("authorization") || "";
  const m = raw.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  const token = m[1].trim();
  if (!token) return null;
  const payload = verifyJwt(token);
  if (!payload) return null;
  const id = typeof payload.id === "string" ? payload.id : "";
  const email = typeof payload.email === "string" ? payload.email : "";
  const role = typeof payload.role === "string" ? payload.role : "user";
  if (!id || !email) return null;
  return { id, email, role: role.trim().toLowerCase() === "admin" ? "admin" : "user" as const };
}

export async function GET(request: Request) {
  const auth = authUserFromRequest(request);
  if (!auth) return NextResponse.json({ error: { message: "No autorizado", status: 401 } }, { status: 401 });

  const db = openDb();
  if (!db) return NextResponse.json({ error: { message: "Base de datos no encontrada.", status: 500 } }, { status: 500 });
  ensureAuthSchema(db);

  const row = db
    .prepare("SELECT id, email, name, role, email_verified FROM users WHERE id = ? LIMIT 1")
    .get(auth.id) as { id?: string; email?: string; name?: string; role?: string; email_verified?: unknown } | undefined;
  if (!row || !row.id) return NextResponse.json({ error: { message: "Usuario no encontrado", status: 404 } }, { status: 404 });

  const role = row.role && String(row.role).trim().toLowerCase() === "admin" ? "admin" : "user";
  const email_verified = row.email_verified === 1 || row.email_verified === true;

  return NextResponse.json(
    { user: { id: String(row.id), email: String(row.email || auth.email), name: row.name ? String(row.name) : null, role, email_verified } },
    { status: 200 },
  );
}

