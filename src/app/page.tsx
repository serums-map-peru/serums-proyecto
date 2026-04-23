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

function MapLegendCard() {
  const [open, setOpen] = React.useState(false);
  const definitionsTitle =
    "I-1: Con profesional de salud, no médico.\n" +
    "I-2: Con médico.\n" +
    "I-3: + odontólogo + técnicos + patología.\n" +
    "I-4: + imágenes e internamiento.\n" +
    "GD-1 a GD-5: Grado de dificultad geográfica (GD-5 = zona muy remota).\n" +
    "ZAF: Zona de Atención Focalizada (zona prioritaria).\n" +
    "ZE: Zona de Emergencia.";

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

  const categorias = [
    { label: "I-1", description: "Nivel I-1 (primer nivel de atención)" },
    { label: "I-2", description: "Nivel I-2 (primer nivel de atención)" },
    { label: "I-3", description: "Nivel I-3 (primer nivel de atención)" },
    { label: "I-4", description: "Nivel I-4 (primer nivel de atención)" },
  ];

  return (
    <div className="w-[220px] max-w-[calc(100vw-24px)] overflow-hidden rounded-[var(--radius-panel)] bg-white/95 shadow-[var(--shadow-soft)] backdrop-blur">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-4 py-3"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div className="grid gap-0.5 text-left">
          <div className="text-sm font-semibold text-[var(--title)]">Leyenda</div>
          <div className="text-xs font-medium text-[var(--label)]">Instituciones y categoría</div>
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
        style={{ maxHeight: open ? "70vh" : 0, opacity: open ? 1 : 0, overflowY: open ? "auto" : "hidden" }}
      >
        <div className="grid gap-3 px-4 pb-5 pr-4">
          <div className="grid gap-2">
            <div className="text-xs font-semibold text-[var(--title)]">Institución</div>
            <div className="grid gap-2">
              {institutions.map((i) => (
                <div
                  key={i.label}
                  className="flex items-center justify-start gap-3 rounded-[var(--radius-card)] bg-[var(--background-secondary)] px-3 py-2"
                >
                  <div className="shrink-0">{LegendPin({ color: i.color })}</div>
                  <div className="min-w-0 text-xs font-semibold text-[var(--title)]" title={i.description}>
                    {i.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-2">
            <div className="text-xs font-semibold text-[var(--title)]" title={definitionsTitle}>
              Categoría
            </div>
            <div className="flex flex-wrap gap-2">
              {categorias.map((c) => (
                <div
                  key={c.label}
                  className="rounded-full bg-[var(--background-secondary)] px-3 py-2"
                  title={c.description}
                >
                  <span className="text-xs font-medium text-[var(--label)]">{c.label}</span>
                </div>
              ))}
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
    if (typeof window !== "undefined" && window.location && window.location.hostname) {
      return `${window.location.protocol}//${window.location.host}/api`;
    }
    return "http://localhost:3000/api";
  }, []);

  const legendGroups = React.useMemo<LegendGroups>(() => {
    return { essalud: true, minsa: true, ffaa: true, otros: true };
  }, []);

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
  const [favoritesView, setFavoritesView] = React.useState<"map" | "favoritos">("map");
  const [notesDraftByFavoriteId, setNotesDraftByFavoriteId] = React.useState<Record<string, string>>({});
  const [notesSavingId, setNotesSavingId] = React.useState<string | null>(null);
  const [notesError, setNotesError] = React.useState<string | null>(null);
  const [favoritesSearch, setFavoritesSearch] = React.useState("");
  const [notesOpenByFavoriteId, setNotesOpenByFavoriteId] = React.useState<Record<string, boolean>>({});
  const [favoriteDraggingId, setFavoriteDraggingId] = React.useState<string | null>(null);
  const [favoriteDragOverId, setFavoriteDragOverId] = React.useState<string | null>(null);
  const [favoritesReorderSaving, setFavoritesReorderSaving] = React.useState(false);

  const [commentDraftByHospitalId, setCommentDraftByHospitalId] = React.useState<Record<string, string>>({});
  const [commentLoadingId] = React.useState<string | null>(null);
  const [commentSavingId, setCommentSavingId] = React.useState<string | null>(null);
  const [commentErrorByHospitalId, setCommentErrorByHospitalId] = React.useState<Record<string, string | null>>({});
  const [reportOpen, setReportOpen] = React.useState(false);
  const [reportHospitalId, setReportHospitalId] = React.useState<string | null>(null);
  const [reportCategory, setReportCategory] = React.useState("datos");
  const [reportMessage, setReportMessage] = React.useState("");
  const [reportSaving, setReportSaving] = React.useState(false);
  const [reportError, setReportError] = React.useState<string | null>(null);
  const [adminInboxOpen, setAdminInboxOpen] = React.useState(false);
  const [adminReportsLoading, setAdminReportsLoading] = React.useState(false);
  const [adminReportsError, setAdminReportsError] = React.useState<string | null>(null);
  const [adminReports, setAdminReports] = React.useState<
    Array<{
      id: string;
      subject_type: string;
      subject_id: string;
      category: string | null;
      message: string;
      status: string;
      created_at: string | null;
    }>
  >([]);
  const [adminReportsDemo, setAdminReportsDemo] = React.useState(false);

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

  const setViewQuery = React.useCallback((view: "map" | "favoritos") => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (view === "favoritos") url.searchParams.set("view", "favoritos");
    else url.searchParams.delete("view");
    const next = url.searchParams.toString();
    window.history.replaceState({}, "", `${url.pathname}${next ? `?${next}` : ""}${url.hash}`);
    setFavoritesView(view);
    if (view === "favoritos") {
      setSidebarOpen(false);
      setDetailOpen(false);
      setSelectedHospital(null);
      setSelectedHospitalId(null);
      setHospitalQuery(null);
    }
  }, [setHospitalQuery]);

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

  const extractNotes = React.useCallback((meta: unknown) => {
    if (!meta || typeof meta !== "object") return "";
    const m = meta as { notes?: unknown };
    return typeof m.notes === "string" ? m.notes : "";
  }, []);

  const notesLastSyncedByFavoriteIdRef = React.useRef<Record<string, string>>({});
  const notesLastSyncedByHospitalIdRef = React.useRef<Record<string, string>>({});

  React.useEffect(() => {
    if (!detailOpen) return;
    if (!selectedHospitalId) return;
    if (!favoritesEnabled) return;
    const hospitalId = selectedHospitalId;
    setCommentErrorByHospitalId((p) => ({ ...p, [hospitalId]: null }));
    const fav = favorites.find((f) => f.item_type === "hospital" && f.item_id === hospitalId);
    const incoming = extractNotes(fav?.meta);
    const lastSynced = notesLastSyncedByHospitalIdRef.current[hospitalId];
    notesLastSyncedByHospitalIdRef.current = { ...notesLastSyncedByHospitalIdRef.current, [hospitalId]: incoming };
    setCommentDraftByHospitalId((prev) => {
      const current = prev[hospitalId];
      if (current != null && lastSynced != null && current !== lastSynced) return prev;
      return { ...prev, [hospitalId]: incoming };
    });
  }, [detailOpen, extractNotes, favorites, favoritesEnabled, selectedHospitalId]);

  const saveHospitalComment = React.useCallback(
    async (hospitalId: string) => {
      const token = getAuthToken();
      if (!token) {
        openAuth("login");
        return;
      }
      const draft = commentDraftByHospitalId[hospitalId] ?? "";
      setCommentSavingId(hospitalId);
      setCommentErrorByHospitalId((p) => ({ ...p, [hospitalId]: null }));
      try {
        const existing = favorites.find((f) => f.item_type === "hospital" && f.item_id === hospitalId);
        const baseMeta = existing && existing.meta && typeof existing.meta === "object" ? (existing.meta as Record<string, unknown>) : {};
        const meta = { ...baseMeta, notes: draft };
        const r = await fetch(`${apiBase}/favoritos`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ item_type: "hospital", item_id: hospitalId, meta }),
        });
        const body = await r.json().catch(() => null);
        if (!r.ok) throw new Error(extractApiErrorMessage(body, "No se pudo guardar la nota."));
        notesLastSyncedByHospitalIdRef.current = { ...notesLastSyncedByHospitalIdRef.current, [hospitalId]: draft };
        await refreshFavorites();
        setCommentDraftByHospitalId((p) => ({ ...p, [hospitalId]: draft }));
      } catch (e) {
        setCommentErrorByHospitalId((p) => ({ ...p, [hospitalId]: e instanceof Error ? e.message : "No se pudo guardar la nota." }));
      } finally {
        setCommentSavingId((cur) => (cur === hospitalId ? null : cur));
      }
    },
    [apiBase, commentDraftByHospitalId, extractApiErrorMessage, favorites, openAuth, refreshFavorites],
  );

  const openReportModal = React.useCallback(
    (hospitalId: string) => {
      const token = getAuthToken();
      if (!token) {
        openAuth("login");
        return;
      }
      setReportHospitalId(hospitalId);
      setReportCategory("datos");
      setReportMessage("");
      setReportError(null);
      setReportOpen(true);
    },
    [openAuth],
  );

  const submitReportModal = React.useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      openAuth("login");
      return;
    }
    const hospitalId = reportHospitalId;
    if (!hospitalId) return;
    if (reportSaving) return;
    setReportSaving(true);
    setReportError(null);
    try {
      const r = await fetch(`${apiBase}/reportes`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          subject_type: "hospital",
          subject_id: hospitalId,
          category: reportCategory,
          message: reportMessage,
        }),
      });
      const body = await r.json().catch(() => null);
      if (!r.ok) throw new Error(extractApiErrorMessage(body, "No se pudo enviar el reporte."));
      setReportOpen(false);
      setReportMessage("");
    } catch (e) {
      setReportError(e instanceof Error ? e.message : "No se pudo enviar el reporte.");
    } finally {
      setReportSaving(false);
    }
  }, [apiBase, extractApiErrorMessage, openAuth, reportCategory, reportHospitalId, reportMessage, reportSaving]);

  const loadAdminReports = React.useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      openAuth("login");
      return;
    }
    setAdminReportsLoading(true);
    setAdminReportsError(null);
    try {
      const r = await fetch(`${apiBase}/reportes?status=open&limit=200`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await r.json().catch(() => null);
      if (!r.ok) throw new Error(extractApiErrorMessage(body, "No se pudo cargar reportes."));
      const list =
        body && typeof body === "object" && "reports" in body && Array.isArray((body as { reports?: unknown }).reports)
          ? ((body as { reports: typeof adminReports }).reports as typeof adminReports)
          : [];
      setAdminReports(list);
    } catch (e) {
      setAdminReportsError(e instanceof Error ? e.message : "No se pudo cargar reportes.");
    } finally {
      setAdminReportsLoading(false);
    }
  }, [apiBase, extractApiErrorMessage, openAuth]);

  const closeReport = React.useCallback(
    async (id: string) => {
      const token = getAuthToken();
      if (!token) {
        openAuth("login");
        return;
      }
      try {
        const r = await fetch(`${apiBase}/reportes/${encodeURIComponent(id)}`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ status: "closed" }),
        });
        const body = await r.json().catch(() => null);
        if (!r.ok) throw new Error(extractApiErrorMessage(body, "No se pudo cerrar el reporte."));
        setAdminReports((prev) => prev.filter((x) => x.id !== id));
      } catch (e) {
        setAdminReportsError(e instanceof Error ? e.message : "No se pudo cerrar el reporte.");
      }
    },
    [apiBase, extractApiErrorMessage, openAuth],
  );

  React.useEffect(() => {
    setNotesDraftByFavoriteId((prev) => {
      const synced = notesLastSyncedByFavoriteIdRef.current;
      let syncedNext: Record<string, string> | null = null;
      let changed = false;
      const next: Record<string, string> = { ...prev };

      for (const f of favorites) {
        const incoming = extractNotes(f.meta);
        const current = prev[f.id];
        const lastSynced = synced[f.id];

        if (lastSynced !== incoming) {
          if (!syncedNext) syncedNext = { ...synced };
          syncedNext[f.id] = incoming;
        }

        const isDirty = current != null && lastSynced != null && current !== lastSynced;
        if (current == null || !isDirty) {
          if (current !== incoming) {
            next[f.id] = incoming;
            changed = true;
          }
        }
      }

      if (syncedNext) notesLastSyncedByFavoriteIdRef.current = syncedNext;
      return changed ? next : prev;
    });
  }, [extractNotes, favorites]);

  const filteredFavorites = React.useMemo(() => {
    const q = normalizeText(favoritesSearch);
    if (!q) return favorites;
    return favorites.filter((fav) => {
      const title =
        fav.item_type === "hospital"
          ? fav.hospital?.nombre_establecimiento || fav.name || fav.item_id
          : fav.name || fav.item_id;
      const haystack =
        fav.item_type === "hospital" && fav.hospital
          ? [
              title,
              fav.hospital.institucion,
              fav.hospital.departamento,
              fav.hospital.provincia,
              fav.hospital.distrito,
              fav.hospital.categoria,
              fav.hospital.nombre_establecimiento,
              fav.hospital.codigo_renipress_modular,
            ]
          : [title, "lugar", fav.item_type];
      return normalizeText(haystack.filter(Boolean).join(" ")).includes(q);
    });
  }, [favorites, favoritesSearch]);

  const saveFavoriteNotes = React.useCallback(
    async (fav: FavoriteItem) => {
      const token = getAuthToken();
      if (!token) {
        openAuth("login");
        return;
      }
      setNotesSavingId(fav.id);
      setNotesError(null);
      try {
        const current = notesDraftByFavoriteId[fav.id] ?? "";
        const baseMeta = fav.meta && typeof fav.meta === "object" ? (fav.meta as Record<string, unknown>) : {};
        const meta = { ...baseMeta, notes: current };
        const body =
          fav.item_type === "hospital"
            ? { item_type: "hospital" as const, item_id: fav.item_id, meta }
            : {
                item_type: "place" as const,
                item_id: fav.item_id,
                name: fav.name,
                lat: fav.lat,
                lon: fav.lon,
                meta,
              };
        const r = await fetch(`${apiBase}/favoritos`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const json = await r.json().catch(() => null);
        if (!r.ok) throw new Error(extractApiErrorMessage(json, "No se pudo guardar la nota."));
        notesLastSyncedByFavoriteIdRef.current = { ...notesLastSyncedByFavoriteIdRef.current, [fav.id]: current };
        if (fav.item_type === "hospital") {
          notesLastSyncedByHospitalIdRef.current = { ...notesLastSyncedByHospitalIdRef.current, [fav.item_id]: current };
          setCommentDraftByHospitalId((p) => (p[fav.item_id] != null ? p : { ...p, [fav.item_id]: current }));
        }
        await refreshFavorites();
      } catch (e) {
        setNotesError(e instanceof Error ? e.message : "No se pudo guardar la nota.");
      } finally {
        setNotesSavingId(null);
      }
    },
    [apiBase, extractApiErrorMessage, notesDraftByFavoriteId, openAuth, refreshFavorites],
  );

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

  const persistFavoriteOrder = React.useCallback(
    async (ids: string[]) => {
      const token = getAuthToken();
      if (!token) {
        openAuth("login");
        return;
      }
      if (favoritesReorderSaving) return;
      setFavoritesReorderSaving(true);
      try {
        const r = await fetch(`${apiBase}/favoritos/orden`, {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ ids }),
        });
        const body = await r.json().catch(() => null);
        if (!r.ok) throw new Error(extractApiErrorMessage(body, "No se pudo reordenar favoritos."));
      } catch (e) {
        setFavoritesError(e instanceof Error ? e.message : "No se pudo reordenar favoritos.");
        await refreshFavorites();
      } finally {
        setFavoritesReorderSaving(false);
      }
    },
    [apiBase, extractApiErrorMessage, favoritesReorderSaving, openAuth, refreshFavorites],
  );

  const moveFavoriteInList = React.useCallback(
    (fromId: string, toId: string) => {
      if (!fromId || !toId || fromId === toId) return;
      if (favoritesSearch.trim()) return;
      setFavorites((prev) => {
        const fromIndex = prev.findIndex((f) => f.id === fromId);
        const toIndex = prev.findIndex((f) => f.id === toId);
        if (fromIndex < 0 || toIndex < 0) return prev;
        const next = prev.slice();
        const [moved] = next.splice(fromIndex, 1);
        next.splice(toIndex, 0, moved);
        void persistFavoriteOrder(next.map((f) => f.id));
        return next;
      });
    },
    [favoritesSearch, persistFavoriteOrder],
  );

  // moved below handleSelectHospital to avoid TDZ

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
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const view = params.get("view");
    setFavoritesView(view === "favoritos" ? "favoritos" : "map");
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
  }, [filteredHospitals, selectedHospitalId, setHospitalQuery]);

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
          const body = await r.json().catch(() => null);
          if (Array.isArray(body)) return { results: body as NominatimResult[], warning: null as string | null };
          if (body && typeof body === "object") {
            const obj = body as Record<string, unknown>;
            const resultsRaw = obj["results"];
            if (Array.isArray(resultsRaw)) {
              const warning = typeof obj["warning"] === "string" ? String(obj["warning"]) : null;
              return { results: resultsRaw as NominatimResult[], warning };
            }
          }
          if (!r.ok) throw new Error("Error al buscar. Buscar de nuevo.");
          return { results: [] as NominatimResult[], warning: null as string | null };
        })
        .then(({ results, warning }) => {
          setSearchResults(Array.isArray(results) ? results : []);
          setSearchLoading(false);
          if (warning && !results.length) setSearchError(warning);
        })
        .catch((e) => {
          if (e && e.name === "AbortError") {
            if (!didTimeout) return;
            setSearchLoading(false);
            setSearchError("Servicio de búsqueda lento o no disponible. Buscar de nuevo.");
            return;
          }
          setSearchLoading(false);
          setSearchError(e instanceof Error ? e.message : "Error al buscar. Buscar de nuevo.");
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
      try {
        const r = await fetch(`${apiBase}/ruta?${qs}`, { signal: controller.signal });
        const body = await r.json().catch(() => null);
        const obj = body && typeof body === "object" ? (body as Record<string, unknown>) : null;
        const geometria = obj && typeof obj["geometria"] === "object" ? (obj["geometria"] as Record<string, unknown>) : null;
        const isValid =
          !!obj &&
          typeof obj["distancia"] === "number" &&
          typeof obj["duracion"] === "number" &&
          !!geometria &&
          geometria["type"] === "LineString" &&
          Array.isArray(geometria["coordinates"]);

        const isApprox = !!(obj && obj["aproximada"] === true);
        if (r.ok && isValid && !isApprox) {
          setRoute(body as RouteResponse);
        } else {
          const warning =
            obj && typeof obj["warning"] === "string"
              ? String(obj["warning"])
              : "Ruta por carretera no disponible. Usa Google Maps.";
          setRoute(null);
          setRouteError(approxWarning ? `${approxWarning} ${warning}` : warning);
        }
      } finally {
        clearTimeout(timeoutId);
      }
      setNearestAirport(null);
      setAirportDriveRoute(null);
      setAirportError(null);
      setActiveTrip({
        hospitalId: selectedHospital.id,
        hospitalName: toTitleCase(selectedHospital.nombre_establecimiento),
        lat: selectedHospital.lat,
        lng: selectedHospital.lng,
        mode: "carro",
      });
      if (approxWarning) setRouteError(approxWarning);
      setFocus(null);
    } catch (e) {
      const msg =
        e && typeof e === "object" && "name" in e && e.name === "AbortError"
          ? "Servicio de rutas lento o no disponible. Mostrando ruta aproximada."
          : geolocationErrorMessage(e);
      setRoute(null);
      setRouteError(approxWarning ? `${approxWarning} ${msg}` : msg);
    } finally {
      setRouteLoading(false);
    }
  }, [apiBase, requestGeolocation, routeOrigin, selectedHospital, userLocation]);

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
        r = await fetch(`${apiBase}/hospitales/${encodeURIComponent(selectedHospital.id)}/geocodificar?force=1`, {
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

  const handleSelectFavorite = React.useCallback(
    (fav: FavoriteItem) => {
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
        if (favoritesView === "favoritos") setViewQuery("map");
        return;
      }
      if (fav.item_type === "place" && fav.lat != null && fav.lon != null) {
        setFocus({ lat: fav.lat, lng: fav.lon, zoom: 16 });
        if (favoritesView === "favoritos") setViewQuery("map");
      }
    },
    [favoritesView, handleSelectHospital, setViewQuery],
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
      <div className="flex h-full min-h-0 flex-col">
      <AppHeader
        onOpenFilters={() => setSidebarOpen(true)}
        onCenterOnUser={handleCenterOnUser}
        centerOnUserLoading={centerOnUserLoading}
        onOpenAuth={openAuth}
        onOpenFavoritesPanel={() => {
          setViewQuery("favoritos");
        }}
        favorites={favorites}
        favoritesLoading={favoritesLoading}
        favoritesError={favoritesError}
        onRefreshFavorites={refreshFavorites}
        onSelectFavorite={handleSelectFavorite}
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

      <div className="relative flex-1 min-h-0 overflow-hidden">
        {favoritesView === "favoritos" ? (
          <div className="h-full overflow-auto bg-white">
            <div className="mx-auto w-full max-w-6xl px-4 py-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-0 items-center gap-4">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#007AFF] shadow-[0_8px_18px_rgba(0,122,255,0.22)]">
                    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden="true">
                      <path
                        d="M20.3 7.6a4.6 4.6 0 0 0-6.5 0L12 9.4l-1.8-1.8a4.6 4.6 0 0 0-6.5 6.5l1.8 1.8L12 21l6.5-5.1 1.8-1.8a4.6 4.6 0 0 0 0-6.5Z"
                        stroke="rgba(255,255,255,0.98)"
                        strokeWidth="1.5"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <div className="text-2xl font-semibold tracking-[-0.01em] text-[#1D1D1F]">Favoritos</div>
                    <div className="mt-1 text-sm font-medium text-[#86868B]">Notas y accesos rápidos</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-10 rounded-full border border-[#E5E5E7] bg-white px-4 text-sm font-semibold text-[#1D1D1F] hover:bg-black/[0.03]"
                    onClick={refreshFavorites}
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
                      <path
                        d="M20 12a8 8 0 1 1-2.34-5.66"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                      <path
                        d="M20 4v6h-6"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    Actualizar
                  </Button>
                  {authRole === "admin" ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-10 rounded-full border border-[#E5E5E7] bg-white px-4 text-sm font-semibold text-[#1D1D1F] hover:bg-black/[0.03]"
                      onClick={() => {
                        setAdminInboxOpen(true);
                        void loadAdminReports();
                      }}
                    >
                      Buzón
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-10 rounded-full !bg-[#0B5FFF] px-4 text-sm font-semibold !text-white shadow-[0_10px_20px_rgba(11,95,255,0.28)] hover:brightness-105"
                    onClick={() => setViewQuery("map")}
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
                      <path
                        d="M9 20l-5-2V6l5 2 6-2 5 2v12l-5-2-6 2Z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M9 8v12"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                      <path
                        d="M15 6v12"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                    Volver al mapa
                  </Button>
                </div>
              </div>

              {adminInboxOpen ? (
                <div className="fixed inset-0 z-[6000] flex items-center justify-center bg-black/40 px-4 py-6">
                  <div className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
                    <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
                      <div className="min-w-0">
                        <div className="text-base font-semibold text-[var(--title)]">Buzón de reportes</div>
                        <div className="mt-0.5 text-xs font-medium text-[var(--label)]">Visible solo para Admin</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-9 rounded-full border border-[#E5E5E7] bg-white px-4 text-sm font-semibold text-[#1D1D1F] hover:bg-black/[0.03]"
                          onClick={() => void loadAdminReports()}
                          disabled={adminReportsLoading}
                        >
                          Actualizar
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-9 rounded-full border border-[#E5E5E7] bg-white px-4 text-sm font-semibold text-[#1D1D1F] hover:bg-black/[0.03]"
                          onClick={() => setAdminInboxOpen(false)}
                        >
                          Cerrar
                        </Button>
                      </div>
                    </div>

                    <div className="max-h-[70vh] overflow-auto px-5 py-4">
                      {adminReportsError ? (
                        <div className="mb-3 rounded-xl bg-black/[0.03] px-4 py-3 text-sm font-semibold text-[var(--title)]">
                          {adminReportsError}
                        </div>
                      ) : null}

                      {adminReportsLoading ? (
                        <div className="text-sm font-semibold text-[var(--title)]">Cargando…</div>
                      ) : adminReports.length === 0 && !adminReportsDemo ? (
                        <div className="rounded-xl bg-black/[0.02] px-4 py-4">
                          <div className="text-sm font-semibold text-[var(--title)]">Sin reportes</div>
                          <div className="mt-1 text-xs font-medium text-[var(--label)]">
                            Para preview, puedes cargar datos de demo.
                          </div>
                          <div className="mt-3">
                            <Button
                              size="sm"
                              variant="secondary"
                              className="h-9 rounded-full border border-[#E5E5E7] bg-white px-4 text-sm font-semibold text-[#1D1D1F] hover:bg-black/[0.03]"
                              onClick={() => {
                                setAdminReportsDemo(true);
                                setAdminReports([
                                  {
                                    id: "demo-1",
                                    subject_type: "hospital",
                                    subject_id: "00000001",
                                    category: "ubicacion",
                                    message: "La coordenada parece estar en el distrito vecino. Revisar RENIPRESS / geocoding.",
                                    status: "open",
                                    created_at: new Date().toISOString(),
                                  },
                                  {
                                    id: "demo-2",
                                    subject_type: "hospital",
                                    subject_id: "00000002",
                                    category: "datos",
                                    message: "El nombre del establecimiento está desactualizado.",
                                    status: "open",
                                    created_at: new Date().toISOString(),
                                  },
                                  {
                                    id: "demo-3",
                                    subject_type: "hospital",
                                    subject_id: "00000003",
                                    category: "bug",
                                    message: "En móvil, el panel se corta y no deja scrollear.",
                                    status: "open",
                                    created_at: new Date().toISOString(),
                                  },
                                ]);
                              }}
                            >
                              Cargar demo
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="grid gap-3">
                          {adminReports.map((r) => (
                            <div key={r.id} className="rounded-2xl border border-[var(--border)] bg-white px-4 py-4">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="text-xs font-semibold uppercase tracking-wide text-[var(--label)]">
                                    {r.subject_type} · {r.subject_id}
                                  </div>
                                  <div className="mt-1 text-sm font-semibold text-[var(--title)]">
                                    {r.category ? `Categoría: ${r.category}` : "Sin categoría"}
                                  </div>
                                  <div className="mt-2 whitespace-pre-wrap text-sm font-medium text-[var(--title)]">
                                    {r.message}
                                  </div>
                                  {r.created_at ? (
                                    <div className="mt-2 text-xs font-medium text-[var(--label)]">{r.created_at}</div>
                                  ) : null}
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    className="h-9 rounded-full border border-[var(--border)] px-4 text-sm font-semibold text-[var(--title)] hover:bg-black/[0.03]"
                                    onClick={() => {
                                      setAdminInboxOpen(false);
                                      setViewQuery("map");
                                      setHospitalQuery(r.subject_id);
                                      setTimeout(() => setHospitalQuery(r.subject_id), 0);
                                    }}
                                  >
                                    Ver
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    className="h-9 rounded-full border border-[var(--border)] px-4 text-sm font-semibold text-[var(--title)] hover:bg-black/[0.03]"
                                    onClick={() => {
                                      if (String(r.id).startsWith("demo-")) {
                                        setAdminReports((prev) => prev.filter((x) => x.id !== r.id));
                                        return;
                                      }
                                      void closeReport(r.id);
                                    }}
                                  >
                                    Cerrar
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="mt-3">
                <div className="relative">
                  <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#86868B]">
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
                      <path
                        d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                      <path d="M16 16l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </div>
                  <input
                    value={favoritesSearch}
                    onChange={(e) => setFavoritesSearch(e.target.value)}
                    placeholder="Buscar en favoritos..."
                    className="h-12 w-full rounded-2xl border border-[#E5E5E7] bg-[#F5F5F7] pl-12 pr-4 text-sm font-medium text-[#1D1D1F] shadow-[0_4px_12px_rgba(0,0,0,0.06)] outline-none ring-0 placeholder:text-[#86868B] focus:bg-white focus:shadow-[0_0_0_3px_rgba(0,122,255,0.15)]"
                  />
                </div>
              </div>

              <div className="mt-2 text-xs font-medium text-[var(--label)]">
                {favoritesEnabled ? `${filteredFavorites.length} guardados` : "Inicia sesión para ver tus favoritos"}
              </div>
            </div>

            <div className="border-t border-[var(--border)]" />

            <div className="mx-auto w-full max-w-6xl px-4 pb-10 pt-3">
              {notesError ? (
                <div className="mb-3 rounded-[var(--radius-card)] bg-white px-4 py-3 text-sm font-medium text-red-600 shadow-[var(--shadow-soft)]">
                  {notesError}
                </div>
              ) : null}

              {!favoritesEnabled ? (
                <div className="rounded-[var(--radius-panel)] bg-white px-5 py-4 shadow-[var(--shadow-soft)]">
                  <div className="text-sm font-semibold text-[var(--title)]">Inicia sesión</div>
                  <div className="mt-1 text-xs font-medium text-[var(--label)]">Para ver y editar tus favoritos.</div>
                  <div className="mt-3 flex justify-end">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="rounded-full !bg-[#007AFF] px-5 !text-white hover:brightness-105"
                      onClick={() => openAuth("login")}
                    >
                      Iniciar sesión
                    </Button>
                  </div>
                </div>
              ) : favoritesLoading ? (
                <div className="rounded-[var(--radius-panel)] bg-white px-5 py-4 shadow-[var(--shadow-soft)]">
                  <div className="text-sm font-semibold text-[var(--title)]">Cargando…</div>
                </div>
              ) : favoritesError ? (
                <div className="rounded-[var(--radius-panel)] bg-white px-5 py-4 shadow-[var(--shadow-soft)]">
                  <div className="text-sm font-semibold text-[var(--title)]">Error</div>
                  <div className="mt-1 text-xs font-medium text-[var(--label)]">{favoritesError}</div>
                </div>
              ) : filteredFavorites.length === 0 ? (
                <div className="rounded-[var(--radius-panel)] bg-white px-5 py-4 shadow-[var(--shadow-soft)]">
                  <div className="text-sm font-semibold text-[var(--title)]">Sin favoritos</div>
                  <div className="mt-1 text-xs font-medium text-[var(--label)]">
                    {favoritesSearch.trim() ? "No hay resultados para tu búsqueda." : "Marca establecimientos con el corazón para que aparezcan aquí."}
                  </div>
                </div>
              ) : (
                <div className="grid gap-3">
                  {filteredFavorites.map((fav) => {
                    const title =
                      fav.item_type === "hospital"
                        ? fav.hospital?.nombre_establecimiento || fav.name || fav.item_id
                        : fav.name || fav.item_id;
                    const subtitle =
                      fav.item_type === "hospital" && fav.hospital
                        ? `${fav.hospital.institucion || ""}${fav.hospital.departamento ? ` - ${fav.hospital.departamento}` : ""}`
                        : fav.item_type === "place"
                        ? "Lugar"
                        : "";
                    const notesValue = notesDraftByFavoriteId[fav.id] ?? "";
                    const inst = fav.item_type === "hospital" ? String(fav.hospital?.institucion || "") : "";
                    const instLower = inst.toLowerCase();
                    const instColor = instLower.includes("essalud")
                      ? "#38BDF8"
                      : instLower.includes("minsa")
                      ? "#FBBF24"
                      : instLower.includes("fap") ||
                        instLower.includes("ffaa") ||
                        instLower.includes("pnp") ||
                        instLower.includes("marina") ||
                        instLower.includes("ejército") ||
                        instLower.includes("ejercito")
                      ? "#22C55E"
                      : "#EF4444";
                    const nivel = fav.item_type === "hospital" ? String(fav.hospital?.categoria || "").trim() : "";
                    const gd = fav.item_type === "hospital" ? String(fav.hospital?.grado_dificultad || "").trim() : "";
                    const notesOpen = !!notesOpenByFavoriteId[fav.id];
                    const location = fav.item_type === "hospital" ? String(fav.hospital?.departamento || "").trim() : "";
                    const dragDisabled = !!favoritesSearch.trim() || favoritesReorderSaving;
                    return (
                      <div
                        key={fav.id}
                        className={`relative overflow-hidden rounded-[var(--radius-panel)] border border-[var(--border)] bg-white${
                          favoriteDragOverId === fav.id ? " ring-2 ring-[#0B5FFF]/30" : ""
                        }`}
                        onDragOver={(e) => {
                          if (dragDisabled) return;
                          if (!favoriteDraggingId) return;
                          e.preventDefault();
                          setFavoriteDragOverId(fav.id);
                        }}
                        onDrop={(e) => {
                          if (dragDisabled) return;
                          e.preventDefault();
                          const fromId = favoriteDraggingId || e.dataTransfer.getData("text/plain");
                          moveFavoriteInList(fromId, fav.id);
                          setFavoriteDraggingId(null);
                          setFavoriteDragOverId(null);
                        }}
                      >
                        <div className="absolute left-0 top-0 h-full w-[2px] bg-[#0B5FFF]/80" aria-hidden="true" />
                        <div className="flex items-start justify-between gap-3 px-4 py-3">
                          <button type="button" className="min-w-0 text-left" onClick={() => handleSelectFavorite(fav)}>
                            <div className="flex items-start gap-3">
                              <div className="mt-0.5 text-[var(--label)]">
                                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
                                  <path
                                    d="M12 3.8l2.47 5.24 5.78.78-4.22 4.06 1.04 5.74L12 16.9 6.93 19.7l1.04-5.74-4.22-4.06 5.78-.78L12 3.8Z"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              </div>
                              <div className="min-w-0">
                                <div className="line-clamp-1 text-xs font-semibold text-[var(--title)]">{title}</div>
                                <div className="mt-1 flex items-center gap-2 text-[11px] font-medium text-[var(--label)]">
                                  <span aria-hidden="true" className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: instColor }} />
                                  <span className="line-clamp-1">{subtitle || "—"}</span>
                                </div>
                                {location ? (
                                  <div className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-[var(--label)]">
                                    {location}
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          </button>

                          <div className="flex shrink-0 items-center gap-2">
                            <button
                              type="button"
                              draggable={!dragDisabled}
                              onDragStart={(e) => {
                                if (dragDisabled) return;
                                setFavoriteDraggingId(fav.id);
                                e.dataTransfer.setData("text/plain", fav.id);
                                e.dataTransfer.effectAllowed = "move";
                              }}
                              onDragEnd={() => {
                                setFavoriteDraggingId(null);
                                setFavoriteDragOverId(null);
                              }}
                              className={
                                dragDisabled
                                  ? "inline-flex h-8 w-8 cursor-not-allowed items-center justify-center rounded-xl border border-[var(--border)] text-[var(--label)] opacity-50"
                                  : "inline-flex h-8 w-8 cursor-grab items-center justify-center rounded-xl border border-[var(--border)] text-[var(--label)] transition-colors hover:bg-[#F3F4F6] active:cursor-grabbing"
                              }
                              aria-label="Reordenar favorito"
                              title={dragDisabled ? "Desactiva búsqueda para reordenar" : "Arrastra para reordenar"}
                            >
                              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
                                <path
                                  d="M9 7h.01M9 12h.01M9 17h.01M15 7h.01M15 12h.01M15 17h.01"
                                  stroke="currentColor"
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                />
                              </svg>
                            </button>
                            {gd ? (
                              <span className="inline-flex h-7 min-w-[2.25rem] items-center justify-center rounded-full border border-[#D1FAE5] bg-[#ECFDF5] px-3 text-xs font-semibold tracking-wide text-[#065F46]">
                                {gd}
                              </span>
                            ) : null}
                            {nivel ? (
                              <span className="inline-flex h-7 min-w-[2.25rem] items-center justify-center rounded-full border border-[#CDE1FF] bg-[#EEF5FF] px-3 text-xs font-semibold tracking-wide text-[#1D1D1F]">
                                {nivel}
                              </span>
                            ) : null}
                            <Button
                              size="sm"
                              variant="secondary"
                              className="h-8 rounded-xl border border-[var(--border)] px-3 text-xs text-[var(--title)] transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600"
                              onClick={() => removeFavorite({ item_type: fav.item_type, item_id: fav.item_id })}
                            >
                              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
                                <path d="M4 7h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                <path d="M10 11v7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                <path d="M14 11v7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                <path d="M6 7l1 14h10l1-14" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                                <path d="M9 7V4h6v3" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                              </svg>
                              Quitar
                            </Button>
                          </div>
                        </div>

                        <button
                          type="button"
                          className="flex w-full items-center justify-between gap-3 border-t border-[var(--border)] px-4 py-2 text-left"
                          onClick={() =>
                            setNotesOpenByFavoriteId((prev) => ({ ...prev, [fav.id]: !(prev[fav.id] ?? false) }))
                          }
                          aria-expanded={notesOpen}
                        >
                          <div className="text-xs font-semibold text-[var(--title)]">Notas</div>
                          <div className="text-[var(--label)]">
                            <svg
                              viewBox="0 0 24 24"
                              className={notesOpen ? "h-5 w-5 rotate-180" : "h-5 w-5"}
                              fill="none"
                              aria-hidden="true"
                            >
                              <path
                                d="M6 9l6 6 6-6"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </div>
                        </button>

                        <div
                          className="overflow-hidden transition-[max-height,opacity] duration-200 ease-out"
                          style={{ maxHeight: notesOpen ? 260 : 0, opacity: notesOpen ? 1 : 0 }}
                        >
                          <div className="px-4 pb-4 pt-3">
                            <div className="rounded-[14px] bg-[#F3F4F6] p-3 ring-1 ring-inset ring-[#E5E7EB]/70 transition-shadow focus-within:ring-[#D0D5DD]">
                              <textarea
                                value={notesValue}
                                onChange={(e) => setNotesDraftByFavoriteId((prev) => ({ ...prev, [fav.id]: e.target.value }))}
                                rows={4}
                                className="h-28 w-full resize-none border-0 bg-transparent text-sm font-medium text-[var(--title)] placeholder-[#A0A4AB] outline-none"
                                placeholder="Escribe una nota…"
                              />
                            </div>
                            <div className="mt-2 flex items-center justify-end">
                              <Button
                                size="sm"
                                variant="secondary"
                                className="h-8 rounded-full !bg-[#10B981] px-4 !text-white hover:brightness-105"
                                onClick={() => saveFavoriteNotes(fav)}
                                disabled={notesSavingId === fav.id}
                              >
                                {notesSavingId === fav.id ? "Guardando…" : "Guardar"}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
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
              serumsPeriodoLabel={filters.serums_periodo}
            />

            <div className="absolute right-3 top-3 z-[1200] hidden sm:block">
              <div className="grid gap-2">
                <div className="w-[220px] overflow-hidden rounded-[var(--radius-panel)] bg-white/95 px-4 py-3 shadow-[var(--shadow-soft)] backdrop-blur">
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

                <MapLegendCard />

                {activeTrip && activeTripSummary ? (
                  <div className="w-[220px] overflow-hidden rounded-[var(--radius-panel)] bg-white/95 px-4 py-3 shadow-[var(--shadow-soft)] backdrop-blur">
                    <div className="text-[11px] font-semibold text-[var(--title)]">
                      Ruta activa · {activeTripSummary.label}
                    </div>
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

            <div className="absolute left-3 right-3 top-3 z-[1200] sm:hidden">
              <div className="mx-auto w-full max-w-[520px] overflow-hidden rounded-[var(--radius-panel)] bg-white/95 px-4 py-3 shadow-[var(--shadow-soft)] backdrop-blur">
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
            </div>

            <div className="absolute bottom-3 left-3 right-3 z-[1200] sm:hidden">
              <div className="mx-auto grid w-full max-w-[520px] justify-items-center gap-2">
                {activeTrip && activeTripSummary ? (
                  <div className="overflow-hidden rounded-[var(--radius-panel)] bg-white/95 px-4 py-3 shadow-[var(--shadow-soft)] backdrop-blur">
                    <div className="text-[11px] font-semibold text-[var(--title)]">
                      Ruta activa · {activeTripSummary.label}
                    </div>
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
                <MapLegendCard />
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
                  results={hospitalsForMapAfterLegend}
                  selectedHospitalId={selectedHospitalId}
                  onSelectHospital={handleSelectHospital}
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
                className={cn(
                  "absolute inset-0 bg-black/20 transition-opacity",
                  sidebarOpen ? "opacity-100" : "opacity-0",
                )}
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
                  results={hospitalsForMapAfterLegend}
                  selectedHospitalId={selectedHospitalId}
                  onSelectHospital={handleSelectHospital}
                  onCloseMobile={() => setSidebarOpen(false)}
                />
              </div>
            </div>

          </>
        )}
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
        serumsPeriodoLabel={filters.serums_periodo}
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
        commentEnabled={favoritesEnabled}
        comment={selectedHospitalId ? (commentDraftByHospitalId[selectedHospitalId] ?? "") : ""}
        commentLoading={!!(selectedHospitalId && commentLoadingId === selectedHospitalId)}
        commentSaving={!!(selectedHospitalId && commentSavingId === selectedHospitalId)}
        commentError={selectedHospitalId ? (commentErrorByHospitalId[selectedHospitalId] ?? null) : null}
        onChangeComment={(next) => {
          if (!selectedHospitalId) return;
          setCommentDraftByHospitalId((p) => ({ ...p, [selectedHospitalId]: next }));
        }}
        onSaveComment={() => {
          if (!selectedHospitalId) return;
          saveHospitalComment(selectedHospitalId);
        }}
        onOpenReport={() => {
          if (!selectedHospitalId) return;
          openReportModal(selectedHospitalId);
        }}
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

      {reportOpen ? (
        <div
          className="fixed inset-0 z-[6000] flex items-center justify-center bg-black/40 px-4 py-6"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setReportOpen(false);
          }}
        >
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
            <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
              <div className="min-w-0">
                <div className="text-base font-semibold text-[var(--title)]">Reportar incidente</div>
                <div className="mt-0.5 line-clamp-1 text-xs font-medium text-[var(--label)]">
                  {selectedHospital && reportHospitalId === selectedHospital.id
                    ? selectedHospital.nombre_establecimiento || selectedHospital.id
                    : reportHospitalId || ""}
                </div>
              </div>
              <Button
                size="sm"
                variant="secondary"
                className="h-9 rounded-full border border-[#E5E5E7] bg-white px-4 text-sm font-semibold text-[#1D1D1F] hover:bg-black/[0.03]"
                onClick={() => setReportOpen(false)}
              >
                Cerrar
              </Button>
            </div>

            <div className="px-5 py-4">
              <div className="grid gap-3">
                <select
                  value={reportCategory}
                  onChange={(e) => setReportCategory(e.target.value)}
                  disabled={reportSaving}
                  className="h-10 w-full rounded-[var(--radius-card)] border border-[var(--border)] bg-white px-3 text-sm font-semibold text-[var(--title)] outline-none disabled:opacity-60"
                >
                  <option value="datos">Datos incorrectos</option>
                  <option value="ubicacion">Ubicación incorrecta</option>
                  <option value="plazas">Plazas/Oferta</option>
                  <option value="bug">Bug / UI</option>
                  <option value="otro">Otro</option>
                </select>
                <textarea
                  value={reportMessage}
                  onChange={(e) => setReportMessage(e.target.value)}
                  placeholder="Describe el problema…"
                  disabled={reportSaving}
                  className="min-h-[130px] w-full resize-y rounded-[var(--radius-card)] border border-[var(--border)] bg-white px-3 py-3 text-sm font-medium text-[var(--title)] shadow-[0_1px_0_rgba(0,0,0,0.04)] outline-none placeholder:text-[var(--label)] focus:border-black/10 focus:ring-2 focus:ring-black/5 disabled:opacity-60"
                />
                {reportError ? (
                  <div className="rounded-[var(--radius-card)] bg-black/[0.02] px-3 py-2 text-xs font-semibold text-[var(--title)]">
                    {reportError}
                  </div>
                ) : null}
                <div className="flex items-center justify-end gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-9 rounded-full border border-[#E5E5E7] bg-white px-4 text-sm font-semibold text-[#1D1D1F] hover:bg-black/[0.03]"
                    onClick={() => setReportOpen(false)}
                    disabled={reportSaving}
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-9 rounded-full !bg-[#0B5FFF] px-4 text-sm font-semibold !text-white shadow-[0_10px_20px_rgba(11,95,255,0.28)] hover:brightness-105"
                    onClick={() => void submitReportModal()}
                    disabled={reportSaving || !reportHospitalId || !reportMessage.trim()}
                  >
                    {reportSaving ? "Enviando…" : "Enviar"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

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
