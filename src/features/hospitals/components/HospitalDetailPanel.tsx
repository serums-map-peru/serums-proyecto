"use client";

import * as React from "react";
import Image from "next/image";

import { Hospital, NearbyPlace, NearbyPlacesResponse, NominatimResult, RouteResponse } from "@/features/hospitals/types";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";

type TravelMode = "carro" | "avion";

export type HospitalDetailPanelProps = {
  hospital: Hospital | null;
  loading?: boolean;
  error?: string | null;
  open: boolean;
  onClose: () => void;
  canCorrectLocation?: boolean;
  authRole?: "admin" | "user" | null;
  route?: RouteResponse | null;
  routeLoading?: boolean;
  routeError?: string | null;
  apiBase: string;
  routeOrigin:
    | { type: "user" }
    | { type: "custom"; label: string; lat: number; lng: number }
    | { type: "airport"; label: string; lat: number; lng: number };
  onChangeRouteOrigin: (
    next:
      | { type: "user" }
      | { type: "custom"; label: string; lat: number; lng: number }
      | { type: "airport"; label: string; lat: number; lng: number },
  ) => void;
  onUseNearestAirportAsOrigin?: () => void;
  nearestAirport?: NearbyPlace | null;
  nearestAirportDistanceMeters?: number | null;
  airportDriveRoute?: RouteResponse | null;
  airportLoading?: boolean;
  airportError?: string | null;
  travelMode: TravelMode;
  onChangeTravelMode: (mode: TravelMode) => void;
  activeTripMode?: TravelMode | null;
  directDistanceMeters?: number | null;
  shareUrl: string;
  nearby?: NearbyPlacesResponse | null;
  nearbyLoading?: boolean;
  nearbyError?: string | null;
  geocodeLoading?: boolean;
  geocodeError?: string | null;
  geocodeMessage?: string | null;
  onRequestRoute?: () => void;
  onRequestNearby?: () => void;
  onRequestGeocode?: () => void;
  nearbyFilters?: { types: string[]; radiusKm: number };
  onChangeNearbyFilters?: (next: { types: string[]; radiusKm: number }) => void;
  filteredNearby?: Array<{ p: NearbyPlace; group: string; dist: number; index: number }>;
  onHoverNearby?: (id: string | null) => void;
  onClickNearby?: (id: string) => void;
  onClearNearby?: () => void;
  favoritesEnabled?: boolean;
  isHospitalFavorited?: boolean;
  onToggleFavoriteHospital?: () => void;
  onToggleFavoritePlace?: (place: NearbyPlace, group: string) => void;
  isPlaceFavorited?: (placeId: string) => boolean;
  onRequestAuthForFavorites?: () => void;
  commentEnabled?: boolean;
  comment?: string;
  commentLoading?: boolean;
  commentSaving?: boolean;
  commentError?: string | null;
  onChangeComment?: (next: string) => void;
  onSaveComment?: () => void;
};

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

function mapsUrlForPlace(p: NearbyPlace) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${p.lat},${p.lon}`)}`;
}

function mapsUrlForHospital(
  h: {
    nombre_establecimiento?: string | null;
    departamento?: string | null;
    provincia?: string | null;
    distrito?: string | null;
    coordenadas_fuente?: string | null;
    lat?: number;
    lng?: number;
  } | null,
) {
  if (!h) return "";
  const lat = typeof h.lat === "number" ? h.lat : NaN;
  const lng = typeof h.lng === "number" ? h.lng : NaN;
  const source = String(h.coordenadas_fuente || "").toUpperCase();
  const isApprox = source.includes("CENTROID");

  const name = String(h.nombre_establecimiento || "").trim();
  const distrito = String(h.distrito || "").trim();
  const provincia = String(h.provincia || "").trim();
  const departamento = String(h.departamento || "").trim();

  if (Number.isFinite(lat) && Number.isFinite(lng) && !isApprox) {
    const qs = new URLSearchParams({
      api: "1",
      map_action: "map",
      center: `${lat},${lng}`,
      zoom: "18",
      query: name ? `${lat},${lng} ${name}` : `${lat},${lng}`,
    }).toString();
    return `https://www.google.com/maps/@?${qs}`;
  }

  const text = [name, distrito, provincia, departamento, "Perú"].filter(Boolean).join(", ");
  if (!text) return "";
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(text)}`;
}

function directionsUrl(origin: { lat: number; lng: number } | null, dest: { lat: number; lng: number } | null) {
  if (!dest) return "";
  if (!Number.isFinite(dest.lat) || !Number.isFinite(dest.lng)) return "";
  const qs = new URLSearchParams({
    api: "1",
    destination: `${dest.lat},${dest.lng}`,
    travelmode: "driving",
    ...(origin && Number.isFinite(origin.lat) && Number.isFinite(origin.lng)
      ? { origin: `${origin.lat},${origin.lng}` }
      : {}),
  }).toString();
  return `https://www.google.com/maps/dir/?${qs}`;
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

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path d="M18 6 6 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M6 6l12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="M3 11l18-8-8 18-2-7-8-3z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="M12 21s-6.3-4.3-8.8-8c-2.2-3.2-.6-7 3-7 1.9 0 3.4 1 4.3 2.4C11.4 7 12.9 6 14.8 6c3.6 0 5.2 3.8 3 7-2.5 3.7-8.8 8-8.8 8Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
        fill={filled ? "currentColor" : "none"}
      />
    </svg>
  );
}

function MapIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="M12 21s6-6 6-10a6 6 0 1 0-12 0c0 4 6 10 6 10Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M12 13.2a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
    </svg>
  );
}

function WhatsappIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="M12 21.3a9.2 9.2 0 0 1-4.5-1.2L3 21l1.1-4.3A9.2 9.2 0 1 1 12 21.3Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M9.2 8.6c.2-.5.5-.5.8-.5h.6c.2 0 .4.1.5.4l.7 1.7c.1.2.1.5-.1.7l-.4.5c-.1.1-.1.3 0 .5.6 1.1 1.5 2 2.6 2.6.2.1.4.1.5 0l.5-.4c.2-.2.5-.2.7-.1l1.7.7c.3.1.4.3.4.5v.6c0 .3 0 .6-.5.8-.4.2-1.1.3-2.1.1-1-.2-2.4-.8-3.8-2.2-1.4-1.4-2-2.8-2.2-3.8-.2-1 0-1.7.1-2.1Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="M9 9h9v10a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V11a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M7 15H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v1"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="M14 8h2V5h-2c-2.2 0-4 1.8-4 4v2H8v3h2v6h3v-6h2.1l.9-3H13V9c0-.6.4-1 1-1Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TwitterIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="M8 20h3.3L20 4h-3.3L8 20ZM4 4l8 10"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13 14l7 6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TravelIcon({ mode }: { mode: TravelMode }) {
  if (mode === "avion") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
        <path
          d="M2.5 12l19-7-6.2 18.5-3.2-7.1L2.5 12Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path d="M21.5 5 12.1 16.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
      <path
        d="M3.5 13.5V11.2c0-.7.4-1.4 1-1.7l2.2-1.1 1.1-2.6C8.1 4.9 8.9 4.3 9.8 4.3h4.4c.9 0 1.7.6 2 1.5l1.1 2.6 2.2 1.1c.6.3 1 .9 1 1.7v2.3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path d="M6.5 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M17.5 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3.5 13.5h17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid gap-1">
      <div className="text-xs font-medium text-[var(--label)]">{label}</div>
      <div className="text-sm font-medium text-[var(--title)]">{value}</div>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-full bg-black/[0.03] px-3 py-2 text-xs font-medium text-[var(--title)]">{children}</div>
  );
}

