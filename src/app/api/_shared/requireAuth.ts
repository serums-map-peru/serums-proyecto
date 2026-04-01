import { verifyJwt } from "@/app/api/_shared/auth";

export function getAuthUser(request: Request) {
  const raw = request.headers.get("authorization") || "";
  const m = raw.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  const token = m[1].trim();
  if (!token) return null;
  const payload = verifyJwt(token);
  if (!payload) return null;
  const id = typeof payload.id === "string" ? payload.id : "";
  const email = typeof payload.email === "string" ? payload.email : "";
  const roleRaw = typeof payload.role === "string" ? payload.role : "user";
  const role = roleRaw.trim().toLowerCase() === "admin" ? "admin" : "user";
  if (!id || !email) return null;
  return { id, email, role };
}
