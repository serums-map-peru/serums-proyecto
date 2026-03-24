"use client";

import * as React from "react";

import { FiltersBar } from "@/features/hospitals/components/FiltersBar";
import { HospitalDetailPanel } from "@/features/hospitals/components/HospitalDetailPanel";
import { useHospitalFiltering } from "@/features/hospitals/hooks/useHospitalFiltering";
import {
  FavoriteItem,
  Hospital,
  HospitalMapItem,
  NearbyPlace,
  NearbyPlacesResponse,
  NearestAirportResponse,
  NominatimResult,
  RouteResponse,
} from "@/features/hospitals/types";
import { HospitalMap } from "@/features/map/components/HospitalMap";
import { AppHeader } from "@/features/shell/components/AppHeader";
import { getAuthEmailFromToken, getAuthRole, getAuthToken, setAuthRole as persistAuthRole } from "@/features/auth/token";
import { AuthModal } from "@/features/auth/components/AuthModal";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/Button";

function geolocationErrorMessage(err: unknown) {
  const code =
    err && typeof err === "object" && "code" in err && typeof (err as { code?: unknown }).code === "number"
      ? (err as { code: number }).code
      : null;

  if (code === 1) return "Permiso de ubicación denegado.";
  if (code === 2) return "No se pudo determinar tu ubicación.";
  if (code === 3) return "Tiempo de espera agotado al obtener la ubicación.";

  if (err instanceof Error && err.message) return err.message;
  return "No se pudo obtener tu ubicación.";
}

type LegendGroups = { essalud: boolean; minsa: boolean; ffaa: boolean; otros: boolean };

type PendingFavorite =
  | { item_type: "hospital"; item_id: string }
  | { item_type: "place"; item_id: string; name: string | null; lat: number; lon: number; meta: { group: string } };

