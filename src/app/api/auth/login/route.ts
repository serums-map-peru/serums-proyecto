import { NextResponse } from "next/server";

import { ensureAuthSchema, openDb } from "@/app/api/_shared/db";
import { isValidEmailFormat, normalizeEmail, signJwt, verifyPassword } from "@/app/api/_shared/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const emailRaw = body && typeof body.email === "string" ? body.email : "";
  const passwordRaw = body && typeof body.password === "string" ? body.password : "";

  const email = normalizeEmail(emailRaw);
  const password = String(passwordRaw || "");

  if (!isValidEmailFormat(email)) {
    return NextResponse.json({ error: { message: "Email inválido", status: 400 } }, { status: 400 });
  }
  if (!password) {
    return NextResponse.json({ error: { message: "Contraseña requerida", status: 400 } }, { status: 400 });
  }

  const db = openDb();
  if (!db) return NextResponse.json({ error: { message: "Base de datos no encontrada.", status: 500 } }, { status: 500 });
  ensureAuthSchema(db);

  const row = db
    .prepare("SELECT id, email, password_hash, name, role FROM users WHERE lower(email) = lower(?) LIMIT 1")
    .get(email) as { id?: string; email?: string; password_hash?: string; name?: string; role?: string } | undefined;
  if (!row || !row.id || !row.password_hash) {
    return NextResponse.json({ error: { message: "Credenciales inválidas", status: 401 } }, { status: 401 });
  }

  const ok = verifyPassword(password, String(row.password_hash));
  if (!ok) {
    return NextResponse.json({ error: { message: "Credenciales inválidas", status: 401 } }, { status: 401 });
  }

  const role = row.role && String(row.role).trim().toLowerCase() === "admin" ? "admin" : "user";
  try {
    const token = signJwt({ id: String(row.id), email: String(row.email || email), role, iat: Math.floor(Date.now() / 1000) });
    return NextResponse.json(
      {
        token,
        user: { id: String(row.id), email: String(row.email || email), name: row.name ? String(row.name) : null, role, email_verified: true },
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json({ error: { message: "Configuración inválida del servidor (JWT_SECRET).", status: 500 } }, { status: 500 });
  }
}
