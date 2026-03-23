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

