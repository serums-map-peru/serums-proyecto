"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { IconButton } from "@/shared/ui/IconButton";
import { cn } from "@/shared/lib/cn";
import { HospitalMapItem, NominatimResult } from "@/features/hospitals/types";
import { clearAuthToken, getAuthToken } from "@/features/auth/token";

export type AppHeaderProps = {
  onOpenFilters: () => void;
  onCenterOnUser?: () => void;
  centerOnUserLoading?: boolean;
  showSearch?: boolean;
  onOpenAuth?: (mode: "login" | "register") => void;
  searchValue: string;
  searchLoading: boolean;
  searchError?: string | null;
  searchResults: NominatimResult[];
  hospitalSearchResults: HospitalMapItem[];
  onSearchChange: (value: string) => void;
  onSelectSearchResult: (item: NominatimResult) => void;
  onSelectHospitalSearchResult: (item: HospitalMapItem) => void;
  onRetrySearch?: () => void;
};

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M4 21a8 8 0 0 1 16 0"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="M4 6h16M7 12h10M10 18h4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CrosshairIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path d="M12 2v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 19v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M2 12h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M19 12h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

export function AppHeader({
  onOpenFilters,
  onCenterOnUser,
  centerOnUserLoading = false,
  showSearch = true,
  onOpenAuth,
  searchValue,
  searchLoading,
  searchError = null,
  searchResults,
  hospitalSearchResults,
  onSearchChange,
  onSelectSearchResult,
  onSelectHospitalSearchResult,
  onRetrySearch,
}: AppHeaderProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);
  const [authed, setAuthed] = React.useState(false);
  const userMenuRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    setAuthed(!!getAuthToken());
  }, []);

  React.useEffect(() => {
    if (!userMenuOpen) return;
    const onDown = (e: MouseEvent) => {
      const el = userMenuRef.current;
      if (!el) return;
      if (e.target && el.contains(e.target as Node)) return;
      setUserMenuOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [userMenuOpen]);

  return (
    <header className="border-b border-[var(--border)] bg-white shadow-sm">
      <div className="mx-auto max-w-[1400px] px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="flex items-center gap-3 rounded-2xl px-1 py-1 text-left hover:bg-slate-50"
            onClick={() => router.push("/")}
            aria-label="Volver al mapa"
            title="Volver al mapa"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-[var(--medical-blue)]">
              <span className="text-lg font-black">S</span>
            </div>
            <div className="leading-tight">
              <div className="text-base font-extrabold text-slate-900">SERUMS Map Perú</div>
              <div className="text-xs font-medium text-slate-500">Mapa de establecimientos</div>
            </div>
          </button>

          {showSearch ? (
          <div className="relative mx-auto hidden w-full max-w-[560px] sm:block">
            <input
              value={searchValue}
              onChange={(e) => {
                onSearchChange(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              onBlur={() => setTimeout(() => setOpen(false), 120)}
              placeholder="Buscar lugar…"
              className="h-10 w-full rounded-2xl border border-[var(--border)] bg-white px-4 text-sm font-semibold text-slate-900 shadow-sm outline-none ring-0 placeholder:text-slate-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
            />

            <div
              className={cn(
                "absolute left-0 right-0 top-[calc(100%+8px)] z-[3500] overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-[0_14px_40px_rgba(15,23,42,0.12)]",
                open && (searchLoading || searchResults.length > 0 || hospitalSearchResults.length > 0 || !!searchError)
                  ? "block"
                  : "hidden",
              )}
            >
              {searchLoading ? (
                <div className="px-4 py-3 text-sm font-semibold text-slate-600">Buscando…</div>
              ) : searchError ? (
                <div className="grid gap-2 px-4 py-3">
                  <div className="text-sm font-semibold text-slate-700">{searchError}</div>
                  {onRetrySearch ? (
                    <button
                      type="button"
                      className="w-fit rounded-2xl border border-[var(--border)] bg-white px-3 py-2 text-xs font-extrabold text-slate-800 shadow-sm hover:bg-slate-50"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={onRetrySearch}
                    >
                      Reintentar
                    </button>
                  ) : null}
                </div>
              ) : (
                <div className="max-h-[340px] overflow-auto">
                  {hospitalSearchResults.length > 0 ? (
                    <div className="border-b border-[var(--border)]">
                      <div className="px-4 py-2 text-[11px] font-extrabold uppercase tracking-wide text-slate-500">
                        Establecimientos
                      </div>
                      {hospitalSearchResults.map((h) => (
                        <button
                          key={h.id}
                          type="button"
                          className="w-full px-4 py-3 text-left hover:bg-slate-50"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            onSelectHospitalSearchResult(h);
                            setOpen(false);
                          }}
                        >
                          <div className="line-clamp-1 text-sm font-extrabold text-slate-900">{h.nombre_establecimiento}</div>
                          <div className="line-clamp-1 text-xs font-semibold text-slate-600">
                            {h.distrito} · {h.provincia} · {h.departamento} · {h.codigo_renipress_modular || h.id}
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : null}

                  {searchResults.length > 0 ? (
                    <div>
                      <div className="px-4 py-2 text-[11px] font-extrabold uppercase tracking-wide text-slate-500">
                        Lugares
                      </div>
                      {searchResults.map((r) => (
                        <button
                          key={r.place_id}
                          type="button"
                          className="w-full px-4 py-3 text-left text-sm font-semibold text-slate-800 hover:bg-slate-50"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            onSelectSearchResult(r);
                            setOpen(false);
                          }}
                        >
                          <div className="line-clamp-2">{r.display_name}</div>
                        </button>
                      ))}
                    </div>
                  ) : null}

                  {hospitalSearchResults.length === 0 && searchResults.length === 0 ? (
                    <div className="px-4 py-3 text-sm font-semibold text-slate-600">Sin resultados</div>
                  ) : null}
                </div>
              )}
            </div>
          </div>
          ) : null}

          <div className="ml-auto flex items-center gap-2">
            <IconButton
              onClick={onCenterOnUser}
              disabled={!onCenterOnUser || centerOnUserLoading}
              aria-label="Centrar en mi ubicación"
              title="Centrar en mi ubicación"
            >
              <CrosshairIcon />
            </IconButton>

            <IconButton
              className="sm:hidden"
              onClick={onOpenFilters}
              aria-label="Abrir filtros"
            >
              <FilterIcon />
            </IconButton>

            <div className="relative" ref={userMenuRef}>
              <IconButton
                aria-label="Usuario"
                title="Perfil"
                onClick={() => {
                  setAuthed(!!getAuthToken());
                  setUserMenuOpen((v) => !v);
                }}
              >
                <UserIcon />
              </IconButton>

              {userMenuOpen ? (
                <div className="absolute right-0 top-[calc(100%+8px)] z-[3600] w-[220px] overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-[0_14px_40px_rgba(15,23,42,0.12)]">
                  <div className="px-4 py-2 text-[11px] font-extrabold uppercase tracking-wide text-slate-500">
                    Perfil
                  </div>
                  <div className="grid gap-1 p-2">
                    {authed ? (
                      <>
                        <button
                          type="button"
                          className="w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-800 hover:bg-slate-50"
                          onClick={() => {
                            setUserMenuOpen(false);
                            if (onOpenAuth) onOpenAuth("login");
                            else router.push("/?auth=login");
                          }}
                        >
                          Cuenta
                        </button>
                        <button
                          type="button"
                          className="w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-800 hover:bg-slate-50"
                          onClick={() => {
                            clearAuthToken();
                            setAuthed(false);
                            setUserMenuOpen(false);
                            router.refresh();
                          }}
                        >
                          Cerrar sesión
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-800 hover:bg-slate-50"
                          onClick={() => {
                            setUserMenuOpen(false);
                            if (onOpenAuth) onOpenAuth("login");
                            else router.push("/?auth=login");
                          }}
                        >
                          Iniciar sesión
                        </button>
                        <button
                          type="button"
                          className="w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-800 hover:bg-slate-50"
                          onClick={() => {
                            setUserMenuOpen(false);
                            if (onOpenAuth) onOpenAuth("register");
                            else router.push("/?auth=register");
                          }}
                        >
                          Crear cuenta
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {showSearch ? (
        <div className="relative mt-3 sm:hidden">
          <input
            value={searchValue}
            onChange={(e) => {
              onSearchChange(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 120)}
            placeholder="Buscar lugar…"
            className="h-10 w-full rounded-2xl border border-[var(--border)] bg-white px-4 text-sm font-semibold text-slate-900 shadow-sm outline-none ring-0 placeholder:text-slate-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
          />

          <div
            className={cn(
              "absolute left-0 right-0 top-[calc(100%+8px)] z-[3500] overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-[0_14px_40px_rgba(15,23,42,0.12)]",
              open && (searchLoading || searchResults.length > 0 || hospitalSearchResults.length > 0 || !!searchError)
                ? "block"
                : "hidden",
            )}
          >
            {searchLoading ? (
              <div className="px-4 py-3 text-sm font-semibold text-slate-600">Buscando…</div>
            ) : searchError ? (
              <div className="grid gap-2 px-4 py-3">
                <div className="text-sm font-semibold text-slate-700">{searchError}</div>
                {onRetrySearch ? (
                  <button
                    type="button"
                    className="w-fit rounded-2xl border border-[var(--border)] bg-white px-3 py-2 text-xs font-extrabold text-slate-800 shadow-sm hover:bg-slate-50"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={onRetrySearch}
                  >
                    Reintentar
                  </button>
                ) : null}
              </div>
            ) : (
              <div className="max-h-[320px] overflow-auto">
                {hospitalSearchResults.length > 0 ? (
                  <div className="border-b border-[var(--border)]">
                    <div className="px-4 py-2 text-[11px] font-extrabold uppercase tracking-wide text-slate-500">
                      Establecimientos
                    </div>
                    {hospitalSearchResults.map((h) => (
                      <button
                        key={h.id}
                        type="button"
                        className="w-full px-4 py-3 text-left hover:bg-slate-50"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          onSelectHospitalSearchResult(h);
                          setOpen(false);
                        }}
                      >
                        <div className="line-clamp-1 text-sm font-extrabold text-slate-900">{h.nombre_establecimiento}</div>
                        <div className="line-clamp-1 text-xs font-semibold text-slate-600">
                          {h.distrito} · {h.provincia} · {h.departamento} · {h.codigo_renipress_modular || h.id}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : null}

                {searchResults.length > 0 ? (
                  <div>
                    <div className="px-4 py-2 text-[11px] font-extrabold uppercase tracking-wide text-slate-500">
                      Lugares
                    </div>
                    {searchResults.map((r) => (
                      <button
                        key={r.place_id}
                        type="button"
                        className="w-full px-4 py-3 text-left text-sm font-semibold text-slate-800 hover:bg-slate-50"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          onSelectSearchResult(r);
                          setOpen(false);
                        }}
                      >
                        <div className="line-clamp-2">{r.display_name}</div>
                      </button>
                    ))}
                  </div>
                ) : null}

                {hospitalSearchResults.length === 0 && searchResults.length === 0 ? (
                  <div className="px-4 py-3 text-sm font-semibold text-slate-600">Sin resultados</div>
                ) : null}
              </div>
            )}
          </div>
        </div>
        ) : null}
      </div>
    </header>
  );
}
