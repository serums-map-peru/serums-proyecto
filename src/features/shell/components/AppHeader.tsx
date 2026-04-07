"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

import { Button } from "@/shared/ui/Button";
import { IconButton } from "@/shared/ui/IconButton";
import { cn } from "@/shared/lib/cn";
import { FavoriteItem, HospitalMapItem, NominatimResult } from "@/features/hospitals/types";
import { clearAuthToken, getAuthToken } from "@/features/auth/token";

function toTitleCase(value: string) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const minor = new Set([
    "a",
    "al",
    "con",
    "de",
    "del",
    "desde",
    "e",
    "el",
    "en",
    "la",
    "las",
    "lo",
    "los",
    "o",
    "para",
    "por",
    "sin",
    "sobre",
    "u",
    "y",
  ]);

  return raw
    .split(/\s+/g)
    .filter(Boolean)
    .map((token, idx) => {
      if (/^\d+$/.test(token)) return token;
      if (/^[A-Z]{2,}(\.[A-Z]{1,})*\.?$/.test(token)) return token;
      const lower = token.toLowerCase();
      if (idx > 0 && minor.has(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

export type AppHeaderProps = {
  onOpenFilters: () => void;
  onCenterOnUser?: () => void;
  centerOnUserLoading?: boolean;
  showSearch?: boolean;
  onOpenAuth?: (mode: "login" | "register") => void;
  onOpenFavoritesPanel?: () => void;
  favorites?: FavoriteItem[];
  favoritesLoading?: boolean;
  favoritesError?: string | null;
  onRefreshFavorites?: () => void;
  onSelectFavorite?: (fav: FavoriteItem) => void;
  onRemoveFavorite?: (fav: FavoriteItem) => void;
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

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path d="M16 16l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function AppHeader({
  onOpenFilters,
  onCenterOnUser,
  centerOnUserLoading = false,
  showSearch = true,
  onOpenAuth,
  onOpenFavoritesPanel,
  favorites = [],
  favoritesLoading = false,
  favoritesError = null,
  onRefreshFavorites,
  onSelectFavorite,
  onRemoveFavorite,
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
  const [mobileSearchOpen, setMobileSearchOpen] = React.useState(false);
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
    <header className="h-[64px] bg-white shadow-[var(--shadow-soft)]">
      <div className="flex h-full items-center px-4 sm:px-5">
        <div className="flex w-full items-center gap-3">
          <button
            type="button"
            className="flex shrink-0 items-center rounded-xl px-2 py-2 text-left transition-colors hover:bg-black/[0.04]"
            onClick={() => router.push("/")}
            aria-label="Volver al mapa"
            title="Volver al mapa"
          >
            <div className="flex h-8 items-center gap-2">
              <Image
                src="/Lisa%20personaje.png"
                alt="LISA"
                width={64}
                height={64}
                priority
                className="h-8 w-8 object-contain"
              />
              <Image
                src="/Lisa%20nombre.png"
                alt="LISA"
                width={160}
                height={48}
                priority
                className="h-7 w-auto object-contain"
              />
            </div>
          </button>

          {showSearch ? (
          <div className="relative hidden min-w-0 flex-1 sm:block">
            <div className="relative mx-auto w-full max-w-[640px]">
              <input
                value={searchValue}
                onChange={(e) => {
                  onSearchChange(e.target.value);
                  setOpen(true);
                }}
                onFocus={() => setOpen(true)}
                onBlur={() => setTimeout(() => setOpen(false), 120)}
                placeholder="Buscar establecimiento, distrito o provincia..."
                className="h-10 w-full rounded-full bg-[var(--search-surface)] px-5 text-sm font-medium text-[var(--title)] shadow-[var(--shadow-soft)] outline-none ring-0 placeholder:text-[var(--label)] focus:ring-2 focus:ring-black/5"
              />

              <div
                className={cn(
                  "absolute left-0 right-0 top-[calc(100%+10px)] z-[3500] overflow-hidden rounded-[var(--radius-panel)] bg-white shadow-[var(--shadow-soft)]",
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
                        Buscar de nuevo
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
          </div>
          ) : null}

          <div className="ml-auto flex items-center gap-2">
            {showSearch ? (
              <IconButton
                className="sm:hidden"
                aria-label="Buscar"
                title="Buscar"
                onClick={() => setMobileSearchOpen(true)}
              >
                <SearchIcon />
              </IconButton>
            ) : null}
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
                onClick={() => {
                  setAuthed(!!getAuthToken());
                  if (onOpenFavoritesPanel) {
                    onOpenFavoritesPanel();
                    setFavoritesOpen(false);
                  } else {
                    setFavoritesOpen((v) => !v);
                  }
                }}
              >
                <HeartIcon />
              </IconButton>

              {!onOpenFavoritesPanel && favoritesOpen ? (
                <div className="absolute right-0 top-[calc(100%+10px)] z-[3600] w-[320px] overflow-hidden rounded-[var(--radius-panel)] border border-[var(--border)] bg-white shadow-[var(--shadow-soft)]">
                  <div className="px-4 py-3">
                    <div className="text-sm font-semibold text-[var(--title)]">Favoritos</div>
                    <div className="mt-0.5 text-xs font-medium text-[var(--label)]">
                      Guarda establecimientos para revisarlos después.
                    </div>
                  </div>
                  <div className="border-t border-[var(--border)] p-2">
                    {!authed ? (
                      <div className="grid gap-2">
                        <div className="px-2 py-2 text-xs font-medium text-[var(--label)]">
                          Inicia sesión para guardar y ver tus favoritos.
                        </div>
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
                    ) : favoritesLoading ? (
                      <div className="px-3 py-3 text-sm font-medium text-[var(--label)]">Cargando…</div>
                    ) : favoritesError ? (
                      <div className="grid gap-2 px-3 py-3">
                        <div className="text-sm font-medium text-[var(--title)]">{favoritesError}</div>
                        {onRefreshFavorites ? (
                          <button
                            type="button"
                            className="w-fit rounded-2xl border border-[var(--border)] bg-white px-3 py-2 text-xs font-semibold text-[var(--title)] shadow-[0_1px_0_rgba(0,0,0,0.04)] hover:bg-black/[0.03]"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={onRefreshFavorites}
                          >
                            Reintentar
                          </button>
                        ) : null}
                      </div>
                    ) : favorites.length === 0 ? (
                      <div className="px-3 py-3 text-xs font-medium text-[var(--label)]">Aún no tienes favoritos.</div>
                    ) : (
                      <div className="grid gap-2">
                        {favorites.map((f) => {
                          const title =
                            f.item_type === "hospital"
                              ? toTitleCase(f.hospital?.nombre_establecimiento || f.name || f.item_id)
                              : f.name || "Lugar";
                          const subtitle =
                            f.item_type === "hospital" && f.hospital
                              ? [f.hospital.provincia, f.hospital.distrito, f.hospital.departamento].filter(Boolean).join(" · ")
                              : f.item_type === "place"
                                ? "Lugar guardado"
                                : "";

                          return (
                            <div
                              key={f.id}
                              className="flex items-start justify-between gap-2 rounded-[var(--radius-card)] bg-black/[0.02] px-3 py-3"
                            >
                              <button
                                type="button"
                                className="min-w-0 text-left"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => {
                                  setFavoritesOpen(false);
                                  onSelectFavorite?.(f);
                                }}
                              >
                                <div className="line-clamp-1 text-sm font-semibold text-[var(--title)]">{title}</div>
                                {subtitle ? (
                                  <div className="line-clamp-1 text-xs font-medium text-[var(--label)]">{subtitle}</div>
                                ) : null}
                              </button>
                              <button
                                type="button"
                                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-white text-[var(--label)] shadow-[0_1px_0_rgba(0,0,0,0.04)] hover:bg-black/[0.03]"
                                aria-label="Quitar de favoritos"
                                title="Quitar de favoritos"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => onRemoveFavorite?.(f)}
                              >
                                <XIcon />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
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
      </div>

      {showSearch && mobileSearchOpen ? (
        <div className="fixed inset-0 z-[4000] sm:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/20" onClick={() => setMobileSearchOpen(false)} />
          <div className="absolute inset-x-0 top-0 p-3">
            <div className="mx-auto w-full max-w-[640px] overflow-hidden rounded-[var(--radius-panel)] bg-white shadow-[var(--shadow-soft)]">
              <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-3">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <div className="text-[var(--label)]">
                    <SearchIcon />
                  </div>
                  <input
                    autoFocus
                    value={searchValue}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="Buscar establecimiento, distrito o provincia..."
                    className="h-10 min-w-0 flex-1 bg-transparent text-sm font-medium text-[var(--title)] outline-none placeholder:text-[var(--label)]"
                  />
                  {searchValue.trim() ? (
                    <button
                      type="button"
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-white text-[var(--label)] hover:bg-black/[0.03]"
                      aria-label="Limpiar búsqueda"
                      onClick={() => onSearchChange("")}
                    >
                      <XIcon />
                    </button>
                  ) : null}
                </div>

                <button
                  type="button"
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-[var(--border)] bg-white px-3 text-sm font-semibold text-[var(--title)] hover:bg-black/[0.03]"
                  onClick={() => setMobileSearchOpen(false)}
                >
                  Cerrar
                </button>
              </div>

              <div className="max-h-[70vh] overflow-auto">
                {searchLoading ? (
                  <div className="px-4 py-3 text-sm font-medium text-[var(--label)]">Buscando…</div>
                ) : searchError ? (
                  <div className="grid gap-2 px-4 py-3">
                    <div className="text-sm font-medium text-[var(--title)]">{searchError}</div>
                    {onRetrySearch ? (
                      <button
                        type="button"
                        className="w-fit rounded-2xl border border-[var(--border)] bg-white px-3 py-2 text-xs font-semibold text-[var(--title)] shadow-[0_1px_0_rgba(0,0,0,0.04)] hover:bg-black/[0.03]"
                        onClick={onRetrySearch}
                      >
                        Buscar de nuevo
                      </button>
                    ) : null}
                  </div>
                ) : (
                  <div>
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
                            onClick={() => {
                              onSelectHospitalSearchResult(h);
                              setMobileSearchOpen(false);
                            }}
                          >
                            <div className="line-clamp-1 text-sm font-semibold text-[var(--title)]">
                              {toTitleCase(h.nombre_establecimiento)}
                            </div>
                            <div className="line-clamp-1 text-xs font-medium text-[var(--label)]">
                              {h.distrito} · {h.provincia} · {h.departamento} · {h.codigo_renipress_modular || h.id}
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : null}

                    {searchResults.length > 0 ? (
                      <div className={hospitalSearchResults.length > 0 ? "border-b border-[var(--border)]" : ""}>
                        <div className="px-4 py-2 text-[11px] font-semibold tracking-wide text-[var(--label)]">Lugares</div>
                        {searchResults.map((r) => (
                          <button
                            key={r.place_id}
                            type="button"
                            className="w-full px-4 py-3 text-left text-sm font-medium text-[var(--title)] hover:bg-black/[0.03]"
                            onClick={() => {
                              onSelectSearchResult(r);
                              setMobileSearchOpen(false);
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
          </div>
        </div>
      ) : null}
    </header>
  );
}
