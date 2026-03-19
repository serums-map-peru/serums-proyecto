"use client";

import * as React from "react";

import { FiltersBar } from "@/features/hospitals/components/FiltersBar";
import { HospitalDetailPanel } from "@/features/hospitals/components/HospitalDetailPanel";
import { useHospitalFiltering } from "@/features/hospitals/hooks/useHospitalFiltering";
import {
  Hospital,
  HospitalMapItem,
  NearbyPlacesResponse,
  NearestAirportResponse,
  NominatimResult,
  RouteResponse,
} from "@/features/hospitals/types";
import { HospitalMap } from "@/features/map/components/HospitalMap";
import { AppHeader } from "@/features/shell/components/AppHeader";
import { getAuthToken } from "@/features/auth/token";
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

function Legend() {
  const items = [
    { label: "I-1", color: "#f59e0b" },
    { label: "I-2", color: "#2FBF71" },
    { label: "I-3", color: "#2A7DE1" },
    { label: "I-4", color: "#8b5cf6" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-600">
      {items.map((i) => (
        <div key={i.label} className="flex items-center gap-2">
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4 drop-shadow"
            aria-hidden="true"
            style={{ color: i.color }}
          >
            <path
              d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5.5v-6.5h-3V21H5a1 1 0 0 1-1-1v-9.5Z"
              fill="currentColor"
              stroke="rgba(255,255,255,0.95)"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
          <span>{i.label}</span>
        </div>
      ))}
    </div>
  );
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
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

  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [selectedHospitalId, setSelectedHospitalId] = React.useState<string | null>(null);
  const [selectedHospital, setSelectedHospital] = React.useState<Hospital | null>(null);
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [detailError, setDetailError] = React.useState<string | null>(null);
  const [detailOpen, setDetailOpen] = React.useState(false);

  const [userLocation, setUserLocation] = React.useState<{ lat: number; lng: number; accuracy?: number | null } | null>(
    null,
  );
  const [travelMode, setTravelMode] = React.useState<"carro" | "pie" | "avion">("carro");
  const [activeTrip, setActiveTrip] = React.useState<{
    hospitalId: string;
    hospitalName: string;
    lat: number;
    lng: number;
    mode: "carro" | "pie" | "avion";
    userLat: number;
    userLng: number;
  } | null>(null);
  const [flightEstimate, setFlightEstimate] = React.useState<{ distancia: number; duracion: number } | null>(null);
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

  const [searchValue, setSearchValue] = React.useState("");
  const [searchLoading, setSearchLoading] = React.useState(false);
  const [searchError, setSearchError] = React.useState<string | null>(null);
  const [searchResults, setSearchResults] = React.useState<NominatimResult[]>([]);
  const [searchNonce, setSearchNonce] = React.useState(0);
  const [focus, setFocus] = React.useState<{ lat: number; lng: number; zoom?: number } | null>(null);

  const [authOpen, setAuthOpen] = React.useState(false);
  const [authMode, setAuthMode] = React.useState<"login" | "register">("login");

  const setAuthQuery = React.useCallback((mode: "login" | "register" | null) => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (!mode) url.searchParams.delete("auth");
    else url.searchParams.set("auth", mode);
    const next = url.searchParams.toString();
    window.history.replaceState({}, "", `${url.pathname}${next ? `?${next}` : ""}${url.hash}`);
  }, []);

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
      const loc = await requestGeolocation();
      setUserLocation(loc);

      if (travelMode === "avion") {
        const distancia = haversineMeters(loc, { lat: selectedHospital.lat, lng: selectedHospital.lng });
        const duracion = Math.max(60, Math.round(distancia / 222.2222222222));
        setRoute(null);
        setFlightEstimate({ distancia, duracion });
        setNearestAirport(null);
        setAirportDriveRoute(null);
        setAirportError(null);
        setActiveTrip({
          hospitalId: selectedHospital.id,
          hospitalName: selectedHospital.nombre_establecimiento,
          lat: selectedHospital.lat,
          lng: selectedHospital.lng,
          mode: "avion",
          userLat: loc.lat,
          userLng: loc.lng,
        });
        if (approxWarning) setRouteError(approxWarning);
        setFocus(null);
        return;
      }

      const perfil = travelMode === "pie" ? "walking" : "driving";
      const qs = new URLSearchParams({
        latUsuario: String(loc.lat),
        lonUsuario: String(loc.lng),
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
      setFlightEstimate(null);
      setNearestAirport(null);
      setAirportDriveRoute(null);
      setAirportError(null);
      setActiveTrip({
        hospitalId: selectedHospital.id,
        hospitalName: selectedHospital.nombre_establecimiento,
        lat: selectedHospital.lat,
        lng: selectedHospital.lng,
        mode: travelMode,
        userLat: loc.lat,
        userLng: loc.lng,
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
  }, [apiBase, requestGeolocation, selectedHospital, travelMode]);

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
    setFlightEstimate(null);
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
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15_000);
      let r;
      try {
        r = await fetch(`${apiBase}/lugares-cercanos/${encodeURIComponent(selectedHospital.id)}`, {
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
  }, [apiBase, selectedHospital]);

  const handleRequestGeocode = React.useCallback(async () => {
    if (!selectedHospital) return;
    const token = getAuthToken();
    if (!token) {
      setGeocodeError("Inicia sesión para corregir la ubicación.");
      return;
    }
    setGeocodeLoading(true);
    setGeocodeError(null);
    setGeocodeMessage(null);
    setFlightEstimate(null);
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
      setFlightEstimate(null);
      setNearestAirport(null);
      setAirportDriveRoute(null);
      setAirportError(null);
      setNearby(null);
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
  }, [apiBase, selectedHospital]);

  const handleSelectHospital = React.useCallback(
    async (h: HospitalMapItem) => {
      setSelectedHospitalId(h.id);
      setSelectedHospital(null);
      setDetailOpen(true);
      setDetailLoading(true);
      setDetailError(null);
      setNearby(null);
      setNearbyError(null);
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
    [fetchHospitalById],
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

  const topHospitals = React.useMemo(() => {
    const base = hospitalsForMap.slice();
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
  }, [hospitalsForMap, userLocation]);

  const directDistanceMeters = React.useMemo(() => {
    if (!selectedHospital || !userLocation) return null;
    if (!Number.isFinite(selectedHospital.lat) || !Number.isFinite(selectedHospital.lng)) return null;
    return haversineMeters(userLocation, { lat: selectedHospital.lat, lng: selectedHospital.lng });
  }, [selectedHospital, userLocation]);

  const activeTripSummary = React.useMemo(() => {
    if (!activeTrip) return null;
    const label = activeTrip.mode === "pie" ? "A pie" : activeTrip.mode === "carro" ? "Carro" : "Avión";
    const metric =
      activeTrip.mode === "avion"
        ? flightEstimate
          ? `${formatDuration(flightEstimate.duracion)} · ${formatDistance(flightEstimate.distancia)}`
          : null
        : route
          ? `${formatDuration(route.duracion)} · ${formatDistance(route.distancia)}`
          : null;
    return { label, metric };
  }, [activeTrip, flightEstimate, route]);

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-50">
      <div className="flex h-full flex-col">
      <AppHeader
        onOpenFilters={() => setSidebarOpen(true)}
        onCenterOnUser={handleCenterOnUser}
        centerOnUserLoading={centerOnUserLoading}
        onOpenAuth={(mode) => {
          setAuthMode(mode);
          setAuthOpen(true);
          setAuthQuery(mode);
        }}
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
          hospitals={hospitalsForMap}
          selectedHospitalId={selectedHospitalId}
          loading={loading}
          userLocation={userLocation}
          route={route}
          routeLoading={routeLoading}
          nearby={nearby}
          nearbyLoading={nearbyLoading}
          focus={focus}
          onSelectHospital={handleSelectHospital}
        />

        <div className="absolute right-3 top-3 z-[1200] hidden sm:block">
          <div className="grid gap-2">
            <div className="rounded-2xl border border-[var(--border)] bg-white/95 px-4 py-3 shadow-sm">
              <div className="text-sm font-extrabold text-slate-900">
                {loading ? "Cargando…" : `${hospitalsForMap.length} establecimientos`}
              </div>
              <div className="mt-1 text-xs font-medium text-slate-500">
                {error
                  ? error
                  : locationError
                    ? locationError
                    : searchError
                      ? searchError
                      : "Selecciona un marcador para ver el detalle."}
              </div>
              <div className="mt-2">
                <Legend />
              </div>
            </div>

            {activeTrip && activeTripSummary ? (
              <div className="rounded-2xl border border-[var(--border)] bg-white/95 px-4 py-3 shadow-sm">
                <div className="text-[11px] font-extrabold text-slate-800">Ruta activa · {activeTripSummary.label}</div>
                <div className="mt-0.5 line-clamp-1 text-xs font-semibold text-slate-600">{activeTrip.hospitalName}</div>
                {activeTripSummary.metric ? (
                  <div className="mt-0.5 text-[11px] font-semibold text-slate-600">{activeTripSummary.metric}</div>
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
              "h-full w-[360px] p-3 transition-transform",
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
              "absolute top-5 z-[2100] rounded-2xl border border-[var(--border)] bg-white px-2 py-2 text-slate-700 shadow-sm hover:bg-slate-50",
              sidebarOpen ? "left-[372px]" : "left-3",
            )}
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label={sidebarOpen ? "Ocultar panel lateral" : "Mostrar panel lateral"}
            title={sidebarOpen ? "Ocultar panel lateral" : "Mostrar panel lateral"}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d={sidebarOpen ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"}
                stroke="currentColor"
                strokeWidth="2"
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
            className={cn("absolute inset-0 bg-slate-900/20 transition-opacity", sidebarOpen ? "opacity-100" : "opacity-0")}
            onClick={() => setSidebarOpen(false)}
          />
          <div
            className={cn(
              "absolute left-0 top-0 h-full w-[92%] max-w-[420px] p-3 transition-transform",
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
        onClose={() => setDetailOpen(false)}
        route={
          activeTrip && selectedHospital && activeTrip.hospitalId === selectedHospital.id && activeTrip.mode !== "avion"
            ? route
            : null
        }
        routeLoading={routeLoading}
        routeError={activeTrip && selectedHospital && activeTrip.hospitalId === selectedHospital.id ? routeError : null}
        flightEstimate={
          activeTrip && selectedHospital && activeTrip.hospitalId === selectedHospital.id && activeTrip.mode === "avion"
            ? flightEstimate
            : null
        }
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
        nearby={nearby}
        nearbyLoading={nearbyLoading}
        nearbyError={nearbyError}
        geocodeLoading={geocodeLoading}
        geocodeError={geocodeError}
        geocodeMessage={geocodeMessage}
        onRequestRoute={selectedHospital ? handleRequestRoute : undefined}
        onRequestNearby={selectedHospital ? handleRequestNearby : undefined}
        onRequestGeocode={selectedHospital ? handleRequestGeocode : undefined}
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
        onAuthChange={() => {}}
      />
    </div>
  );
}