export function HospitalDetailPanel({
  hospital,
  loading = false,
  error = null,
  open,
  onClose,
  canCorrectLocation = false,
  authRole = null,
  route = null,
  routeLoading = false,
  routeError = null,
  apiBase,
  routeOrigin,
  onChangeRouteOrigin,
  onUseNearestAirportAsOrigin,
  nearestAirport = null,
  nearestAirportDistanceMeters = null,
  airportDriveRoute = null,
  airportLoading = false,
  airportError = null,
  travelMode,
  onChangeTravelMode,
  activeTripMode = null,
  directDistanceMeters = null,
  shareUrl,
  nearby = null,
  nearbyLoading = false,
  nearbyError = null,
  geocodeLoading = false,
  geocodeError = null,
  geocodeMessage = null,
  onRequestRoute,
  onRequestNearby,
  onRequestGeocode,
  nearbyFilters = { types: [], radiusKm: 2 },
  onChangeNearbyFilters,
  filteredNearby,
  onHoverNearby,
  onClickNearby,
  onClearNearby,
  favoritesEnabled = false,
  isHospitalFavorited = false,
  onToggleFavoriteHospital,
  onToggleFavoritePlace,
  isPlaceFavorited,
  onRequestAuthForFavorites,
  commentEnabled = false,
  comment = "",
  commentLoading = false,
  commentSaving = false,
  commentError = null,
  onChangeComment,
  onSaveComment,
}: HospitalDetailPanelProps) {
  const imageUrl = hospital && hospital.imagenes && hospital.imagenes.length > 0 ? hospital.imagenes[0] : null;
  const [imageOk, setImageOk] = React.useState(true);
  const [tab, setTab] = React.useState<"info" | "como-llegar">("info");
  const [moreOpen, setMoreOpen] = React.useState(false);
  const [technicalOpen, setTechnicalOpen] = React.useState(false);
  const [shareOpen, setShareOpen] = React.useState(false);
  const shareMenuRef = React.useRef<HTMLDivElement | null>(null);
  const [shareToast, setShareToast] = React.useState<string | null>(null);
  const [sheet, setSheet] = React.useState<"collapsed" | "medium" | "full">("medium");
  const [viewportHeight, setViewportHeight] = React.useState(0);
  const [draggingSheet, setDraggingSheet] = React.useState(false);
  const [dragHeightPx, setDragHeightPx] = React.useState<number | null>(null);
  const dragStartRef = React.useRef<{ startY: number; startHeight: number } | null>(null);
  const draggedRef = React.useRef(false);
  const modeForSummary = activeTripMode ?? travelMode;

  const [originQuery, setOriginQuery] = React.useState("");
  const [originResults, setOriginResults] = React.useState<NominatimResult[]>([]);
  const [originLoading, setOriginLoading] = React.useState(false);
  const [originError, setOriginError] = React.useState<string | null>(null);
  const [confirmPlace, setConfirmPlace] = React.useState<NearbyPlace | null>(null);

  React.useEffect(() => {
    setImageOk(true);
  }, [imageUrl]);

  React.useEffect(() => {
    if (!open) return;
    setTab("info");
    setMoreOpen(false);
    setTechnicalOpen(false);
    setShareOpen(false);
    setShareToast(null);
    setOriginQuery("");
    setOriginResults([]);
    setOriginLoading(false);
    setOriginError(null);
    setSheet("medium");
    setConfirmPlace(null);
  }, [open, hospital?.id]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const update = () => setViewportHeight(window.innerHeight || 0);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  React.useEffect(() => {
    if (tab === "info") return;
    if (onClearNearby) onClearNearby();
    setConfirmPlace(null);
  }, [onClearNearby, tab]);

  React.useEffect(() => {
    if (!shareOpen) return;
    const onDown = (e: MouseEvent) => {
      const el = shareMenuRef.current;
      if (!el) return;
      if (e.target && el.contains(e.target as Node)) return;
      setShareOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [shareOpen]);

  React.useEffect(() => {
    const q = originQuery.trim();
    const coordMatch = q.match(/^\s*(-?\d{1,2}(?:[.,]\d+)?)\s*,\s*(-?\d{1,3}(?:[.,]\d+)?)\s*$/);
    if (coordMatch) {
      const lat = Number(String(coordMatch[1]).replace(",", "."));
      const lng = Number(String(coordMatch[2]).replace(",", "."));
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        setOriginResults([
          {
            place_id: -1,
            display_name: `Coordenadas: ${lat}, ${lng}`,
            lat: String(lat),
            lon: String(lng),
          },
        ]);
        setOriginLoading(false);
        setOriginError(null);
        return;
      }
    }
    if (q.length < 3) {
      setOriginResults([]);
      setOriginLoading(false);
      setOriginError(null);
      return;
    }

    const controller = new AbortController();
    setOriginLoading(true);
    setOriginError(null);
    const t = setTimeout(() => {
      let didTimeout = false;
      const timeoutId = setTimeout(() => {
        didTimeout = true;
        controller.abort();
      }, 10_000);
      fetch(`${apiBase}/buscar?q=${encodeURIComponent(q)}`, { signal: controller.signal })
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
          setOriginResults(Array.isArray(results) ? results : []);
          setOriginLoading(false);
          if (warning && !results.length) setOriginError(warning);
        })
        .catch((e) => {
          if (e && e.name === "AbortError") {
            if (!didTimeout) return;
            setOriginLoading(false);
            setOriginError("Servicio de búsqueda lento o no disponible. Buscar de nuevo.");
            return;
          }
          setOriginLoading(false);
          setOriginError(e instanceof Error ? e.message : "Error al buscar. Buscar de nuevo.");
        })
        .finally(() => clearTimeout(timeoutId));
    }, 320);

    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [apiBase, originQuery]);

  const fullName = hospital?.nombre_establecimiento ? toTitleCase(hospital.nombre_establecimiento) : "";
  const fullLocation = hospital ? `${hospital.distrito} · ${hospital.provincia} · ${hospital.departamento}` : "";
  const profesion = hospital
    ? hospital.profesiones && hospital.profesiones.length > 0
      ? hospital.profesiones.join(" · ")
      : hospital.profesion || "—"
    : "—";
  const plazasTotal =
    hospital && hospital.serums_resumen && hospital.serums_resumen.length > 0
      ? hospital.serums_resumen.reduce((acc, r) => acc + (Number.isFinite(r.plazas_total) ? r.plazas_total : 0), 0)
      : null;

  const plazasByModalidad = React.useMemo(() => {
    const rows = hospital?.serums_resumen || [];
    const norm = (v: string) =>
      String(v || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
    let remunerado = 0;
    let equivalente = 0;
    for (const r of rows) {
      const total = Number.isFinite(r.plazas_total) ? r.plazas_total : 0;
      const mod = norm(r.modalidad);
      if (mod.includes("remuner")) remunerado += total;
      else if (mod.includes("equival")) equivalente += total;
    }
    return { remunerado, equivalente };
  }, [hospital?.serums_resumen]);

  const summaryMetric = React.useMemo(() => {
    if (modeForSummary === "avion") {
      const dist = airportDriveRoute ? formatDistance(airportDriveRoute.distancia) : "—";
      const dur = airportDriveRoute ? formatDuration(airportDriveRoute.duracion) : "—";
      return { primary: dur, secondary: dist, label: "Desde aeropuerto" };
    }
    const dur = route ? formatDuration(route.duracion) : "—";
    const dist = route ? formatDistance(route.distancia) : directDistanceMeters != null ? formatDistance(directDistanceMeters) : "—";
    return { primary: dur, secondary: dist, label: "Carro" };
  }, [airportDriveRoute, directDistanceMeters, modeForSummary, route]);

  const snapHeights = React.useMemo(() => {
    const vh = viewportHeight || 0;
    const min = Math.round(vh * 0.25);
    const mid = Math.round(vh * 0.5);
    const max = Math.round(vh * 1.0);
    return { min, mid, max };
  }, [viewportHeight]);

  const sheetTargetPx = sheet === "collapsed" ? snapHeights.min : sheet === "full" ? snapHeights.max : snapHeights.mid;
  const sheetHeightPx = dragHeightPx != null ? dragHeightPx : sheetTargetPx;
  const sheetHeight = sheetHeightPx ? `${sheetHeightPx}px` : sheet === "collapsed" ? "25vh" : sheet === "full" ? "100vh" : "50vh";

  const plazasSummary = React.useMemo(() => {
    if (plazasTotal == null) return "—";
    const parts: string[] = [];
    parts.push(`${plazasTotal} total`);
    if (plazasByModalidad.remunerado || plazasByModalidad.equivalente) {
      parts.push(`${plazasByModalidad.remunerado} remuneradas`);
      parts.push(`${plazasByModalidad.equivalente} equivalentes`);
    }
    return parts.join(" · ");
  }, [plazasByModalidad.equivalente, plazasByModalidad.remunerado, plazasTotal]);

  return (
    <div
      className={cn(
        "fixed inset-0 z-[3000]",
        open ? "pointer-events-auto" : "pointer-events-none",
      )}
      aria-hidden={!open}
    >
      <div
        className={cn(
          "absolute inset-0 bg-black/20 transition-opacity",
          open ? "opacity-100" : "opacity-0",
        )}
        onClick={onClose}
      />

      <div
        className={cn(
          "absolute bottom-0 left-0 right-0 p-3 transition-transform duration-300 ease-out sm:bottom-auto sm:left-auto sm:right-0 sm:top-0 sm:h-full sm:w-full sm:max-w-[480px] sm:p-4",
          open ? "translate-y-0 sm:translate-x-0" : "translate-y-full sm:translate-x-full",
        )}
      >
        <Card
          className={cn(
            "flex h-[var(--sheet-h)] max-h-[var(--sheet-h)] flex-col overflow-hidden bg-white sm:h-full sm:max-h-none sm:transition-none",
            draggingSheet ? "transition-none" : "transition-[height,max-height] duration-300 ease-out",
            open ? "serums-panel-anim-right sm:serums-panel-anim-right" : "",
          )}
          style={{ ["--sheet-h" as never]: sheetHeight } as React.CSSProperties}
        >
          <div className="sm:hidden">
            <button
              type="button"
              className="flex w-full touch-none items-center justify-center py-2"
              onPointerDown={(e) => {
                draggedRef.current = false;
                dragStartRef.current = { startY: e.clientY, startHeight: sheetHeightPx };
                setDraggingSheet(true);
                setDragHeightPx(sheetHeightPx);
                try {
                  (e.currentTarget as HTMLButtonElement).setPointerCapture(e.pointerId);
                } catch {
                }
              }}
              onPointerMove={(e) => {
                if (!dragStartRef.current) return;
                const { startY, startHeight } = dragStartRef.current;
                const dy = startY - e.clientY;
                if (Math.abs(dy) > 4) draggedRef.current = true;
                const next = startHeight + dy;
                const clamped = Math.max(snapHeights.min, Math.min(snapHeights.max, next));
                setDragHeightPx(clamped);
              }}
              onPointerUp={() => {
                const h = dragHeightPx != null ? dragHeightPx : sheetHeightPx;
                const opts = [
                  { key: "collapsed" as const, px: snapHeights.min },
                  { key: "medium" as const, px: snapHeights.mid },
                  { key: "full" as const, px: snapHeights.max },
                ];
                opts.sort((a, b) => Math.abs(a.px - h) - Math.abs(b.px - h));
                setSheet(opts[0].key);
                setDraggingSheet(false);
                setDragHeightPx(null);
                dragStartRef.current = null;
              }}
              onPointerCancel={() => {
                setDraggingSheet(false);
                setDragHeightPx(null);
                dragStartRef.current = null;
              }}
              onClick={() => {
                if (draggedRef.current) return;
                setSheet((v) => (v === "collapsed" ? "medium" : v === "medium" ? "full" : "collapsed"));
              }}
              aria-label="Cambiar tamaño del panel"
            >
              <div className="h-1.5 w-14 rounded-full bg-black/15" />
            </button>
          </div>

          <div className="border-b border-[var(--border)] bg-white px-5 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="line-clamp-2 text-base font-semibold text-[var(--title)]">
                  {fullName || "Selecciona un establecimiento"}
                </div>
                <div className="mt-0.5 line-clamp-1 text-xs font-medium text-[var(--label)]">
                  {hospital ? fullLocation : "Haz clic en un marcador del mapa."}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <div className="rounded-full bg-black/[0.03] px-3 py-1.5 text-xs font-semibold text-[var(--title)]">
                    {summaryMetric.primary} · {summaryMetric.secondary}
                  </div>
                  <div className="rounded-full bg-black/[0.03] px-3 py-1.5 text-xs font-medium text-[var(--label)]">
                    {summaryMetric.label}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className={cn(
                    "inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-white text-[var(--title)] shadow-[var(--shadow-soft)] hover:bg-black/[0.03]",
                    !hospital ? "opacity-50" : "",
                  )}
                  aria-label={isHospitalFavorited ? "Quitar de favoritos" : "Guardar en favoritos"}
                  title={favoritesEnabled ? (isHospitalFavorited ? "Quitar de favoritos" : "Guardar en favoritos") : "Inicia sesión para guardar favoritos"}
                  disabled={!hospital}
                  onClick={() => {
                    if (!hospital) return;
                    if (onToggleFavoriteHospital) onToggleFavoriteHospital();
                    else onRequestAuthForFavorites?.();
                  }}
                >
                  <HeartIcon filled={favoritesEnabled && isHospitalFavorited} />
                </button>
                <button
                  type="button"
                  className={cn(
                    "inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-white text-[var(--title)] shadow-[var(--shadow-soft)] hover:bg-black/[0.03]",
                    !hospital || !mapsUrlForHospital(hospital) ? "opacity-50" : "",
                  )}
                  aria-label="Abrir en Google Maps"
                  title="Abrir en Google Maps"
                  disabled={!hospital || !mapsUrlForHospital(hospital)}
                  onClick={() => {
                    const url = mapsUrlForHospital(hospital);
                    if (!url) return;
                    window.open(url, "_blank", "noopener,noreferrer");
                  }}
                >
                  <MapIcon />
                </button>
                <div className="relative" ref={shareMenuRef}>
                  <button
                    type="button"
                    className={cn(
                      "inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-white text-[var(--title)] shadow-[var(--shadow-soft)] hover:bg-black/[0.03]",
                      !hospital || !shareUrl ? "opacity-50" : "",
                    )}
                    aria-label="Compartir"
                    title="Compartir"
                    disabled={!hospital || !shareUrl}
                    onClick={() => setShareOpen((v) => !v)}
                  >
                    <ShareIcon />
                  </button>

                  {shareOpen ? (
                    <div className="absolute right-0 top-[calc(100%+10px)] z-[3600] w-[280px] overflow-hidden rounded-[var(--radius-panel)] border border-[var(--border)] bg-white shadow-[var(--shadow-soft)]">
                      <div className="px-4 py-3">
                        <div className="text-sm font-semibold text-[var(--title)]">Compartir plaza</div>
                      </div>
                      <div className="border-t border-[var(--border)] p-2">
                        <div className="grid gap-2">
                          <button
                            type="button"
                            className="flex w-full items-center justify-between gap-3 rounded-[var(--radius-card)] bg-black/[0.02] px-3 py-3 text-left hover:bg-black/[0.04]"
                            onClick={async () => {
                              if (!shareUrl) return;
                              try {
                                await navigator.clipboard.writeText(shareUrl);
                                setShareToast("Enlace copiado.");
                              } catch {
                                setShareToast("No se pudo copiar el enlace.");
                              }
                              setShareOpen(false);
                              window.setTimeout(() => setShareToast(null), 1600);
                            }}
                          >
                            <div className="flex items-center gap-3">
                              <CopyIcon />
                              <div className="text-sm font-semibold text-[var(--title)]">Copiar enlace</div>
                            </div>
                          </button>

                          <button
                            type="button"
                            className="flex w-full items-center justify-between gap-3 rounded-[var(--radius-card)] bg-black/[0.02] px-3 py-3 text-left hover:bg-black/[0.04]"
                            onClick={() => {
                              if (!shareUrl) return;
                              const text = `Plaza SERUMS: ${fullName || "Establecimiento"} — ${fullLocation || "Ubicación"} ${shareUrl}`;
                              window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
                              setShareOpen(false);
                            }}
                          >
                            <div className="flex items-center gap-3">
                              <WhatsappIcon />
                              <div className="text-sm font-semibold text-[var(--title)]">WhatsApp</div>
                            </div>
                          </button>

                          <button
                            type="button"
                            className="flex w-full items-center justify-between gap-3 rounded-[var(--radius-card)] bg-black/[0.02] px-3 py-3 text-left hover:bg-black/[0.04]"
                            onClick={() => {
                              if (!shareUrl) return;
                              window.open(
                                `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
                                "_blank",
                                "noopener,noreferrer",
                              );
                              setShareOpen(false);
                            }}
                          >
                            <div className="flex items-center gap-3">
                              <FacebookIcon />
                              <div className="text-sm font-semibold text-[var(--title)]">Facebook</div>
                            </div>
                          </button>

                          <button
                            type="button"
                            className="flex w-full items-center justify-between gap-3 rounded-[var(--radius-card)] bg-black/[0.02] px-3 py-3 text-left hover:bg-black/[0.04]"
                            onClick={() => {
                              if (!shareUrl) return;
                              const text = `Plaza SERUMS: ${fullName || "Establecimiento"} — ${fullLocation || "Ubicación"}`;
                              window.open(
                                `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`,
                                "_blank",
                                "noopener,noreferrer",
                              );
                              setShareOpen(false);
                            }}
                          >
                            <div className="flex items-center gap-3">
                              <TwitterIcon />
                              <div className="text-sm font-semibold text-[var(--title)]">Twitter/X</div>
                            </div>
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
                <button
                  type="button"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-white text-[var(--title)] shadow-[var(--shadow-soft)] hover:bg-black/[0.03]"
                  onClick={onClose}
                  aria-label="Cerrar"
                  title="Cerrar"
                >
                  <CloseIcon />
                </button>
              </div>
            </div>

            {shareToast ? (
              <div className="mt-2 text-xs font-medium text-[var(--label)]">{shareToast}</div>
            ) : null}

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                className={cn(
                  "h-9 rounded-full border text-sm font-medium shadow-[0_1px_0_rgba(0,0,0,0.04)] transition-colors",
                  tab === "info"
                    ? "border-black/10 bg-black/[0.04] text-[var(--title)]"
                    : "border-[var(--border)] bg-white text-[var(--label)] hover:bg-black/[0.03]",
                )}
                onClick={() => setTab("info")}
              >
                Información
              </button>
              <button
                type="button"
                className={cn(
                  "h-9 rounded-full border text-sm font-medium shadow-[0_1px_0_rgba(0,0,0,0.04)] transition-colors",
                  tab === "como-llegar"
                    ? "border-black/10 bg-black/[0.04] text-[var(--title)]"
                    : "border-[var(--border)] bg-white text-[var(--label)] hover:bg-black/[0.03]",
                )}
                onClick={() => setTab("como-llegar")}
              >
                Cómo llegar
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex h-full items-center justify-center px-8 text-center text-sm text-[var(--label)]">
              Cargando detalle…
            </div>
          ) : error ? (
            <div className="flex h-full items-center justify-center px-8 text-center text-sm text-[var(--title)]">
              {error}
            </div>
          ) : hospital ? (
            <div className="flex h-full min-h-0 flex-col">
              <div className="flex-1 min-h-0 overflow-auto px-5 py-4">
                {tab === "info" ? (
                  <div className="grid gap-3">
                    {imageUrl && imageOk ? (
                      <div className="overflow-hidden rounded-[var(--radius-panel)] border border-[var(--border)] bg-white shadow-[var(--shadow-soft)]">
                        <div className="relative aspect-[16/9]">
                          <Image
                            src={imageUrl}
                            alt={hospital.nombre_establecimiento || "Imagen del establecimiento"}
                            fill
                            sizes="480px"
                            className="object-cover"
                            unoptimized
                            onError={() => setImageOk(false)}
                          />
                        </div>
                      </div>
                    ) : null}

                    <div className="rounded-[var(--radius-panel)] border border-[var(--border)] bg-white px-4 py-4 shadow-[var(--shadow-soft)]">
                      <div className="grid gap-3">
                        <InfoRow label="Ubicación" value={fullLocation || "—"} />
                        <InfoRow label="Profesión requerida" value={profesion} />
                        <InfoRow label="Institución" value={hospital.institucion || "—"} />
                        <InfoRow label="GD" value={hospital.grado_dificultad || "—"} />
                        <InfoRow label="ZAF" value={hospital.zaf === "SI" ? "Sí" : "No"} />
                        <InfoRow label="ZE" value={hospital.ze === "SI" ? "Sí" : "No"} />
                        <InfoRow label="Plazas SERUMS disponibles" value={plazasSummary} />
                      </div>
                    </div>

                    <div className="rounded-[var(--radius-panel)] border border-[var(--border)] bg-white px-4 py-4 shadow-[var(--shadow-soft)]">
                      <div className="text-sm font-semibold text-[var(--title)]">Notas (privado)</div>
                      <div className="mt-2">
                        <textarea
                          value={comment}
                          onChange={(e) => onChangeComment?.(e.target.value)}
                          placeholder={commentEnabled ? "Escribe tu nota..." : "Inicia sesión para guardar notas."}
                          disabled={!commentEnabled || commentLoading}
                          className="min-h-[110px] w-full resize-none rounded-[var(--radius-card)] border border-[var(--border)] bg-white px-3 py-3 text-sm font-medium text-[var(--title)] shadow-[0_1px_0_rgba(0,0,0,0.04)] outline-none placeholder:text-[var(--label)] focus:border-black/10 focus:ring-2 focus:ring-black/5 disabled:opacity-60"
                        />
                      </div>
                      <div className="mt-2 grid gap-2">
                        {commentError ? (
                          <div className="rounded-[var(--radius-card)] bg-black/[0.02] px-3 py-2 text-xs font-semibold text-[var(--title)]">
                            {commentError}
                          </div>
                        ) : null}
                        <Button
                          variant="secondary"
                          className="w-full"
                          onClick={() => onSaveComment?.()}
                          disabled={!commentEnabled || commentLoading || commentSaving || !onSaveComment}
                        >
                          {commentSaving ? "Guardando…" : "Guardar nota"}
                        </Button>
                      </div>
                    </div>

                    <div className="rounded-[var(--radius-panel)] border border-[var(--border)] bg-white px-4 py-4 shadow-[var(--shadow-soft)]">
                      <button
                        type="button"
                        className="flex w-full items-center justify-between gap-3"
                        onClick={() => setMoreOpen((v) => !v)}
                        aria-expanded={moreOpen}
                      >
                        <div className="text-sm font-semibold text-[var(--title)]">Ver más</div>
                        <div className="text-xs font-medium text-[var(--label)]">{moreOpen ? "Ocultar" : "Mostrar"}</div>
                      </button>

                      <div
                        className="overflow-hidden transition-[max-height,opacity] duration-300 ease-out"
                        style={{ maxHeight: moreOpen ? 520 : 0, opacity: moreOpen ? 1 : 0 }}
                      >
                        <div className="mt-3 grid gap-3">
                          <div className="flex flex-wrap gap-2">
                            {hospital.zaf === "SI" ? <Chip>ZAF</Chip> : null}
                            {hospital.ze === "SI" ? <Chip>ZE</Chip> : null}
                          </div>
                          {hospital.presupuesto ? <InfoRow label="Presupuesto" value={hospital.presupuesto} /> : null}

                          {hospital.serums_resumen && hospital.serums_resumen.length > 0 ? (
                            <div className="rounded-[var(--radius-card)] bg-black/[0.02] px-3 py-3">
                              <div className="text-xs font-semibold text-[var(--title)]">Plazas por periodo</div>
                              <div className="mt-2 grid gap-1">
                                {hospital.serums_resumen.map((r) => (
                                  <div
                                    key={`${r.periodo}-${r.modalidad}`}
                                    className="flex items-center justify-between gap-3 rounded-xl px-2 py-2 hover:bg-black/[0.03]"
                                  >
                                    <div className="text-xs font-medium text-[var(--label)]">
                                      {r.periodo} · {r.modalidad.charAt(0).toUpperCase() + r.modalidad.slice(1)}
                                    </div>
                                    <div className="text-sm font-semibold text-[var(--title)]">{r.plazas_total}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null}

                          <button
                            type="button"
                            className="w-fit rounded-full bg-black/[0.03] px-3 py-2 text-xs font-medium text-[var(--title)] hover:bg-black/[0.06]"
                            onClick={() => setTechnicalOpen((v) => !v)}
                            aria-expanded={technicalOpen}
                          >
                            Datos técnicos
                          </button>
                          <div
                            className="overflow-hidden rounded-[var(--radius-card)] bg-black/[0.02] transition-[max-height,opacity] duration-300 ease-out"
                            style={{ maxHeight: technicalOpen ? 220 : 0, opacity: technicalOpen ? 1 : 0 }}
                          >
                            <div className="grid gap-3 px-4 py-3">
                              <InfoRow label="Código RENIPRESS modular" value={hospital.codigo_renipress_modular || "—"} />
                              <InfoRow label="Coordenadas" value={`${hospital.lat.toFixed(6)}, ${hospital.lng.toFixed(6)}`} />
                              {canCorrectLocation ? (
                                <Button
                                  variant="secondary"
                                  className="w-full"
                                  onClick={onRequestGeocode}
                                  disabled={!onRequestGeocode || geocodeLoading}
                                >
                                  {geocodeLoading ? "Corrigiendo ubicación…" : geocodeError ? "Reintentar corrección" : "Corregir ubicación"}
                                </Button>
                              ) : favoritesEnabled && authRole === "user" ? (
                                <div className="text-xs font-medium text-[var(--label)]">Solo Admin puede corregir ubicación.</div>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[var(--radius-panel)] border border-[var(--border)] bg-white px-4 py-4 shadow-[var(--shadow-soft)]">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-[var(--title)]">Qué hay cerca</div>
                          <div className="text-xs font-medium text-[var(--label)]">Explora servicios en el área.</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={onRequestNearby}
                            disabled={!onRequestNearby || nearbyLoading}
                          >
                            {nearbyLoading ? "Buscando…" : nearby ? "Actualizar" : "Buscar"}
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              if (onClearNearby) onClearNearby();
                            }}
                            disabled={!onClearNearby || !nearby}
                          >
                            Ocultar
                          </Button>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {[
                          { key: "Hospedaje", label: "Hospedaje", enabled: nearby ? nearby.hospedajes.length > 0 : false },
                          { key: "Restaurante/Chifa", label: "Restaurante", enabled: nearby ? nearby.restaurantes.length > 0 : false },
                          { key: "Supermercado", label: "Supermercado", enabled: nearby ? nearby.supermercados.length > 0 : false },
                          { key: "Farmacia", label: "Farmacia", enabled: nearby ? nearby.farmacias.length > 0 : false },
                          { key: "Tambo/Bodega", label: "Bodega", enabled: nearby ? nearby.tiendas.length > 0 : false },
                          { key: "Banco/Cajero", label: "Banco/Cajero", enabled: nearby ? nearby.bancos.length > 0 : false },
                          { key: "Comisaría", label: "Comisaría", enabled: nearby ? nearby.comisarias.length > 0 : false },
                          { key: "Gimnasio", label: "Gimnasio", enabled: nearby ? nearby.gimnasios.length > 0 : false },
                          { key: "Iglesia", label: "Iglesia", enabled: nearby ? nearby.iglesias.length > 0 : false },
                        ].map((c) => {
                          const active = nearbyFilters.types.includes(c.key);
                          return (
                            <button
                              key={c.key}
                              type="button"
                              disabled={!c.enabled}
                              className={cn(
                                "rounded-full px-3 py-2 text-xs font-medium",
                                c.enabled ? "bg-black/[0.03] hover:bg-black/[0.06]" : "bg-black/[0.02] opacity-60",
                                active ? "ring-2 ring-black/10" : "",
                              )}
                              onClick={() => {
                                if (!onChangeNearbyFilters || !c.enabled) return;
                                const set = new Set(nearbyFilters.types);
                                if (set.has(c.key)) set.delete(c.key);
                                else set.add(c.key);
                                onChangeNearbyFilters({ types: Array.from(set), radiusKm: nearbyFilters.radiusKm });
                              }}
                            >
                              {c.label}
                            </button>
                          );
                        })}
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {[1, 2, 5].map((km) => {
                          const active = nearbyFilters.radiusKm === km;
                          return (
                            <button
                              key={km}
                              type="button"
                              className={cn(
                                "rounded-full px-3 py-2 text-xs font-medium",
                                "bg-black/[0.03] hover:bg-black/[0.06]",
                                active ? "ring-2 ring-black/10" : "",
                              )}
                              onClick={() => {
                                if (!onChangeNearbyFilters) return;
                                onChangeNearbyFilters({ types: nearbyFilters.types, radiusKm: km });
                              }}
                            >
                              {km} km
                            </button>
                          );
                        })}
                      </div>

                      {filteredNearby && filteredNearby.length > 0 ? (
                        <div className="mt-3 grid gap-2">
                          {filteredNearby.map(({ p, group, index }) => (
                            <div
                              key={p.id}
                              className="group flex items-start gap-3 rounded-[var(--radius-card)] bg-black/[0.02] px-3 py-3 hover:bg-black/[0.04]"
                              onMouseEnter={() => onHoverNearby && onHoverNearby(p.id)}
                              onMouseLeave={() => onHoverNearby && onHoverNearby(null)}
                              onClick={() => onClickNearby && onClickNearby(p.id)}
                            >
                              <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white text-xs font-semibold text-[var(--title)] shadow-[0_1px_0_rgba(0,0,0,0.04)]">
                                {index}
                              </div>
                              <div className="min-w-0">
                                <div className="line-clamp-1 text-sm font-semibold text-[var(--title)]">{p.name || "Lugar"}</div>
                                <div className="line-clamp-1 text-xs font-medium text-[var(--label)]">{group}</div>
                              </div>
                              <div className="ml-auto flex items-center gap-2">
                                <button
                                  type="button"
                                  className={cn(
                                    "inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border)] bg-white text-[var(--title)] shadow-[0_1px_0_rgba(0,0,0,0.04)] hover:bg-black/[0.03]",
                                  )}
                                  aria-label={isPlaceFavorited && isPlaceFavorited(p.id) ? "Quitar de favoritos" : "Guardar en favoritos"}
                                  title={
                                    favoritesEnabled
                                      ? isPlaceFavorited && isPlaceFavorited(p.id)
                                        ? "Quitar de favoritos"
                                        : "Guardar en favoritos"
                                      : "Inicia sesión para guardar favoritos"
                                  }
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (!onToggleFavoritePlace) return;
                                    onToggleFavoritePlace(p, group);
                                  }}
                                >
                                  <HeartIcon filled={!!(favoritesEnabled && isPlaceFavorited && isPlaceFavorited(p.id))} />
                                </button>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setConfirmPlace(p);
                                  }}
                                >
                                  Abrir
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : nearby ? (
                        <div className="mt-3 text-xs font-medium text-[var(--label)]">No hay establecimientos en un radio de {nearbyFilters.radiusKm} km para los tipos seleccionados.</div>
                      ) : (
                        <div className="mt-3 text-xs font-medium text-[var(--label)]">Selecciona Buscar para ver resultados.</div>
                      )}

                      {confirmPlace ? (
                        <div className="mt-3 rounded-[var(--radius-card)] border border-[var(--border)] bg-white p-3 shadow-[var(--shadow-soft)]">
                          <div className="text-sm font-semibold text-[var(--title)]">
                            ¿Quieres abrir {confirmPlace.name || "el lugar"} en Google Maps?
                          </div>
                          <div className="mt-2 flex gap-2">
                            <Button
                              variant="primary"
                              onClick={() => {
                                window.open(mapsUrlForPlace(confirmPlace), "_blank", "noopener,noreferrer");
                                setConfirmPlace(null);
                              }}
                            >
                              Abrir
                            </Button>
                            <Button variant="secondary" onClick={() => setConfirmPlace(null)}>
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      ) : null}
                    </div>

                    {(nearbyError || geocodeError || geocodeMessage) && (
                      <div className="rounded-[var(--radius-panel)] border border-[var(--border)] bg-white px-4 py-3 text-sm font-medium text-[var(--title)] shadow-[var(--shadow-soft)]">
                        {nearbyError || geocodeError || geocodeMessage}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid gap-3">
                    <div className="rounded-[var(--radius-panel)] border border-[var(--border)] bg-white px-4 py-4 shadow-[var(--shadow-soft)]">
                      <div className="text-sm font-semibold text-[var(--title)]">Origen</div>
                      <div className="mt-1 text-xs font-medium text-[var(--label)]">
                        {routeOrigin.type === "user" ? "Mi ubicación actual" : routeOrigin.label}
                      </div>
                      <div className="mt-3 grid gap-2">
                        <button
                          type="button"
                          className={cn(
                            "h-10 rounded-full border text-sm font-medium transition-colors",
                            routeOrigin.type === "user"
                              ? "border-black/10 bg-black/[0.04] text-[var(--title)]"
                              : "border-[var(--border)] bg-white text-[var(--label)] hover:bg-black/[0.03]",
                          )}
                          onClick={() => onChangeRouteOrigin({ type: "user" })}
                        >
                          Mi ubicación
                        </button>

                        <div className="relative">
                          <input
                            value={originQuery}
                            onChange={(e) => setOriginQuery(e.target.value)}
                            placeholder="Buscar origen (terrapuerto, ciudad...)"
                            className="h-10 w-full rounded-2xl border border-[var(--border)] bg-white px-4 text-sm font-medium text-[var(--title)] shadow-[0_1px_0_rgba(0,0,0,0.04)] outline-none ring-0 placeholder:text-[var(--label)] focus:border-black/10 focus:ring-2 focus:ring-black/5"
                          />

                          {originLoading || originError || originResults.length > 0 ? (
                            <div className="absolute left-0 right-0 top-[calc(100%+10px)] z-[3600] overflow-hidden rounded-[var(--radius-panel)] border border-[var(--border)] bg-white shadow-[var(--shadow-soft)]">
                              {originLoading ? (
                                <div className="px-4 py-3 text-sm font-medium text-[var(--label)]">Buscando…</div>
                              ) : originError ? (
                                <div className="px-4 py-3 text-sm font-medium text-[var(--title)]">{originError}</div>
                              ) : (
                                <div className="max-h-[240px] overflow-auto">
                                  {originResults.slice(0, 8).map((r) => (
                                    <button
                                      key={r.place_id}
                                      type="button"
                                      className="w-full px-4 py-3 text-left text-sm font-medium text-[var(--title)] hover:bg-black/[0.03]"
                                      onMouseDown={(e) => e.preventDefault()}
                                      onClick={() => {
                                        const lat = Number(r.lat);
                                        const lng = Number(r.lon);
                                        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
                                        onChangeRouteOrigin({
                                          type: "custom",
                                          label: r.display_name,
                                          lat,
                                          lng,
                                        });
                                        setOriginQuery(r.display_name);
                                        setOriginResults([]);
                                      }}
                                    >
                                      <div className="line-clamp-2">{r.display_name}</div>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : null}
                        </div>
                      </div>
                      <div className="mt-3 text-xs font-medium text-[var(--label)]">
                        Tiempo estimado sin considerar tráfico ni paradas.
                      </div>
                    </div>

                    {route ? (
                      <div className="rounded-[var(--radius-panel)] border border-[var(--border)] bg-white px-4 py-4 shadow-[var(--shadow-soft)]">
                        <div className="text-sm font-semibold text-[var(--title)]">Ruta</div>
                        {route.aproximada ? (
                          <div className="mt-2 rounded-[var(--radius-card)] bg-black/[0.02] px-3 py-3 text-xs font-semibold text-[var(--title)]">
                            {route.warning || "Ruta aproximada."}
                          </div>
                        ) : null}
                        <div className="mt-2 rounded-[var(--radius-card)] bg-black/[0.02] px-3 py-3">
                          <div className="text-sm font-semibold text-[var(--title)]">
                            {formatDistance(route.distancia)} · {formatDuration(route.duracion)}
                          </div>
                          <div className="mt-1 text-xs font-medium text-[var(--label)]">{formatDuration(route.duracion)} en carro (sin tráfico)</div>
                        </div>
                        {route.duracion > 4 * 60 * 60 ? (
                          <div className="mt-2 rounded-[var(--radius-card)] bg-black/[0.02] px-3 py-3 text-sm font-semibold text-[var(--title)]">
                            {route.duracion > 12 * 60 * 60
                              ? "Viaje de +12h. Considera hacer paradas de descanso."
                              : "Viaje de +4h. Considera hacer paradas de descanso."}
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    <div className="grid gap-2">
                      <Button
                        variant="primary"
                        className="w-full"
                        onClick={onRequestRoute}
                        disabled={!onRequestRoute || routeLoading}
                      >
                        {routeLoading ? "Calculando…" : routeError ? "Reintentar" : "Mostrar ruta en el mapa"}
                      </Button>
                      <Button
                        variant="secondary"
                        className="w-full"
                        onClick={() => {
                          const origin =
                            routeOrigin.type === "user"
                              ? null
                              : routeOrigin.type === "custom"
                                ? { lat: routeOrigin.lat, lng: routeOrigin.lng }
                                : { lat: routeOrigin.lat, lng: routeOrigin.lng };
                          const dest = hospital ? { lat: hospital.lat, lng: hospital.lng } : null;
                          const url = directionsUrl(origin, dest);
                          if (!url) return;
                          window.open(url, "_blank", "noopener,noreferrer");
                        }}
                        disabled={!hospital}
                      >
                        Abrir ruta en Google Maps
                      </Button>
                      {routeError ? (
                        <div className="rounded-[var(--radius-panel)] bg-black/[0.02] px-4 py-3 text-sm font-medium text-[var(--title)]">
                          {routeError}
                        </div>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center px-8 text-center text-sm text-[var(--label)]">
              Haz clic en un marcador del mapa para ver la información.
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