function MapLegendCard({
  groups,
  onToggle,
}: {
  groups: LegendGroups;
  onToggle: (key: keyof LegendGroups) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [helpOpen, setHelpOpen] = React.useState(false);

  const LegendPin = React.useCallback(({ color }: { color: string }) => {
    return (
      <svg width="18" height="24" viewBox="0 0 24 32" aria-hidden="true">
        <path
          d="M12 0C6.5 0 2 4.5 2 10c0 7.6 10 22 10 22s10-14.4 10-22C22 4.5 17.5 0 12 0Z"
          fill={color}
          stroke="rgba(255,255,255,0.92)"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path d="M12 6.5v8.5M7.75 10.75h8.5" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  }, []);

  const institutions = [
    { key: "essalud" as const, label: "EsSalud", color: "#38BDF8", description: "Hospitales de EsSalud" },
    { key: "minsa" as const, label: "MINSA", color: "#FBBF24", description: "Hospitales de MINSA" },
    {
      key: "ffaa" as const,
      label: "FF.AA",
      color: "#22C55E",
      description: "Sanidad FAP, Marina, PNP y Ejército",
    },
    { key: "otros" as const, label: "Otros", color: "#EF4444", description: "Todos los demás" },
  ];

  const clusterScale = [
    { label: "1–10", color: "#22C55E" },
    { label: "11–50", color: "#FBBF24" },
    { label: "51–200", color: "#FB923C" },
    { label: "200+", color: "#EF4444" },
  ];

  const gdScale = [
    { label: "GD-1", color: "#22C55E" },
    { label: "GD-2", color: "#84CC16" },
    { label: "GD-3", color: "#FBBF24" },
    { label: "GD-4", color: "#F97316" },
    { label: "GD-5", color: "#EF4444" },
  ];

  const categorias = ["I-1", "I-2", "I-3", "I-4"];

  return (
    <div className="w-[320px] overflow-hidden rounded-[var(--radius-panel)] bg-white/95 shadow-[var(--shadow-soft)] backdrop-blur">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-5 py-4"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div className="grid gap-0.5 text-left">
          <div className="text-sm font-semibold text-[var(--title)]">Leyenda</div>
          <div className="text-xs font-medium text-[var(--label)]">Instituciones, categoría, GD y clusters</div>
        </div>
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          className={open ? "rotate-180 text-[var(--label)]" : "text-[var(--label)]"}
        >
          <path
            d="M6 9l6 6 6-6"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <div
        className="transition-[max-height,opacity] duration-300 ease-out"
        style={{ maxHeight: open ? "70vh" : 0, opacity: open ? 1 : 0, overflowY: open ? "scroll" : "hidden" }}
      >
        <div className="grid gap-3 px-5 pb-5 pr-4">
          <div className="grid gap-2">
            <div className="text-xs font-semibold text-[var(--title)]">Institución</div>
            <div className="grid gap-2">
              {institutions.map((i) => (
                <div
                  key={i.label}
                  className="flex items-center justify-between gap-3 rounded-[var(--radius-card)] bg-[var(--background-secondary)] px-3 py-2"
                >
                  <div className="grid min-w-0 gap-0.5">
                    <div className="text-xs font-semibold text-[var(--title)]">{i.label}</div>
                    <div className="text-[11px] font-medium text-[var(--label)]">{i.description}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="shrink-0">{LegendPin({ color: i.color })}</div>
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[var(--accent)]"
                      aria-label={`Mostrar ${i.label}`}
                      checked={groups[i.key]}
                      onChange={() => onToggle(i.key)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-2">
            <div className="text-xs font-semibold text-[var(--title)]">Categoría</div>
            <div className="flex flex-wrap gap-2">
              {categorias.map((c) => (
                <div key={c} className="flex items-center gap-2 rounded-full bg-[var(--background-secondary)] px-3 py-2">
                  <div className="grid h-5 w-5 place-items-center rounded-full bg-white shadow-[0_1px_0_rgba(0,0,0,0.04)]">
                    <span className="text-[11px] font-extrabold text-[var(--title)]">{c.replace("I-", "")}</span>
                  </div>
                  <span className="text-xs font-medium text-[var(--label)]">{c}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-2">
            <div className="text-xs font-semibold text-[var(--title)]">Grado de dificultad (GD)</div>
            <div className="flex flex-wrap gap-2">
              {gdScale.map((g) => (
                <div key={g.label} className="flex items-center gap-2 rounded-full bg-[var(--background-secondary)] px-3 py-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: g.color }} aria-hidden="true" />
                  <span className="text-xs font-medium text-[var(--label)]">{g.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-2">
            <div className="text-xs font-semibold text-[var(--title)]">Clusters</div>
            <div className="grid grid-cols-2 gap-2">
              {clusterScale.map((c) => (
                <div
                  key={c.label}
                  className="flex items-center gap-2 rounded-[var(--radius-card)] bg-[var(--background-secondary)] px-3 py-2"
                >
                  <div
                    className="grid h-6 w-6 place-items-center rounded-full border-2 border-white text-[11px] font-semibold text-[var(--title)] shadow-[var(--shadow-soft)]"
                    style={{ background: c.color }}
                    aria-hidden="true"
                  >
                    <span>•</span>
                  </div>
                  <span className="text-xs font-medium text-[var(--label)]">{c.label}</span>
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            className="w-fit rounded-full bg-black/[0.03] px-3 py-2 text-xs font-medium text-[var(--title)] hover:bg-black/[0.06]"
            onClick={() => setHelpOpen((v) => !v)}
            aria-expanded={helpOpen}
          >
            ¿Qué significan estos símbolos?
          </button>

          <div
            className="overflow-hidden rounded-[var(--radius-card)] bg-[var(--background-secondary)] transition-[max-height,opacity] duration-300 ease-out"
            style={{ maxHeight: helpOpen ? 540 : 0, opacity: helpOpen ? 1 : 0 }}
          >
            <div className="grid gap-2 px-4 py-3">
              <div className="text-xs font-semibold text-[var(--title)]">Guía rápida</div>
              <ul className="text-xs font-medium text-[var(--label)] list-disc pl-4">
                <li>Color del pin: grupo institucional (EsSalud, MINSA, FF.AA, Otros).</li>
                <li>Número en el pin: categoría por pisos (I-1 a I-4).</li>
                <li>Punto en el pin: GD (GD‑1 fácil → GD‑5 muy difícil).</li>
                <li>Clusters: agrupan establecimientos según cantidad (verde 1–10, amarillo 11–50, naranja 51–200, rojo 200+).</li>
              </ul>
              <div className="mt-2 text-xs font-semibold text-[var(--title)]">Definiciones</div>
              <ul className="text-xs font-medium text-[var(--label)] list-disc pl-4">
                <li>I‑1: Con profesional de salud, no médico (en teoría).</li>
                <li>I‑2: Con médico.</li>
                <li>I‑3: + odontólogo + técnicos + patología.</li>
                <li>I‑4: + imágenes + internamiento.</li>
                <li>GD‑1 a GD‑5: Grado de dificultad geográfica (GD‑5 = zona muy remota).</li>
                <li>ZAF: Zona de Atención Focalizada (zona prioritaria).</li>
                <li>ZE: Zona de Emergencia.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

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

function haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLon / 2);
  const h = s1 * s1 + Math.cos(lat1) * Math.cos(lat2) * s2 * s2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function formatDistance(meters: number) {
  if (!Number.isFinite(meters)) return "—";
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds)) return "—";
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

export default function HomePage() {
  const { filters, setFilters, filteredHospitals, options, loading, error, fetchHospitalById } =
    useHospitalFiltering();

  const apiBase = React.useMemo(() => {
    const configured = process.env.NEXT_PUBLIC_API_BASE_URL;
    if (configured && configured.trim().length > 0) return configured.trim().replace(/\/$/, "");
    return "http://localhost:4000/api";
  }, []);

  const [legendGroups, setLegendGroups] = React.useState<LegendGroups>({
    essalud: true,
    minsa: true,
    ffaa: true,
    otros: true,
  });

  const normalizeInstitution = React.useCallback((value: string) => {
    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }, []);

  const groupInstitution = React.useCallback(
    (institucion: string): keyof LegendGroups => {
      const v = normalizeInstitution(institucion);
      if (v.includes("essalud")) return "essalud";
      if (v.includes("minsa")) return "minsa";
      if (
        v.includes("ffaa") ||
        v.includes("ff.aa") ||
        v.includes("fuerza aerea") ||
        v.includes("aerea del peru") ||
        v.includes("marina") ||
        v.includes("policia") ||
        v.includes("ejercito")
      )
        return "ffaa";
      return "otros";
    },
    [normalizeInstitution],
  );

  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [selectedHospitalId, setSelectedHospitalId] = React.useState<string | null>(null);
  const [selectedHospital, setSelectedHospital] = React.useState<Hospital | null>(null);
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [detailError, setDetailError] = React.useState<string | null>(null);
  const [detailOpen, setDetailOpen] = React.useState(false);

  const [userLocation, setUserLocation] = React.useState<{ lat: number; lng: number; accuracy?: number | null } | null>(
    null,
  );
  const [travelMode, setTravelMode] = React.useState<"carro" | "avion">("carro");
  const [routeOrigin, setRouteOrigin] = React.useState<
    | { type: "user" }
    | { type: "custom"; label: string; lat: number; lng: number }
    | { type: "airport"; label: string; lat: number; lng: number }
  >({ type: "user" });
  const [activeTrip, setActiveTrip] = React.useState<{
    hospitalId: string;
    hospitalName: string;
    lat: number;
    lng: number;
    mode: "carro" | "avion";
  } | null>(null);
  const [nearestAirport, setNearestAirport] = React.useState<NearestAirportResponse | null>(null);
  const [airportDriveRoute, setAirportDriveRoute] = React.useState<RouteResponse | null>(null);
  const [airportLoading, setAirportLoading] = React.useState(false);
  const [airportError, setAirportError] = React.useState<string | null>(null);
  const [route, setRoute] = React.useState<RouteResponse | null>(null);
  const [routeLoading, setRouteLoading] = React.useState(false);
  const [routeError, setRouteError] = React.useState<string | null>(null);

  const [centerOnUserLoading, setCenterOnUserLoading] = React.useState(false);
  const [locationError, setLocationError] = React.useState<string | null>(null);

  const [nearby, setNearby] = React.useState<NearbyPlacesResponse | null>(null);
  const [nearbyLoading, setNearbyLoading] = React.useState(false);
  const [nearbyError, setNearbyError] = React.useState<string | null>(null);
  const [geocodeLoading, setGeocodeLoading] = React.useState(false);
  const [geocodeError, setGeocodeError] = React.useState<string | null>(null);
  const [geocodeMessage, setGeocodeMessage] = React.useState<string | null>(null);
  const [nearbyFilterTypes, setNearbyFilterTypes] = React.useState<string[]>([]);
  const [nearbyRadiusKm, setNearbyRadiusKm] = React.useState<number>(2);
  const [hoveredNearbyId, setHoveredNearbyId] = React.useState<string | null>(null);
  const [selectedNearbyId, setSelectedNearbyId] = React.useState<string | null>(null);
  const [focusNearbyId, setFocusNearbyId] = React.useState<string | null>(null);

  const [searchValue, setSearchValue] = React.useState("");
  const [searchLoading, setSearchLoading] = React.useState(false);
  const [searchError, setSearchError] = React.useState<string | null>(null);
  const [searchResults, setSearchResults] = React.useState<NominatimResult[]>([]);
  const [searchNonce, setSearchNonce] = React.useState(0);
  const [focus, setFocus] = React.useState<{ lat: number; lng: number; zoom?: number } | null>(null);

  const [authOpen, setAuthOpen] = React.useState(false);
  const [authMode, setAuthMode] = React.useState<"login" | "register">("login");
  const [authNonce, setAuthNonce] = React.useState(0);
  const [authRole, setAuthRoleState] = React.useState<"admin" | "user" | null>(null);

  const [hasHydrated, setHasHydrated] = React.useState(false);
  React.useEffect(() => setHasHydrated(true), []);

  const favoritesEnabled = hasHydrated && !!getAuthToken();
  const [favorites, setFavorites] = React.useState<FavoriteItem[]>([]);
  const [favoritesLoading, setFavoritesLoading] = React.useState(false);
  const [favoritesError, setFavoritesError] = React.useState<string | null>(null);
  const [pendingFavorite, setPendingFavorite] = React.useState<PendingFavorite | null>(null);

  const setAuthQuery = React.useCallback((mode: "login" | "register" | null) => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (!mode) url.searchParams.delete("auth");
    else url.searchParams.set("auth", mode);
    const next = url.searchParams.toString();
    window.history.replaceState({}, "", `${url.pathname}${next ? `?${next}` : ""}${url.hash}`);
  }, []);

  const setHospitalQuery = React.useCallback((hospitalId: string | null) => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (!hospitalId) url.searchParams.delete("h");
    else url.searchParams.set("h", hospitalId);
    const next = url.searchParams.toString();
    window.history.replaceState({}, "", `${url.pathname}${next ? `?${next}` : ""}${url.hash}`);
  }, []);

  const openAuth = React.useCallback(
    (mode: "login" | "register") => {
      setAuthMode(mode);
      setAuthOpen(true);
      setAuthQuery(mode);
    },
    [setAuthQuery],
  );

  const extractApiErrorMessage = React.useCallback((body: unknown, fallback: string) => {
    if (body && typeof body === "object" && "error" in body && body.error && typeof body.error === "object") {
      const e = body.error as { message?: unknown };
      if (typeof e.message === "string" && e.message.trim()) return e.message;
    }
    return fallback;
  }, []);

  const refreshFavorites = React.useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setFavorites([]);
      setFavoritesLoading(false);
      setFavoritesError(null);
      return;
    }
    setFavoritesLoading(true);
    setFavoritesError(null);
    try {
      const r = await fetch(`${apiBase}/favoritos`, { headers: { Authorization: `Bearer ${token}` } });
      const body = await r.json().catch(() => null);
      if (!r.ok) throw new Error(extractApiErrorMessage(body, "No se pudo cargar favoritos."));
      const list =
        body && typeof body === "object" && "favorites" in body && Array.isArray((body as { favorites?: unknown }).favorites)
          ? ((body as { favorites: FavoriteItem[] }).favorites as FavoriteItem[])
          : [];
      setFavorites(list);
    } catch (e) {
      setFavoritesError(e instanceof Error ? e.message : "No se pudo cargar favoritos.");
    } finally {
      setFavoritesLoading(false);
    }
  }, [apiBase, extractApiErrorMessage]);

  const refreshAuthRole = React.useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setAuthRoleState(null);
      return;
    }
    const inferRole = () => {
      const persisted = getAuthRole();
      if (persisted) return persisted;
      const email = getAuthEmailFromToken();
      if (email && email.trim().toLowerCase() === "admin@localisa.com") return "admin";
      return null;
    };
    try {
      const r = await fetch(`${apiBase}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
      const body = await r.json().catch(() => null);
      if (!r.ok) {
        setAuthRoleState(inferRole());
        return;
      }
      const role =
        body && typeof body === "object" && "user" in body && body.user && typeof body.user === "object" && "role" in body.user
          ? String((body.user as { role?: unknown }).role || "")
          : "";
      const normalized = role.trim().toLowerCase() === "admin" ? "admin" : "user";
      persistAuthRole(normalized);
      setAuthRoleState(normalized);
    } catch {
      setAuthRoleState(inferRole());
    }
  }, [apiBase]);

  const addFavorite = React.useCallback(
    async (fav: PendingFavorite) => {
      const token = getAuthToken();
      if (!token) {
        setPendingFavorite(fav);
        openAuth("login");
        return;
      }
      const r = await fetch(`${apiBase}/favoritos`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(fav),
      });
      const body = await r.json().catch(() => null);
      if (!r.ok) throw new Error(extractApiErrorMessage(body, "No se pudo guardar favorito."));
      await refreshFavorites();
    },
    [apiBase, extractApiErrorMessage, openAuth, refreshFavorites],
  );

  const removeFavorite = React.useCallback(
    async ({ item_type, item_id }: { item_type: "hospital" | "place"; item_id: string }) => {
      const token = getAuthToken();
      if (!token) {
        openAuth("login");
        return;
      }
      const r = await fetch(`${apiBase}/favoritos/${encodeURIComponent(item_type)}/${encodeURIComponent(item_id)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await r.json().catch(() => null);
      if (!r.ok) throw new Error(extractApiErrorMessage(body, "No se pudo quitar favorito."));
      await refreshFavorites();
    },
    [apiBase, extractApiErrorMessage, openAuth, refreshFavorites],
  );

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const auth = params.get("auth");
    if (auth === "login" || auth === "register") {
      setAuthMode(auth);
      setAuthOpen(true);
    }
  }, []);

  React.useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      setFavorites([]);
      setFavoritesError(null);
      setFavoritesLoading(false);
      setAuthRoleState(null);
      return;
    }

    let cancelled = false;
    Promise.resolve()
      .then(async () => {
        setAuthRoleState(getAuthRole());
        await refreshAuthRole();
        if (pendingFavorite) {
          await addFavorite(pendingFavorite);
          if (cancelled) return;
          setPendingFavorite(null);
          return;
        }
        await refreshFavorites();
      })
      .catch((e) => {
        if (cancelled) return;
        setFavoritesError(e instanceof Error ? e.message : "No se pudo cargar favoritos.");
      });

    return () => {
      cancelled = true;
    };
  }, [addFavorite, authNonce, pendingFavorite, refreshAuthRole, refreshFavorites]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const hospitalId = params.get("h");
    if (!hospitalId) return;
    setSelectedHospitalId(hospitalId);
    setSelectedHospital(null);
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailError(null);
    fetchHospitalById(hospitalId)
      .then((full) => {
        setSelectedHospital(full);
        if (Number.isFinite(full.lat) && Number.isFinite(full.lng)) {
          setFocus({ lat: full.lat, lng: full.lng, zoom: 16 });
        }
      })
      .catch((e) => {
        setDetailError(e instanceof Error ? e.message : "Error al cargar detalle");
      })
      .finally(() => {
        setDetailLoading(false);
      });
  }, [fetchHospitalById]);

  React.useEffect(() => {
    const mql = window.matchMedia("(min-width: 640px)");
    const apply = () => setSidebarOpen(mql.matches);
    apply();
    mql.addEventListener("change", apply);
    return () => mql.removeEventListener("change", apply);
  }, []);

  React.useEffect(() => {
    if (!selectedHospitalId) return;
    const stillExists = filteredHospitals.some((h) => h.id === selectedHospitalId);
    if (!stillExists) {
      setSelectedHospital(null);
      setSelectedHospitalId(null);
      setDetailOpen(false);
      setHospitalQuery(null);
    }
  }, [filteredHospitals, selectedHospitalId]);

  React.useEffect(() => {
    const query = searchValue.trim();
    if (query.length < 3) {
      setSearchResults([]);
      setSearchLoading(false);
      setSearchError(null);
      return;
    }

    const controller = new AbortController();
    setSearchLoading(true);
    setSearchError(null);
    const t = setTimeout(() => {
      let didTimeout = false;
      const timeoutId = setTimeout(() => {
        didTimeout = true;
        controller.abort();
      }, 10_000);
      fetch(`${apiBase}/buscar?q=${encodeURIComponent(query)}`, { signal: controller.signal })
        .then(async (r) => {
          if (!r.ok) {
            const body = await r.json().catch(() => null);
            const message =
              body && typeof body === "object" && body.error && body.error.message
                ? String(body.error.message)
                : "Error al buscar. Reintenta.";
            throw new Error(message);
          }
          return r.json() as Promise<NominatimResult[]>;
        })
        .then((data) => {
          setSearchResults(Array.isArray(data) ? data : []);
          setSearchLoading(false);
        })
        .catch((e) => {
          if (e && e.name === "AbortError") {
            if (!didTimeout) return;
            setSearchResults([]);
            setSearchLoading(false);
            setSearchError("Servicio de búsqueda lento o no disponible. Reintenta.");
            return;
          }
          setSearchResults([]);
          setSearchLoading(false);
          setSearchError(e instanceof Error ? e.message : "Error al buscar. Reintenta.");
        })
        .finally(() => clearTimeout(timeoutId));
    }, 320);

    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [apiBase, searchNonce, searchValue]);

  const hospitalSearchResults = React.useMemo(() => {
    const query = searchValue.trim();
    if (query.length < 2) return [];
    const normQuery = normalizeText(query);
    if (!normQuery) return [];

    const tokens = normQuery.split(" ").filter(Boolean);
    if (tokens.length === 0) return [];

    const scored: Array<{ h: HospitalMapItem; score: number }> = [];
    for (const h of filteredHospitals) {
      const haystack = normalizeText(
        `${h.nombre_establecimiento} ${h.codigo_renipress_modular} ${h.id} ${h.distrito} ${h.provincia} ${h.departamento}`,
      );
      if (!tokens.every((t) => haystack.includes(t))) continue;

      let score = 0;
      const code = normalizeText(h.codigo_renipress_modular || "");
      const id = normalizeText(h.id || "");
      const name = normalizeText(h.nombre_establecimiento || "");

      if (code && (code.startsWith(normQuery) || code === normQuery)) score += 120;
      if (id && (id.startsWith(normQuery) || id === normQuery)) score += 110;
      if (name && name.startsWith(tokens[0])) score += 40;
      score += Math.max(0, 16 - Math.min(16, haystack.indexOf(tokens[0]) >= 0 ? haystack.indexOf(tokens[0]) : 16));

      scored.push({ h, score });
    }

    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.h.nombre_establecimiento.localeCompare(b.h.nombre_establecimiento);
    });

    return scored.slice(0, 8).map((s) => s.h);
  }, [filteredHospitals, searchValue]);

  const handleSelectSearchResult = React.useCallback((item: NominatimResult) => {
    setSearchValue(item.display_name);
    setSearchResults([]);
    const lat = Number(item.lat);
    const lon = Number(item.lon);
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      setFocus({ lat, lng: lon, zoom: 13 });
    }
  }, []);

  const requestGeolocation = React.useCallback(() => {
    return new Promise<{ lat: number; lng: number; accuracy?: number | null }>((resolve, reject) => {
      if (!navigator.geolocation) return reject(new Error("Geolocalización no disponible"));

      let done = false;
      let watchId: number | null = null;
      let best: { lat: number; lng: number; accuracy?: number | null } | null = null;

      const finishOk = (value: { lat: number; lng: number; accuracy?: number | null }) => {
        if (done) return;
        done = true;
        if (watchId != null) navigator.geolocation.clearWatch(watchId);
        resolve(value);
      };

      const finishErr = (err: unknown) => {
        if (done) return;
        done = true;
        if (watchId != null) navigator.geolocation.clearWatch(watchId);
        reject(err);
      };

      const t = window.setTimeout(() => {
        if (best) finishOk(best);
        else finishErr(new Error("Tiempo de espera agotado al obtener la ubicación."));
      }, 8000);

      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const accuracy = typeof pos.coords.accuracy === "number" ? pos.coords.accuracy : null;
          const next = { lat, lng, accuracy };
          if (!best) {
            best = next;
          } else {
            const bestAcc = typeof best.accuracy === "number" ? best.accuracy : Number.POSITIVE_INFINITY;
            const nextAcc = typeof accuracy === "number" ? accuracy : Number.POSITIVE_INFINITY;
            if (nextAcc < bestAcc) best = next;
          }
          const bestAcc = typeof best.accuracy === "number" ? best.accuracy : null;
          if (bestAcc != null && bestAcc <= 40) {
            window.clearTimeout(t);
            finishOk(best);
          }
        },
        (err) => {
          window.clearTimeout(t);
          if (best) finishOk(best);
          else finishErr(err);
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
      );
    });
  }, []);

  const handleRequestRoute = React.useCallback(async () => {
    if (!selectedHospital) return;
    const approxWarning =
      selectedHospital.coordenadas_fuente && selectedHospital.coordenadas_fuente !== "RENIPRESS"
        ? "La ubicación de este establecimiento puede no ser exacta. La ruta podría no llegar al punto real."
        : null;
    setRouteLoading(true);
    setRouteError(null);
    setLocationError(null);
    try {
      if (travelMode === "avion") {
        setRoute(null);
        setNearestAirport(null);
        setAirportDriveRoute(null);
        setAirportError(null);
        setActiveTrip({
          hospitalId: selectedHospital.id,
          hospitalName: toTitleCase(selectedHospital.nombre_establecimiento),
          lat: selectedHospital.lat,
          lng: selectedHospital.lng,
          mode: "avion",
        });
        if (approxWarning) setRouteError(approxWarning);
        setFocus(null);
        return;
      }

      const origin =
        routeOrigin.type === "user"
          ? await requestGeolocation()
          : { lat: routeOrigin.lat, lng: routeOrigin.lng, accuracy: null };
      setUserLocation(origin);

      const perfil = "driving";
      const qs = new URLSearchParams({
        latUsuario: String(origin.lat),
        lonUsuario: String(origin.lng),
        latHospital: String(selectedHospital.lat),
        lonHospital: String(selectedHospital.lng),
        perfil,
      }).toString();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15_000);
      let r;
      try {
        r = await fetch(`${apiBase}/ruta?${qs}`, { signal: controller.signal });
      } finally {
        clearTimeout(timeoutId);
      }
      if (!r.ok) {
        const body = await r.json().catch(() => null);
        const message =
          body && typeof body === "object" && body.error && body.error.message
            ? String(body.error.message)
            : "Error al calcular ruta. Reintenta.";
        throw new Error(message);
      }
      const data = (await r.json()) as RouteResponse;
      setRoute(data);
      setNearestAirport(null);
      setAirportDriveRoute(null);
      setAirportError(null);
      setActiveTrip({
        hospitalId: selectedHospital.id,
        hospitalName: toTitleCase(selectedHospital.nombre_establecimiento),
        lat: selectedHospital.lat,
        lng: selectedHospital.lng,
        mode: travelMode,
      });
      if (approxWarning) setRouteError(approxWarning);
      setFocus(null);
    } catch (e) {
      const msg =
        e && typeof e === "object" && "name" in e && e.name === "AbortError"
          ? "Servicio de rutas lento o no disponible. Reintenta."
          : geolocationErrorMessage(e);
      setRouteError(approxWarning ? `${approxWarning} ${msg}` : msg);
    } finally {
      setRouteLoading(false);
    }
  }, [apiBase, requestGeolocation, routeOrigin, selectedHospital, travelMode]);

  React.useEffect(() => {
    if (!activeTrip) return;
    if (activeTrip.mode !== "avion") return;

    const controller = new AbortController();
    setAirportLoading(true);
    setAirportError(null);
    setNearestAirport(null);
    setAirportDriveRoute(null);

    const t = setTimeout(() => {
      controller.abort();
    }, 15_000);

    fetch(`${apiBase}/aeropuerto-cercano/${encodeURIComponent(activeTrip.hospitalId)}`, { signal: controller.signal })
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => null);
          const message =
            body && typeof body === "object" && body.error && body.error.message
              ? String(body.error.message)
              : "No se pudo obtener el aeropuerto cercano. Reintenta.";
          throw new Error(message);
        }
        return (await r.json()) as NearestAirportResponse;
      })
      .then(async (data) => {
        setNearestAirport(data);
        if (!data.aeropuerto) return;

        const qs = new URLSearchParams({
          latUsuario: String(data.aeropuerto.lat),
          lonUsuario: String(data.aeropuerto.lon),
          latHospital: String(activeTrip.lat),
          lonHospital: String(activeTrip.lng),
          perfil: "driving",
        }).toString();

        const r = await fetch(`${apiBase}/ruta?${qs}`, { signal: controller.signal });
        if (!r.ok) {
          const body = await r.json().catch(() => null);
          const message =
            body && typeof body === "object" && body.error && body.error.message
              ? String(body.error.message)
              : "No se pudo calcular el tramo en carro desde el aeropuerto. Reintenta.";
          throw new Error(message);
        }
        const route = (await r.json()) as RouteResponse;
        setAirportDriveRoute(route);
      })
      .catch((e) => {
        const msg =
          e && typeof e === "object" && "name" in e && e.name === "AbortError"
            ? "Servicio de aeropuertos lento o no disponible. Reintenta."
            : e instanceof Error
              ? e.message
              : "No se pudo obtener el aeropuerto cercano. Reintenta.";
        setAirportError(msg);
      })
      .finally(() => {
        clearTimeout(t);
        setAirportLoading(false);
      });

    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [activeTrip, apiBase]);

  const clearActiveTrip = React.useCallback(() => {
    setActiveTrip(null);
    setRoute(null);
    setRouteError(null);
    setNearestAirport(null);
    setAirportDriveRoute(null);
    setAirportLoading(false);
    setAirportError(null);
  }, []);

  const handleCenterOnUser = React.useCallback(async () => {
    setCenterOnUserLoading(true);
    setLocationError(null);
    try {
      const loc = await requestGeolocation();
      setUserLocation(loc);
      setFocus({ lat: loc.lat, lng: loc.lng, zoom: 15 });
    } catch (e) {
      setLocationError(geolocationErrorMessage(e));
    } finally {
      setCenterOnUserLoading(false);
    }
  }, [requestGeolocation]);

  const handleRequestNearby = React.useCallback(async () => {
    if (!selectedHospital) return;
    const approxWarning =
      selectedHospital.coordenadas_fuente && selectedHospital.coordenadas_fuente !== "RENIPRESS"
        ? "La ubicación de este establecimiento puede no ser exacta. Los resultados de “cerca” podrían no ser precisos."
        : null;
    setNearbyLoading(true);
    setNearbyError(null);
    try {
      if (approxWarning) setNearbyError(approxWarning);
      setHoveredNearbyId(null);
      setSelectedNearbyId(null);
      setFocusNearbyId(null);

      const typeKeyByLabel: Record<string, string> = {
        "Hospedaje": "hospedajes",
        "Restaurante/Chifa": "restaurantes",
        "Centro Comercial": "centros_comerciales",
        "Supermercado": "supermercados",
        "Tambo/Bodega": "tiendas",
        "Farmacia": "farmacias",
        "Banco/Cajero": "bancos",
        "Comisaría": "comisarias",
        "Gimnasio": "gimnasios",
        "Iglesia": "iglesias",
      };
      const types = nearbyFilterTypes
        .map((t) => typeKeyByLabel[String(t || "").trim()] || "")
        .filter(Boolean);
      const qs = new URLSearchParams({
        radius_meters: String(Math.round(nearbyRadiusKm * 1000)),
        ...(types.length ? { types: types.join(",") } : {}),
      }).toString();

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15_000);
      let r;
      try {
        r = await fetch(`${apiBase}/lugares-cercanos/${encodeURIComponent(selectedHospital.id)}?${qs}`, {
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }
      if (!r.ok) {
        const body = await r.json().catch(() => null);
        const message =
          body && typeof body === "object" && body.error && body.error.message
            ? String(body.error.message)
            : "Error al buscar lugares cercanos. Reintenta.";
        throw new Error(message);
      }
      const data = (await r.json()) as NearbyPlacesResponse;
      setNearby(data);
    } catch (e) {
      setNearby(null);
      const msg =
        e && typeof e === "object" && "name" in e && e.name === "AbortError"
          ? "Servicio de lugares cercanos lento o no disponible. Reintenta."
          : e instanceof Error
            ? e.message
            : "Error al buscar lugares cercanos. Reintenta.";
      setNearbyError(approxWarning ? `${approxWarning} ${msg}` : msg);
    } finally {
      setNearbyLoading(false);
    }
  }, [apiBase, nearbyFilterTypes, nearbyRadiusKm, selectedHospital]);

  const handleRequestGeocode = React.useCallback(async () => {
    if (!selectedHospital) return;
    const token = getAuthToken();
    if (!token) {
      setGeocodeError("Inicia sesión para corregir la ubicación.");
      return;
    }
    if (authRole !== "admin") {
      setGeocodeError("Solo Admin puede corregir la ubicación.");
      return;
    }
    setGeocodeLoading(true);
    setGeocodeError(null);
    setGeocodeMessage(null);
    setNearestAirport(null);
    setAirportDriveRoute(null);
    setAirportError(null);
    try {
      const prevLat = selectedHospital.lat;
      const prevLng = selectedHospital.lng;
      const prevSource = selectedHospital.coordenadas_fuente || null;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20_000);
      let r;
      try {
        r = await fetch(`${apiBase}/hospitales/${encodeURIComponent(selectedHospital.id)}/geocodificar`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }
      if (!r.ok) {
        const body = await r.json().catch(() => null);
        const message =
          body && typeof body === "object" && body.error && body.error.message
            ? String(body.error.message)
            : "No se pudo corregir la ubicación. Reintenta.";
        throw new Error(message);
      }
      const full = (await r.json()) as Hospital;
      setSelectedHospital(full);
      setRoute(null);
      setRouteError(null);
      setNearestAirport(null);
      setAirportDriveRoute(null);
      setAirportError(null);
      setNearby(null);
      setHoveredNearbyId(null);
      setSelectedNearbyId(null);
      setFocusNearbyId(null);
      setNearbyError(null);
      setGeocodeError(null);
      const moved =
        Number.isFinite(prevLat) &&
        Number.isFinite(prevLng) &&
        Number.isFinite(full.lat) &&
        Number.isFinite(full.lng) &&
        (Math.abs(full.lat - prevLat) > 0.0002 || Math.abs(full.lng - prevLng) > 0.0002);
      const sourceChanged = (full.coordenadas_fuente || null) !== prevSource;
      setGeocodeMessage(
        moved || sourceChanged
          ? "Ubicación actualizada."
          : "No se encontró una ubicación mejor para este establecimiento.",
      );
      if (Number.isFinite(full.lat) && Number.isFinite(full.lng)) {
        setFocus({ lat: full.lat, lng: full.lng, zoom: 16 });
      }
    } catch (e) {
      const msg =
        e && typeof e === "object" && "name" in e && e.name === "AbortError"
          ? "Servicio de corrección lento o no disponible. Reintenta."
          : e instanceof Error
            ? e.message
            : "No se pudo corregir la ubicación. Reintenta.";
      setGeocodeError(msg);
    } finally {
      setGeocodeLoading(false);
    }
  }, [apiBase, authRole, selectedHospital]);

  const handleSelectHospital = React.useCallback(
    async (h: HospitalMapItem) => {
      setSelectedHospitalId(h.id);
      setSelectedHospital(null);
      setDetailOpen(true);
      setDetailLoading(true);
      setDetailError(null);
      setHospitalQuery(h.id);
      setNearby(null);
      setNearbyError(null);
      setNearbyFilterTypes([]);
      setNearbyRadiusKm(2);
      setHoveredNearbyId(null);
      setSelectedNearbyId(null);
      setFocusNearbyId(null);
      setGeocodeError(null);
      setGeocodeMessage(null);
      setFocus({ lat: h.lat, lng: h.lng, zoom: 16 });
      try {
        const full = await fetchHospitalById(h.id);
        setSelectedHospital(full);
        if (Number.isFinite(full.lat) && Number.isFinite(full.lng) && (full.lat !== h.lat || full.lng !== h.lng)) {
          setFocus({ lat: full.lat, lng: full.lng, zoom: 16 });
        }
      } catch (e) {
        setDetailError(e instanceof Error ? e.message : "Error al cargar detalle");
      } finally {
        setDetailLoading(false);
      }
    },
    [fetchHospitalById, setHospitalQuery],
  );

  const handleSelectHospitalSearchResult = React.useCallback(
    (h: HospitalMapItem) => {
      setSearchValue(h.nombre_establecimiento);
      setSearchResults([]);
      handleSelectHospital(h);
    },
    [handleSelectHospital],
  );

  const hospitalsForMap = React.useMemo(() => {
    if (!selectedHospital) return filteredHospitals;
    const idx = filteredHospitals.findIndex((x) => x.id === selectedHospital.id);
    if (idx < 0) return filteredHospitals;
    const h = filteredHospitals[idx];
    if (h.lat === selectedHospital.lat && h.lng === selectedHospital.lng) return filteredHospitals;
    const next = filteredHospitals.slice();
    next[idx] = { ...h, lat: selectedHospital.lat, lng: selectedHospital.lng };
    return next;
  }, [filteredHospitals, selectedHospital]);

  const hospitalsForMapAfterLegend = React.useMemo(() => {
    return hospitalsForMap.filter((h) => legendGroups[groupInstitution(h.institucion)]);
  }, [groupInstitution, hospitalsForMap, legendGroups]);

  const topHospitals = React.useMemo(() => {
    const base = hospitalsForMapAfterLegend.slice();
    if (userLocation) {
      base.sort((a, b) => {
        const da = haversineMeters(userLocation, { lat: a.lat, lng: a.lng });
        const db = haversineMeters(userLocation, { lat: b.lat, lng: b.lng });
        return da - db;
      });
      return base.slice(0, 5);
    }
    base.sort((a, b) => a.nombre_establecimiento.localeCompare(b.nombre_establecimiento));
    return base.slice(0, 5);
  }, [hospitalsForMapAfterLegend, userLocation]);

  const directDistanceMeters = React.useMemo(() => {
    if (!selectedHospital || !userLocation) return null;
    if (!Number.isFinite(selectedHospital.lat) || !Number.isFinite(selectedHospital.lng)) return null;
    return haversineMeters(userLocation, { lat: selectedHospital.lat, lng: selectedHospital.lng });
  }, [selectedHospital, userLocation]);

  const activeTripSummary = React.useMemo(() => {
    if (!activeTrip) return null;
    const label = activeTrip.mode === "carro" ? "Carro" : "Avión";
    const metric =
      activeTrip.mode === "avion"
        ? airportDriveRoute
          ? `Desde aeropuerto: ${formatDistance(airportDriveRoute.distancia)} · ${formatDuration(airportDriveRoute.duracion)}`
          : null
        : route
          ? `${formatDuration(route.duracion)} · ${formatDistance(route.distancia)}`
          : null;
    return { label, metric };
  }, [activeTrip, airportDriveRoute, route]);

  const routeForMap = React.useMemo(() => {
    if (activeTrip?.mode === "avion") return airportDriveRoute;
    return route;
  }, [activeTrip?.mode, airportDriveRoute, route]);

  const nearbyFlatForList = React.useMemo(() => {
    if (!nearby || !selectedHospital) return [];
    const center = { lat: selectedHospital.lat, lng: selectedHospital.lng };
    const rows: Array<{ p: NearbyPlace; group: string; dist: number }> = [];
    const pushGroup = (arr: NearbyPlace[], group: string) => {
      for (const p of arr) {
        const dist = haversineMeters(center, { lat: p.lat, lng: p.lon });
        rows.push({ p, group, dist });
      }
    };
    pushGroup(nearby.hospedajes, "Hospedaje");
    pushGroup(nearby.restaurantes, "Restaurante/Chifa");
    pushGroup(nearby.centros_comerciales, "Centro Comercial");
    pushGroup(nearby.supermercados, "Supermercado");
    pushGroup(nearby.farmacias, "Farmacia");
    pushGroup(nearby.tiendas, "Tambo/Bodega");
    pushGroup(nearby.bancos, "Banco/Cajero");
    pushGroup(nearby.comisarias, "Comisaría");
    pushGroup(nearby.gimnasios, "Gimnasio");
    pushGroup(nearby.iglesias, "Iglesia");

    const typesSet = new Set(nearbyFilterTypes.map((s) => s.toLowerCase()));
    const byType = rows.filter((r) => (typesSet.size ? typesSet.has(r.group.toLowerCase()) : true));
    const byRadius = byType.filter((r) => r.dist <= nearbyRadiusKm * 1000);
    byRadius.sort((a, b) => a.dist - b.dist);
    return byRadius.map((r, i) => ({ ...r, index: i + 1 }));
  }, [nearby, nearbyFilterTypes, nearbyRadiusKm, selectedHospital]);

  const nearbyPlacesForMap = React.useMemo(() => {
    return nearbyFlatForList.map(({ p, index }) => ({
      p: { id: p.id, name: p.name || null, lat: p.lat, lon: p.lon },
      index,
    }));
  }, [nearbyFlatForList]);

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-50">
      <div className="flex h-full flex-col">
      <AppHeader
        onOpenFilters={() => setSidebarOpen(true)}
        onCenterOnUser={handleCenterOnUser}
        centerOnUserLoading={centerOnUserLoading}
        onOpenAuth={openAuth}
        favorites={favorites}
        favoritesLoading={favoritesLoading}
        favoritesError={favoritesError}
        onRefreshFavorites={refreshFavorites}
        onSelectFavorite={(fav) => {
          if (fav.item_type === "hospital" && fav.hospital) {
            const h: HospitalMapItem = {
              id: fav.hospital.id,
              profesion: fav.hospital.profesion || "",
              profesiones: fav.hospital.profesiones || [],
              institucion: fav.hospital.institucion || "",
              departamento: fav.hospital.departamento || "",
              provincia: fav.hospital.provincia || "",
              distrito: fav.hospital.distrito || "",
              grado_dificultad: fav.hospital.grado_dificultad || "",
              codigo_renipress_modular: fav.hospital.codigo_renipress_modular || fav.hospital.id,
              nombre_establecimiento: fav.hospital.nombre_establecimiento || fav.hospital.id,
              categoria: fav.hospital.categoria || "",
              zaf: fav.hospital.zaf || "",
              ze: fav.hospital.ze || "",
              lat: Number(fav.hospital.lat || 0),
              lng: Number(fav.hospital.lng || 0),
            };
            handleSelectHospital(h);
          } else if (fav.item_type === "place" && fav.lat != null && fav.lon != null) {
            setFocus({ lat: fav.lat, lng: fav.lon, zoom: 16 });
          }
        }}
        onRemoveFavorite={(fav) => removeFavorite({ item_type: fav.item_type, item_id: fav.item_id })}
        searchValue={searchValue}
        searchLoading={searchLoading}
        searchError={searchError}
        searchResults={searchResults}
        hospitalSearchResults={hospitalSearchResults}
        onSearchChange={setSearchValue}
        onSelectSearchResult={handleSelectSearchResult}
        onSelectHospitalSearchResult={handleSelectHospitalSearchResult}
        onRetrySearch={() => setSearchNonce((n) => n + 1)}
      />

      <div className="relative flex-1 overflow-hidden">
        <HospitalMap
          hospitals={hospitalsForMapAfterLegend}
          selectedHospitalId={selectedHospitalId}
          loading={loading}
          userLocation={userLocation}
          route={routeForMap}
          routeLoading={routeLoading || airportLoading}
          nearby={nearby}
          nearbyPlaces={nearbyPlacesForMap}
          hoveredNearbyId={hoveredNearbyId}
          selectedNearbyId={selectedNearbyId}
          focusNearbyId={focusNearbyId}
          nearbyLoading={nearbyLoading}
          focus={focus}
          onSelectHospital={handleSelectHospital}
        />

        <div className="absolute right-3 top-3 z-[1200] hidden sm:block">
          <div className="grid gap-2">
            <div className="w-[320px] overflow-hidden rounded-[var(--radius-panel)] bg-white/95 px-5 py-4 shadow-[var(--shadow-soft)] backdrop-blur">
              <div className="text-sm font-semibold text-[var(--title)]">
                {loading ? "Cargando…" : `${hospitalsForMapAfterLegend.length} establecimientos`}
              </div>
              <div className="mt-1 text-xs font-medium text-[var(--label)]">
                {error
                  ? error
                  : locationError
                    ? locationError
                    : searchError
                      ? searchError
                      : "Selecciona un marcador para ver el detalle."}
              </div>
            </div>

            <MapLegendCard
              groups={legendGroups}
              onToggle={(key) => {
                setLegendGroups((prev) => ({ ...prev, [key]: !prev[key] }));
              }}
            />

            {activeTrip && activeTripSummary ? (
              <div className="w-[320px] overflow-hidden rounded-[var(--radius-panel)] bg-white/95 px-5 py-4 shadow-[var(--shadow-soft)] backdrop-blur">
                <div className="text-[11px] font-semibold text-[var(--title)]">Ruta activa · {activeTripSummary.label}</div>
                <div className="mt-0.5 line-clamp-1 text-xs font-medium text-[var(--label)]">{activeTrip.hospitalName}</div>
                {activeTripSummary.metric ? (
                  <div className="mt-0.5 text-[11px] font-medium text-[var(--label)]">{activeTripSummary.metric}</div>
                ) : null}
                <div className="mt-2">
                  <Button size="sm" variant="secondary" className="w-full" onClick={clearActiveTrip}>
                    Cancelar ruta
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="absolute left-0 top-0 z-[2000] hidden h-full sm:block">
          <div
            className={cn(
              "h-full w-[392px] p-3 transition-transform duration-300 ease-out",
              sidebarOpen ? "translate-x-0" : "-translate-x-full",
            )}
          >
            <FiltersBar
              filters={filters}
              setFilters={setFilters}
              options={options}
              results={topHospitals}
              selectedHospitalId={selectedHospitalId}
              onSelectHospital={handleSelectHospital}
              userLocation={userLocation}
            />
          </div>

          <button
            type="button"
            className={cn(
              "absolute top-5 z-[2100] rounded-2xl bg-white px-2 py-2 text-[var(--title)] shadow-[var(--shadow-soft)] hover:bg-black/[0.03]",
              sidebarOpen ? "left-[404px]" : "left-3",
            )}
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label={sidebarOpen ? "Ocultar panel lateral" : "Mostrar panel lateral"}
            title={sidebarOpen ? "Ocultar panel lateral" : "Mostrar panel lateral"}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d={sidebarOpen ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"}
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        <div
          className={cn(
            "absolute inset-0 z-[2500] sm:hidden",
            sidebarOpen ? "pointer-events-auto" : "pointer-events-none",
          )}
          aria-hidden={!sidebarOpen}
        >
          <div
            className={cn("absolute inset-0 bg-black/20 transition-opacity", sidebarOpen ? "opacity-100" : "opacity-0")}
            onClick={() => setSidebarOpen(false)}
          />
          <div
            className={cn(
              "absolute left-0 top-0 h-full w-[92%] max-w-[420px] p-3 transition-transform duration-300 ease-out",
              sidebarOpen ? "translate-x-0" : "-translate-x-full",
            )}
          >
            <FiltersBar
              filters={filters}
              setFilters={setFilters}
              options={options}
              results={topHospitals}
              selectedHospitalId={selectedHospitalId}
              onSelectHospital={handleSelectHospital}
              userLocation={userLocation}
              onCloseMobile={() => setSidebarOpen(false)}
            />
          </div>
        </div>
      </div>
      </div>

      <HospitalDetailPanel
        hospital={selectedHospital}
        loading={detailLoading}
        error={detailError}
        open={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setHospitalQuery(null);
          setNearby(null);
          setNearbyError(null);
          setHoveredNearbyId(null);
          setSelectedNearbyId(null);
          setFocusNearbyId(null);
        }}
        route={
          activeTrip && selectedHospital && activeTrip.hospitalId === selectedHospital.id && activeTrip.mode !== "avion"
            ? route
            : null
        }
        routeLoading={routeLoading}
        routeError={activeTrip && selectedHospital && activeTrip.hospitalId === selectedHospital.id ? routeError : null}
        apiBase={apiBase}
        routeOrigin={routeOrigin}
        onChangeRouteOrigin={(next) => setRouteOrigin(next)}
        onUseNearestAirportAsOrigin={async () => {
          if (!selectedHospital) return;
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15_000);
            let r;
            try {
              r = await fetch(`${apiBase}/aeropuerto-cercano/${encodeURIComponent(selectedHospital.id)}`, {
                signal: controller.signal,
              });
            } finally {
              clearTimeout(timeoutId);
            }
            if (!r.ok) {
              const body = await r.json().catch(() => null);
              const message =
                body && typeof body === "object" && body.error && body.error.message
                  ? String(body.error.message)
                  : "No se pudo obtener el aeropuerto cercano. Reintenta.";
              throw new Error(message);
            }
            const data = (await r.json()) as NearestAirportResponse;
            setNearestAirport(data);
            if (!data.aeropuerto) throw new Error("No se encontró un aeropuerto cercano.");
            setRouteOrigin({
              type: "airport",
              label: data.aeropuerto.name || "Aeropuerto",
              lat: data.aeropuerto.lat,
              lng: data.aeropuerto.lon,
            });
          } catch (e) {
            setRouteError(e instanceof Error ? e.message : "No se pudo obtener el aeropuerto cercano. Reintenta.");
          }
        }}
        nearestAirport={
          activeTrip && selectedHospital && activeTrip.hospitalId === selectedHospital.id && activeTrip.mode === "avion"
            ? nearestAirport
              ? nearestAirport.aeropuerto
              : null
            : null
        }
        nearestAirportDistanceMeters={
          activeTrip && selectedHospital && activeTrip.hospitalId === selectedHospital.id && activeTrip.mode === "avion"
            ? nearestAirport
              ? nearestAirport.distancia_meters
              : null
            : null
        }
        airportDriveRoute={
          activeTrip && selectedHospital && activeTrip.hospitalId === selectedHospital.id && activeTrip.mode === "avion"
            ? airportDriveRoute
            : null
        }
        airportLoading={airportLoading}
        airportError={
          activeTrip && selectedHospital && activeTrip.hospitalId === selectedHospital.id && activeTrip.mode === "avion"
            ? airportError
            : null
        }
        travelMode={travelMode}
        onChangeTravelMode={(mode) => {
          setTravelMode(mode);
        }}
        activeTripMode={activeTrip && selectedHospital && activeTrip.hospitalId === selectedHospital.id ? activeTrip.mode : null}
        directDistanceMeters={directDistanceMeters}
        shareUrl={
          selectedHospital && hasHydrated
            ? (() => {
                const url = new URL(`/establecimiento/${encodeURIComponent(selectedHospital.id)}`, window.location.href);
                return url.toString();
              })()
            : ""
        }
        nearbyFilters={{ types: nearbyFilterTypes, radiusKm: nearbyRadiusKm }}
        canCorrectLocation={
          authRole === "admin" ||
          (hasHydrated &&
            (() => {
              const e = getAuthEmailFromToken();
              return !!(e && e.trim().toLowerCase() === "admin@localisa.com");
            })())
        }
        authRole={authRole}
        onChangeNearbyFilters={(next) => {
          setNearbyFilterTypes(next.types);
          setNearbyRadiusKm(next.radiusKm);
        }}
        filteredNearby={nearbyFlatForList}
        onHoverNearby={(id) => setHoveredNearbyId(id)}
        onClickNearby={(id) => {
          setSelectedNearbyId(id);
          setFocusNearbyId(null);
          Promise.resolve().then(() => setFocusNearbyId(id));
        }}
        onClearNearby={() => {
          setNearby(null);
          setNearbyError(null);
          setHoveredNearbyId(null);
          setSelectedNearbyId(null);
          setFocusNearbyId(null);
        }}
        nearby={nearby}
        nearbyLoading={nearbyLoading}
        nearbyError={nearbyError}
        geocodeLoading={geocodeLoading}
        geocodeError={geocodeError}
        geocodeMessage={geocodeMessage}
        onRequestRoute={selectedHospital ? handleRequestRoute : undefined}
        onRequestNearby={selectedHospital ? handleRequestNearby : undefined}
        onRequestGeocode={selectedHospital ? handleRequestGeocode : undefined}
        favoritesEnabled={favoritesEnabled}
        isHospitalFavorited={
          !!(selectedHospital && favorites.some((f) => f.item_type === "hospital" && f.item_id === selectedHospital.id))
        }
        onToggleFavoriteHospital={() => {
          if (!selectedHospital) return;
          const exists = favorites.some((f) => f.item_type === "hospital" && f.item_id === selectedHospital.id);
          if (exists) removeFavorite({ item_type: "hospital", item_id: selectedHospital.id });
          else addFavorite({ item_type: "hospital", item_id: selectedHospital.id });
        }}
        onToggleFavoritePlace={(place, group) => {
          const exists = favorites.some((f) => f.item_type === "place" && f.item_id === place.id);
          if (exists) removeFavorite({ item_type: "place", item_id: place.id });
          else
            addFavorite({
              item_type: "place",
              item_id: place.id,
              name: place.name || null,
              lat: place.lat,
              lon: place.lon,
              meta: { group },
            });
        }}
        isPlaceFavorited={(placeId) => favorites.some((f) => f.item_type === "place" && f.item_id === placeId)}
        onRequestAuthForFavorites={() => openAuth("login")}
      />

      <AuthModal
        open={authOpen}
        mode={authMode}
        onClose={() => {
          setAuthOpen(false);
          setAuthQuery(null);
        }}
        onChangeMode={(m) => {
          setAuthMode(m);
          setAuthQuery(m);
        }}
        onAuthChange={() => {
          setAuthOpen(false);
          setAuthQuery(null);
          setAuthNonce((n) => n + 1);
        }}
      />
    </div>
  );
}
