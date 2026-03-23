"use client";

import * as React from "react";

import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { clearAuthToken, getAuthToken, setAuthToken } from "@/features/auth/token";

type Mode = "login" | "register";

function apiBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (configured && configured.trim().length > 0) return configured.trim().replace(/\/$/, "");
  return "http://localhost:4000/api";
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
  const [name, setName] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [info, setInfo] = React.useState<string | null>(null);

  const [token, setToken] = React.useState<string | null>(null);

  const [step, setStep] = React.useState<"auth" | "verify">("auth");
  const [pendingEmail, setPendingEmail] = React.useState("");
  const [verifyCode, setVerifyCode] = React.useState("");
  const [needsVerification, setNeedsVerification] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setToken(getAuthToken());
    setError(null);
    setInfo(null);
    setLoading(false);
    setEmail("");
    setPassword("");
    setName("");
    setStep("auth");
    setPendingEmail("");
    setVerifyCode("");
    setNeedsVerification(false);
  }, [open, mode]);

  React.useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const title = step === "verify" ? "Verificar correo" : mode === "login" ? "Iniciar sesión" : "Crear cuenta";

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
              <div className="truncate text-xs font-medium text-[var(--label)]">
                {step === "verify"
                  ? "Ingresa el código que enviamos a tu correo."
                  : mode === "login"
                    ? "Accede para usar funciones de edición."
                    : "Regístrate para usar funciones de edición."}
              </div>
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
                <div className="grid gap-2">
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={() => {
                      clearAuthToken();
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
            ) : step === "verify" ? (
              <form
                className="grid gap-3"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setLoading(true);
                  setError(null);
                  setInfo(null);
                  try {
                    const r = await fetch(`${apiBaseUrl()}/auth/verify-email`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ email: pendingEmail, code: verifyCode }),
                    });
                    const body = await r.json().catch(() => null);
                    if (!r.ok) throw new Error(extractErrorMessage(body, "No se pudo verificar el correo."));
                    if (!body || typeof body !== "object" || !("token" in body) || typeof body.token !== "string") {
                      throw new Error("Respuesta inválida del servidor.");
                    }
                    setAuthToken(body.token);
                    setToken(body.token);
                    onAuthChange?.();
                    onClose();
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "No se pudo verificar el correo.");
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                <div className="grid gap-1">
                  <div className="text-xs font-medium text-[var(--label)]">Código</div>
                  <input
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    className="h-10 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm font-medium text-[var(--title)] outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
                    placeholder="000000"
                    required
                  />
                  <div className="text-xs font-medium text-[var(--label)]">Enviado a {pendingEmail}</div>
                </div>

                {info ? (
                  <div className="rounded-xl bg-[var(--accent)]/10 px-3 py-2 text-sm font-medium text-[var(--title)]">{info}</div>
                ) : null}
                {error ? (
                  <div className="rounded-xl bg-red-500/10 px-3 py-2 text-sm font-medium text-[var(--title)]">{error}</div>
                ) : null}

                <Button type="submit" variant="primary" className="w-full" disabled={loading}>
                  {loading ? "Verificando…" : "Confirmar"}
                </Button>

                <button
                  type="button"
                  className="text-center text-sm font-medium text-[var(--title)] underline"
                  disabled={loading}
                  onClick={async () => {
                    setLoading(true);
                    setError(null);
                    setInfo(null);
                    try {
                      const r = await fetch(`${apiBaseUrl()}/auth/resend-verification`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ email: pendingEmail }),
                      });
                      const body = await r.json().catch(() => null);
                      if (!r.ok) throw new Error(extractErrorMessage(body, "No se pudo reenviar el código."));
                      setInfo("Código reenviado");
                    } catch (err) {
                      setError(err instanceof Error ? err.message : "No se pudo reenviar el código.");
                    } finally {
                      setLoading(false);
                    }
                  }}
                >
                  Reenviar código
                </button>

                <button
                  type="button"
                  className="text-center text-sm font-medium text-[var(--label)] underline"
                  disabled={loading}
                  onClick={() => {
                    setStep("auth");
                    setError(null);
                    setInfo(null);
                    setVerifyCode("");
                  }}
                >
                  Cambiar email
                </button>
              </form>
            ) : (
              <form
                className="grid gap-3"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setLoading(true);
                  setError(null);
                  setInfo(null);
                  setNeedsVerification(false);
                  try {
                    const path = mode === "login" ? "/auth/login" : "/auth/register";
                    const payload =
                      mode === "login"
                        ? { email, password }
                        : { email, password, name: typeof name === "string" ? name : "" };

                    const r = await fetch(`${apiBaseUrl()}${path}`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(payload),
                    });
                    const body = await r.json().catch(() => null);
                    if (!r.ok) {
                      const msg = extractErrorMessage(body, mode === "login" ? "No se pudo iniciar sesión." : "No se pudo crear la cuenta.");
                      if (mode === "login" && typeof msg === "string" && msg.toLowerCase().includes("verificar")) {
                        setNeedsVerification(true);
                      }
                      throw new Error(msg);
                    }

                    if (body && typeof body === "object" && "token" in body && typeof body.token === "string") {
                      setAuthToken(body.token);
                      setToken(body.token);
                      onAuthChange?.();
                      onClose();
                      return;
                    }

                    if (mode === "register" && body && typeof body === "object" && body.verification_required) {
                      const nextEmail = typeof body.email === "string" ? body.email : email;
                      setPendingEmail(String(nextEmail || "").trim());
                      setStep("verify");
                      setInfo("Te enviamos un código para verificar tu correo.");
                      setVerifyCode("");
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
                  <label className="grid gap-1">
                    <span className="text-xs font-medium text-[var(--label)]">Nombre (opcional)</span>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      type="text"
                      autoComplete="name"
                      className="h-10 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm font-medium text-[var(--title)] outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
                      placeholder="Tu nombre"
                    />
                  </label>
                ) : null}

                <label className="grid gap-1">
                  <span className="text-xs font-medium text-[var(--label)]">Email</span>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    autoComplete="email"
                    className="h-10 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm font-medium text-[var(--title)] outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
                    placeholder="tu@email.com"
                    required
                  />
                </label>

                <label className="grid gap-1">
                  <span className="text-xs font-medium text-[var(--label)]">Contraseña</span>
                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type="password"
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    minLength={mode === "register" ? 8 : undefined}
                    className="h-10 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm font-medium text-[var(--title)] outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
                    placeholder={mode === "register" ? "Mínimo 8 caracteres" : "••••••••"}
                    required
                  />
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

                {needsVerification ? (
                  <button
                    type="button"
                    className="text-center text-sm font-medium text-[var(--title)] underline"
                    onClick={() => {
                      setPendingEmail(String(email || "").trim());
                      setStep("verify");
                      setError(null);
                      setInfo(null);
                      setVerifyCode("");
                    }}
                  >
                    Ingresar código de verificación
                  </button>
                ) : null}

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
