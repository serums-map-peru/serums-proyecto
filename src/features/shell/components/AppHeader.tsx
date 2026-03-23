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
        strokeWidth="1.5"
      />
      <path
        d="M4 21a8 8 0 0 1 16 0"
        stroke="currentColor"
        strokeWidth="1.5"
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
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CrosshairIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path d="M12 2v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12 19v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M2 12h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M19 12h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path
        d="M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="M20.3 7.6a4.6 4.6 0 0 0-6.5 0L12 9.4l-1.8-1.8a4.6 4.6 0 0 0-6.5 6.5l1.8 1.8L12 21l6.5-5.1 1.8-1.8a4.6 4.6 0 0 0 0-6.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
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
  const [favoritesOpen, setFavoritesOpen] = React.useState(false);
  const [authed, setAuthed] = React.useState(false);
  const userMenuRef = React.useRef<HTMLDivElement | null>(null);
  const favoritesMenuRef = React.useRef<HTMLDivElement | null>(null);

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

  React.useEffect(() => {
    if (!favoritesOpen) return;
    const onDown = (e: MouseEvent) => {
      const el = favoritesMenuRef.current;
      if (!el) return;
      if (e.target && el.contains(e.target as Node)) return;
      setFavoritesOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [favoritesOpen]);

  return (
    <header className="bg-white shadow-[var(--shadow-soft)]">
      <div className="px-4 py-3 sm:px-5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="flex items-center gap-3 rounded-2xl px-1 py-1 text-left hover:bg-black/[0.03]"
            onClick={() => router.push("/")}
            aria-label="Volver al mapa"
            title="Volver al mapa"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-black/[0.04] text-[var(--title)]">
              <span className="text-lg font-semibold">S</span>
            </div>
            <div className="leading-tight">
              <div className="text-base font-semibold text-[var(--title)]">SERUMS Map Perú</div>
              <div className="text-xs font-medium text-[var(--label)]">Mapa de establecimientos</div>
            </div>
          </button>

          {showSearch ? (
          <div className="relative mx-auto hidden w-full max-w-[640px] sm:block">
            <input
              value={searchValue}
              onChange={(e) => {
                onSearchChange(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              onBlur={() => setTimeout(() => setOpen(false), 120)}
              placeholder="Buscar lugar…"
              className="h-10 w-full rounded-2xl border border-[var(--border)] bg-white px-4 text-sm font-medium text-[var(--title)] shadow-[var(--shadow-soft)] outline-none ring-0 placeholder:text-[var(--label)] focus:border-black/10 focus:ring-2 focus:ring-black/5"
            />

            <div
              className={cn(
                "absolute left-0 right-0 top-[calc(100%+10px)] z-[3500] overflow-hidden rounded-[var(--radius-panel)] border border-[var(--border)] bg-white shadow-[var(--shadow-soft)]",
                open && (searchLoading || searchResults.length > 0 || hospitalSearchResults.length > 0 || !!searchError)
                  ? "block"
                  : "hidden",
              )}
            >
              {searchLoading ? (
                <div className="px-4 py-3 text-sm font-medium text-[var(--label)]">Buscando…</div>
              ) : searchError ? (
                <div className="grid gap-2 px-4 py-3">
                  <div className="text-sm font-medium text-[var(--title)]">{searchError}</div>
                  {onRetrySearch ? (
                    <button
                      type="button"
                      className="w-fit rounded-2xl border border-[var(--border)] bg-white px-3 py-2 text-xs font-semibold text-[var(--title)] shadow-[0_1px_0_rgba(0,0,0,0.04)] hover:bg-black/[0.03]"
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
                      <div className="px-4 py-2 text-[11px] font-semibold tracking-wide text-[var(--label)]">
                        Establecimientos
                      </div>
                      {hospitalSearchResults.map((h) => (
                        <button
                          key={h.id}
                          type="button"
                          className="w-full px-4 py-3 text-left hover:bg-black/[0.03]"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            onSelectHospitalSearchResult(h);
                            setOpen(false);
                          }}
                        >
                          <div className="line-clamp-1 text-sm font-semibold text-[var(--title)]">{h.nombre_establecimiento}</div>
                          <div className="line-clamp-1 text-xs font-medium text-[var(--label)]">
                            {h.distrito} · {h.provincia} · {h.departamento} · {h.codigo_renipress_modular || h.id}
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : null}

                  {searchResults.length > 0 ? (
                    <div>
                      <div className="px-4 py-2 text-[11px] font-semibold tracking-wide text-[var(--label)]">
                        Lugares
                      </div>
                      {searchResults.map((r) => (
                        <button
                          key={r.place_id}
                          type="button"
                          className="w-full px-4 py-3 text-left text-sm font-medium text-[var(--title)] hover:bg-black/[0.03]"
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
                    <div className="px-4 py-3 text-sm font-medium text-[var(--label)]">Sin resultados</div>
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

            <div className="relative" ref={favoritesMenuRef}>
              <IconButton
                aria-label="Favoritos"
                title="Favoritos"
                onClick={() => setFavoritesOpen((v) => !v)}
              >
                <HeartIcon />
              </IconButton>

              {favoritesOpen ? (
                <div className="absolute right-0 top-[calc(100%+10px)] z-[3600] w-[320px] overflow-hidden rounded-[var(--radius-panel)] border border-[var(--border)] bg-white shadow-[var(--shadow-soft)]">
                  <div className="px-4 py-3">
                    <div className="text-sm font-semibold text-[var(--title)]">Favoritos</div>
                    <div className="mt-0.5 text-xs font-medium text-[var(--label)]">
                      Guarda establecimientos para revisarlos después.
                    </div>
                  </div>
                  <div className="border-t border-[var(--border)] p-2">
                    <div className="grid gap-2">
                      <button
                        type="button"
                        className="flex items-start justify-between gap-3 rounded-[var(--radius-card)] bg-black/[0.02] px-3 py-3 text-left hover:bg-black/[0.04]"
                      >
                        <div className="min-w-0">
                          <div className="line-clamp-1 text-sm font-semibold text-[var(--title)]">Centro De Salud Referencial</div>
                          <div className="line-clamp-1 text-xs font-medium text-[var(--label)]">Provincia · Distrito · Departamento</div>
                        </div>
                        <div className="mt-0.5 text-[var(--label)]">
                          <HeartIcon />
                        </div>
                      </button>
                      <button
                        type="button"
                        className="flex items-start justify-between gap-3 rounded-[var(--radius-card)] bg-black/[0.02] px-3 py-3 text-left hover:bg-black/[0.04]"
                      >
                        <div className="min-w-0">
                          <div className="line-clamp-1 text-sm font-semibold text-[var(--title)]">Hospital Regional</div>
                          <div className="line-clamp-1 text-xs font-medium text-[var(--label)]">Provincia · Distrito · Departamento</div>
                        </div>
                        <div className="mt-0.5 text-[var(--label)]">
                          <HeartIcon />
                        </div>
                      </button>
                    </div>
                    <div className="mt-2 grid gap-2">
                      <Button
                        variant="secondary"
                        className="w-full"
                        onClick={() => {
                          setFavoritesOpen(false);
                          if (onOpenAuth) onOpenAuth("login");
                          else router.push("/?auth=login");
                        }}
                      >
                        Iniciar sesión
                      </Button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

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
                <div className="absolute right-0 top-[calc(100%+10px)] z-[3600] w-[220px] overflow-hidden rounded-[var(--radius-panel)] border border-[var(--border)] bg-white shadow-[var(--shadow-soft)]">
                  <div className="px-4 py-2 text-[11px] font-semibold tracking-wide text-[var(--label)]">
                    Perfil
                  </div>
                  <div className="grid gap-1 p-2">
                    {authed ? (
                      <>
                        <button
                          type="button"
                          className="w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-[var(--title)] hover:bg-black/[0.03]"
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
                          className="w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-[var(--title)] hover:bg-black/[0.03]"
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
                          className="w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-[var(--title)] hover:bg-black/[0.03]"
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
                          className="w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-[var(--title)] hover:bg-black/[0.03]"
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
            className="h-10 w-full rounded-2xl border border-[var(--border)] bg-white px-4 text-sm font-medium text-[var(--title)] shadow-[var(--shadow-soft)] outline-none ring-0 placeholder:text-[var(--label)] focus:border-black/10 focus:ring-2 focus:ring-black/5"
          />

          <div
            className={cn(
              "absolute left-0 right-0 top-[calc(100%+10px)] z-[3500] overflow-hidden rounded-[var(--radius-panel)] border border-[var(--border)] bg-white shadow-[var(--shadow-soft)]",
              open && (searchLoading || searchResults.length > 0 || hospitalSearchResults.length > 0 || !!searchError)
                ? "block"
                : "hidden",
            )}
          >
            {searchLoading ? (
              <div className="px-4 py-3 text-sm font-medium text-[var(--label)]">Buscando…</div>
            ) : searchError ? (
              <div className="grid gap-2 px-4 py-3">
                <div className="text-sm font-medium text-[var(--title)]">{searchError}</div>
                {onRetrySearch ? (
                  <button
                    type="button"
                    className="w-fit rounded-2xl border border-[var(--border)] bg-white px-3 py-2 text-xs font-semibold text-[var(--title)] shadow-[0_1px_0_rgba(0,0,0,0.04)] hover:bg-black/[0.03]"
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
                    <div className="px-4 py-2 text-[11px] font-semibold tracking-wide text-[var(--label)]">
                      Establecimientos
                    </div>
                    {hospitalSearchResults.map((h) => (
                      <button
                        key={h.id}
                        type="button"
                        className="w-full px-4 py-3 text-left hover:bg-black/[0.03]"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          onSelectHospitalSearchResult(h);
                          setOpen(false);
                        }}
                      >
                        <div className="line-clamp-1 text-sm font-semibold text-[var(--title)]">{h.nombre_establecimiento}</div>
                        <div className="line-clamp-1 text-xs font-medium text-[var(--label)]">
                          {h.distrito} · {h.provincia} · {h.departamento} · {h.codigo_renipress_modular || h.id}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : null}

                {searchResults.length > 0 ? (
                  <div>
                    <div className="px-4 py-2 text-[11px] font-semibold tracking-wide text-[var(--label)]">
                      Lugares
                    </div>
                    {searchResults.map((r) => (
                      <button
                        key={r.place_id}
                        type="button"
                        className="w-full px-4 py-3 text-left text-sm font-medium text-[var(--title)] hover:bg-black/[0.03]"
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
                  <div className="px-4 py-3 text-sm font-medium text-[var(--label)]">Sin resultados</div>
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
