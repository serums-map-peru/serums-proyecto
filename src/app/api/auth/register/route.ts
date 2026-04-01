import { NextResponse } from "next/server";

import { ensureAuthSchema, openDb } from "@/app/api/_shared/db";
import { generateId, hashPassword, isValidEmailFormat, normalizeEmail, nowIso, signJwt } from "@/app/api/_shared/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const emailRaw = body && typeof body.email === "string" ? body.email : "";
  const passwordRaw = body && typeof body.password === "string" ? body.password : "";
  const nameRaw = body && typeof body.name === "string" ? body.name : "";

  const email = normalizeEmail(emailRaw);
  const password = String(passwordRaw || "");
  const name = String(nameRaw || "").trim();

  if (!isValidEmailFormat(email)) {
    return NextResponse.json({ error: { message: "Email inválido", status: 400 } }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: { message: "La contraseña debe tener al menos 8 caracteres", status: 400 } }, { status: 400 });
  }
  if (!name) {
    return NextResponse.json({ error: { message: "Nombre y apellido son obligatorios", status: 400 } }, { status: 400 });
  }

  const db = openDb();
  if (!db) return NextResponse.json({ error: { message: "Base de datos no encontrada.", status: 500 } }, { status: 500 });
  ensureAuthSchema(db);

  const existing = db.prepare("SELECT id FROM users WHERE lower(email) = lower(?) LIMIT 1").get(email) as { id?: string } | undefined;
  if (existing && existing.id) {
    return NextResponse.json({ error: { message: "Este email ya está registrado", status: 409 } }, { status: 409 });
  }

  const id = generateId();
  const created_at = nowIso();
  const password_hash = hashPassword(password);
  const role = email === "admin@localisa.com" ? "admin" : "user";

  db.prepare(
    "INSERT INTO users (id, email, password_hash, name, role, email_verified, email_verified_at, created_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?)",
  ).run(id, email, password_hash, name, role, created_at, created_at);

  try {
    const token = signJwt({ id, email, role, iat: Math.floor(Date.now() / 1000) });
    return NextResponse.json({ token, user: { id, email, name, role, email_verified: true } }, { status: 200 });
  } catch {
    return NextResponse.json({ error: { message: "Configuración inválida del servidor (JWT_SECRET).", status: 500 } }, { status: 500 });
  }
}
