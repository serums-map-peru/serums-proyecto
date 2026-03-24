export function getAuthToken() {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem("serums_auth_token");
  return raw && raw.trim().length > 0 ? raw : null;
}

export function setAuthToken(token: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("serums_auth_token", token);
}

export function clearAuthToken() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem("serums_auth_token");
}

export function getAuthRole(): "admin" | "user" | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem("serums_auth_role");
  if (!raw || raw.trim().length === 0) return null;
  const v = raw.trim().toLowerCase();
  return v === "admin" ? "admin" : v === "user" ? "user" : null;
}

export function setAuthRole(role: "admin" | "user" | string) {
  if (typeof window === "undefined") return;
  const v = String(role || "").trim().toLowerCase();
  if (v !== "admin" && v !== "user") return;
  window.localStorage.setItem("serums_auth_role", v);
}

export function clearAuthRole() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem("serums_auth_role");
}

export function getAuthEmailFromToken() {
  const token = getAuthToken();
  if (!token) return null;
  if (typeof window === "undefined") return null;
  const parts = token.split(".");
  if (parts.length < 2) return null;
  const payload = parts[1];
  try {
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const json = window.atob(padded);
    const parsed = JSON.parse(json);
    if (parsed && typeof parsed === "object" && "email" in parsed && typeof parsed.email === "string") {
      const e = parsed.email.trim();
      return e ? e : null;
    }
    return null;
  } catch {
    return null;
  }
}
