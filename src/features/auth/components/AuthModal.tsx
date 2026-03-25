"use client";

import * as React from "react";

import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import {
  clearAuthRole,
  clearAuthToken,
  getAuthEmailFromToken,
  getAuthRole,
  getAuthToken,
  setAuthRole,
  setAuthToken,
} from "@/features/auth/token";

type Mode = "login" | "register";

type FieldErrors = Partial<Record<"firstName" | "lastName" | "email" | "password", string>>;

function apiBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (configured && configured.trim().length > 0) return configured.trim().replace(/\/$/, "");
  return "http://localhost:4000/api";
}

function isValidEmailFormat(email: string) {
  const e = String(email || "").trim();
  if (!e) return false;
  if (e.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

function extractErrorMessage(body: unknown, fallback: string) {
  if (body && typeof body === "object" && "error" in body && body.error && typeof body.error === "object") {
    const e = body.error as { message?: unknown };
    if (typeof e.message === "string" && e.message.trim()) return e.message;
  }
  return fallback;
}

export type AuthModalProps = {
  open: boolean;
  mode: Mode;
  onClose: () => void;
  onChangeMode: (mode: Mode) => void;
  onAuthChange?: () => void;
};

export function AuthModal({ open, mode, onClose, onChangeMode, onAuthChange }: AuthModalProps) {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [info, setInfo] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({});
  const [touched, setTouched] = React.useState<Partial<Record<keyof FieldErrors, boolean>>>({});

  const [token, setToken] = React.useState<string | null>(null);
  const [sessionInfo, setSessionInfo] = React.useState<{ email: string | null; role: "admin" | "user" | null } | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setToken(getAuthToken());
    setSessionInfo(null);
    setError(null);
    setInfo(null);
    setLoading(false);
    setEmail("");
    setPassword("");
    setFirstName("");
    setLastName("");
    setFieldErrors({});
    setTouched({});
  }, [open, mode]);

  React.useEffect(() => {
    if (!open) return;
    if (!token) {
      setSessionInfo(null);
      return;
    }
    const initial = {
      email: getAuthEmailFromToken(),
      role: getAuthRole(),
    };
    setSessionInfo(initial);
    fetch(`${apiBaseUrl()}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (r) => (r.ok ? r.json().catch(() => null) : null))
      .then((me) => {
        const email =
          me &&
          typeof me === "object" &&
          "user" in me &&
          me.user &&
          typeof me.user === "object" &&
          "email" in me.user &&
          typeof (me.user as { email?: unknown }).email === "string"
            ? String((me.user as { email?: unknown }).email || "")
            : null;
        const role =
          me &&
          typeof me === "object" &&
          "user" in me &&
          me.user &&
          typeof me.user === "object" &&
          "role" in me.user &&
          typeof (me.user as { role?: unknown }).role === "string"
            ? String((me.user as { role?: unknown }).role || "")
            : null;
        const normalizedRole = role && role.trim().toLowerCase() === "admin" ? "admin" : role ? "user" : null;
        setSessionInfo({ email: email && email.trim() ? email.trim() : initial.email, role: normalizedRole ?? initial.role });
      })
      .catch(() => null);
  }, [open, token]);

  React.useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const title = mode === "login" ? "Iniciar sesión" : "Crear cuenta";

  const validate = React.useCallback((): FieldErrors => {
    const next: FieldErrors = {};
    const e = email.trim();
    const p = password;
    if (!e) next.email = "Email requerido";
    else if (!isValidEmailFormat(e)) next.email = "Email inválido";
    if (!p) next.password = "Contraseña requerida";
    else if (mode === "register" && p.length < 8) next.password = "Mínimo 8 caracteres";
    if (mode === "register") {
      if (!firstName.trim()) next.firstName = "Nombre requerido";
      if (!lastName.trim()) next.lastName = "Apellido requerido";
    }
    return next;
  }, [email, firstName, lastName, mode, password]);

  return (
    <div
      className={cn("fixed inset-0 z-[4000]", open ? "pointer-events-auto" : "pointer-events-none")}
      aria-hidden={!open}
    >
      <div
        className={cn(
          "absolute inset-0 bg-black/25 backdrop-blur-[6px] transition-opacity",
          open ? "opacity-100" : "opacity-0",
        )}
        onClick={onClose}
      />

      <div
        className={cn(
          "absolute left-1/2 top-1/2 w-[92%] max-w-[420px] -translate-x-1/2 -translate-y-1/2 p-3 transition-[transform,opacity]",
          open ? "scale-100 opacity-100" : "scale-95 opacity-0",
        )}
      >
        <Card className="overflow-hidden bg-white">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
            <div className="min-w-0">
              <div className="text-base font-semibold text-[var(--title)]">{title}</div>
              <div className="truncate text-xs font-medium text-[var(--label)]">{mode === "login" ? "Accede para usar funciones de edición." : "Regístrate para usar funciones de edición."}</div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-white text-[var(--title)] shadow-[var(--shadow-soft)] hover:bg-black/[0.03]"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
                <path d="M18 6 6 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M6 6l12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <div className="p-4">
            {token ? (
              <div className="grid gap-3">
                <div className="text-sm font-medium text-[var(--title)]">Sesión activa en este navegador.</div>
                {sessionInfo ? (
                  <div className="text-xs font-medium text-[var(--label)]">
                    {sessionInfo.email ? `Cuenta: ${sessionInfo.email}` : "Cuenta: —"}
                    {(() => {
                      const guessedAdmin =
                        sessionInfo.email && sessionInfo.email.trim().toLowerCase() === "admin@localisa.com" ? "admin" : null;
                      const roleToShow = sessionInfo.role ?? guessedAdmin;
                      return roleToShow ? ` · Rol: ${roleToShow}` : "";
                    })()}
                  </div>
                ) : null}
                <div className="grid gap-2">
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={() => {
                      clearAuthToken();
                      clearAuthRole();
                      setToken(null);
                      onAuthChange?.();
                    }}
                  >
                    Cerrar sesión
                  </Button>
                  <Button variant="primary" className="w-full" onClick={onClose}>
                    Continuar
                  </Button>
                </div>
              </div>
            ) : (
              <form
                className="grid gap-3"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const nextErrors = validate();
                  setFieldErrors(nextErrors);
                  setTouched({ firstName: true, lastName: true, email: true, password: true });
                  if (Object.keys(nextErrors).length > 0) return;
                  setLoading(true);
                  setError(null);
                  setInfo(null);
                  try {
                    clearAuthRole();
                    const path = mode === "login" ? "/auth/login" : "/auth/register";
                    const payload =
                      mode === "login"
                        ? { email, password }
                        : { email, password, name: `${firstName.trim()} ${lastName.trim()}`.trim() };

                    const r = await fetch(`${apiBaseUrl()}${path}`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(payload),
                    });
                    const body = await r.json().catch(() => null);
                    if (!r.ok) {
                      const msg = extractErrorMessage(body, mode === "login" ? "No se pudo iniciar sesión." : "No se pudo crear la cuenta.");
                      throw new Error(msg);
                    }

                    if (body && typeof body === "object" && "token" in body && typeof body.token === "string") {
                      const tokenValue = body.token;
                      if ("user" in body && body.user && typeof body.user === "object" && "role" in body.user) {
                        const r = (body.user as { role?: unknown }).role;
                        if (typeof r === "string" && r.trim()) setAuthRole(r);
                      } else {
                        fetch(`${apiBaseUrl()}/auth/me`, { headers: { Authorization: `Bearer ${tokenValue}` } })
                          .then(async (r) => (r.ok ? r.json().catch(() => null) : null))
                          .then((me) => {
                            const role =
                              me &&
                              typeof me === "object" &&
                              "user" in me &&
                              me.user &&
                              typeof me.user === "object" &&
                              "role" in me.user &&
                              typeof (me.user as { role?: unknown }).role === "string"
                                ? String((me.user as { role?: unknown }).role || "")
                                : "";
                            if (role.trim()) setAuthRole(role);
                          })
                          .catch(() => null);
                      }
                      setAuthToken(tokenValue);
                      setToken(tokenValue);
                      onAuthChange?.();
                      onClose();
                      return;
                    }

                    throw new Error("Respuesta inválida del servidor.");
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "No se pudo completar la operación.");
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                {mode === "register" ? (
                  <>
                    <label className="grid gap-1">
                      <span className="text-xs font-medium text-[var(--label)]">Nombre</span>
                      <input
                        value={firstName}
                        onChange={(e) => {
                          const v = e.target.value;
                          setFirstName(v);
                          if (touched.firstName) setFieldErrors((p) => ({ ...p, firstName: v.trim() ? undefined : "Nombre requerido" }));
                        }}
                        onBlur={() => {
                          setTouched((p) => ({ ...p, firstName: true }));
                          setFieldErrors((p) => ({ ...p, firstName: firstName.trim() ? undefined : "Nombre requerido" }));
                        }}
                        type="text"
                        autoComplete="given-name"
                        aria-invalid={!!(touched.firstName && fieldErrors.firstName)}
                        aria-describedby={touched.firstName && fieldErrors.firstName ? "auth-firstname-error" : undefined}
                        className={cn(
                          "h-10 w-full rounded-xl border bg-white px-3 text-sm font-medium text-[var(--title)] outline-none focus:ring-2 focus:ring-[var(--ring)]/40",
                          touched.firstName && fieldErrors.firstName ? "border-red-500" : "border-[var(--border)]",
                        )}
                        placeholder="Tu nombre"
                        required
                      />
                      {touched.firstName && fieldErrors.firstName ? (
                        <div id="auth-firstname-error" className="text-xs font-medium text-red-600">
                          {fieldErrors.firstName}
                        </div>
                      ) : null}
                    </label>
                    <label className="grid gap-1">
                      <span className="text-xs font-medium text-[var(--label)]">Apellido</span>
                      <input
                        value={lastName}
                        onChange={(e) => {
                          const v = e.target.value;
                          setLastName(v);
                          if (touched.lastName) setFieldErrors((p) => ({ ...p, lastName: v.trim() ? undefined : "Apellido requerido" }));
                        }}
                        onBlur={() => {
                          setTouched((p) => ({ ...p, lastName: true }));
                          setFieldErrors((p) => ({ ...p, lastName: lastName.trim() ? undefined : "Apellido requerido" }));
                        }}
                        type="text"
                        autoComplete="family-name"
                        aria-invalid={!!(touched.lastName && fieldErrors.lastName)}
                        aria-describedby={touched.lastName && fieldErrors.lastName ? "auth-lastname-error" : undefined}
                        className={cn(
                          "h-10 w-full rounded-xl border bg-white px-3 text-sm font-medium text-[var(--title)] outline-none focus:ring-2 focus:ring-[var(--ring)]/40",
                          touched.lastName && fieldErrors.lastName ? "border-red-500" : "border-[var(--border)]",
                        )}
                        placeholder="Tu apellido"
                        required
                      />
                      {touched.lastName && fieldErrors.lastName ? (
                        <div id="auth-lastname-error" className="text-xs font-medium text-red-600">
                          {fieldErrors.lastName}
                        </div>
                      ) : null}
                    </label>
                  </>
                ) : null}

                <label className="grid gap-1">
                  <span className="text-xs font-medium text-[var(--label)]">Email</span>
                  <input
                    value={email}
                    onChange={(e) => {
                      const v = e.target.value;
                      setEmail(v);
                      if (touched.email) {
                        const msg = !v.trim() ? "Email requerido" : isValidEmailFormat(v) ? undefined : "Email inválido";
                        setFieldErrors((p) => ({ ...p, email: msg }));
                      }
                    }}
                    onBlur={() => {
                      setTouched((p) => ({ ...p, email: true }));
                      const msg = !email.trim() ? "Email requerido" : isValidEmailFormat(email) ? undefined : "Email inválido";
                      setFieldErrors((p) => ({ ...p, email: msg }));
                    }}
                    type="email"
                    autoComplete="email"
                    aria-invalid={!!(touched.email && fieldErrors.email)}
                    aria-describedby={touched.email && fieldErrors.email ? "auth-email-error" : undefined}
                    className={cn(
                      "h-10 w-full rounded-xl border bg-white px-3 text-sm font-medium text-[var(--title)] outline-none focus:ring-2 focus:ring-[var(--ring)]/40",
                      touched.email && fieldErrors.email ? "border-red-500" : "border-[var(--border)]",
                    )}
                    placeholder="tu@email.com"
                    required
                  />
                  {touched.email && fieldErrors.email ? (
                    <div id="auth-email-error" className="text-xs font-medium text-red-600">
                      {fieldErrors.email}
                    </div>
                  ) : null}
                </label>

                <label className="grid gap-1">
                  <span className="text-xs font-medium text-[var(--label)]">Contraseña</span>
                  <input
                    value={password}
                    onChange={(e) => {
                      const v = e.target.value;
                      setPassword(v);
                      if (touched.password) {
                        const msg = !v ? "Contraseña requerida" : mode === "register" && v.length < 8 ? "Mínimo 8 caracteres" : undefined;
                        setFieldErrors((p) => ({ ...p, password: msg }));
                      }
                    }}
                    onBlur={() => {
                      setTouched((p) => ({ ...p, password: true }));
                      const msg = !password ? "Contraseña requerida" : mode === "register" && password.length < 8 ? "Mínimo 8 caracteres" : undefined;
                      setFieldErrors((p) => ({ ...p, password: msg }));
                    }}
                    type="password"
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    minLength={mode === "register" ? 8 : undefined}
                    aria-invalid={!!(touched.password && fieldErrors.password)}
                    aria-describedby={touched.password && fieldErrors.password ? "auth-password-error" : undefined}
                    className={cn(
                      "h-10 w-full rounded-xl border bg-white px-3 text-sm font-medium text-[var(--title)] outline-none focus:ring-2 focus:ring-[var(--ring)]/40",
                      touched.password && fieldErrors.password ? "border-red-500" : "border-[var(--border)]",
                    )}
                    placeholder={mode === "register" ? "Mínimo 8 caracteres" : "••••••••"}
                    required
                  />
                  {touched.password && fieldErrors.password ? (
                    <div id="auth-password-error" className="text-xs font-medium text-red-600">
                      {fieldErrors.password}
                    </div>
                  ) : null}
                </label>

                {info ? (
                  <div className="rounded-xl bg-[var(--accent)]/10 px-3 py-2 text-sm font-medium text-[var(--title)]">{info}</div>
                ) : null}
                {error ? (
                  <div className="rounded-xl bg-red-500/10 px-3 py-2 text-sm font-medium text-[var(--title)]">{error}</div>
                ) : null}

                <Button type="submit" variant="primary" className="w-full" disabled={loading}>
                  {loading ? "Procesando…" : mode === "login" ? "Entrar" : "Crear cuenta"}
                </Button>

                <button
                  type="button"
                  className="text-center text-sm font-medium text-[var(--title)] underline"
                  onClick={() => onChangeMode(mode === "login" ? "register" : "login")}
                >
                  {mode === "login" ? "Crear cuenta" : "Ya tengo cuenta"}
                </button>
              </form>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
