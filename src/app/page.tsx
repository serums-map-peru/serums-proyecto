"use client";

import * as React from "react";

import { FiltersBar } from "@/features/hospitals/components/FiltersBar";
import { HospitalDetailPanel } from "@/features/hospitals/components/HospitalDetailPanel";
import { useHospitalFiltering } from "@/features/hospitals/hooks/useHospitalFiltering";
import { Hospital, NearbyPlacesResponse, NominatimResult, RouteResponse } from "@/features/hospitals/types";
import { HospitalMap } from "@/features/map/components/HospitalMap";
import { AppHeader } from "@/features/shell/components/AppHeader";
import { cn } from "@/shared/lib/cn";

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

export default function HomePage() {
  const { filters, setFilters, filteredHospitals, options, loading, error, fetchHospitalById } =
    useHospitalFiltering();

  const apiBase = React.useMemo(() => {
    const configured = process.env.NEXT_PUBLIC_API_BASE_URL;
    if (configured && configured.trim().length > 0) return configured.trim().replace(/\/$/, "");
    return "http://localhost:4000/api";
  }, []);

  const [filtersOpenMobile, setFiltersOpenMobile] = React.useState(false);
  const [selectedHospitalId, setSelectedHospitalId] = React.useState<string | null>(null);
  const [selectedHospital, setSelectedHospital] = React.useState<Hospital | null>(null);
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [detailError, setDetailError] = React.useState<string | null>(null);
  const [detailOpen, setDetailOpen] = React.useState(false);

  const [userLocation, setUserLocation] = React.useState<{ lat: number; lng: number } | null>(null);
  const [route, setRoute] = React.useState<RouteResponse | null>(null);
  const [routeLoading, setRouteLoading] = React.useState(false);
  const [routeError, setRouteError] = React.useState<string | null>(null);

  const [nearby, setNearby] = React.useState<NearbyPlacesResponse | null>(null);
  const [nearbyLoading, setNearbyLoading] = React.useState(false);
  const [nearbyError, setNearbyError] = React.useState<string | null>(null);

  const [searchValue, setSearchValue] = React.useState("");
  const [searchLoading, setSearchLoading] = React.useState(false);
  const [searchResults, setSearchResults] = React.useState<NominatimResult[]>([]);
  const [focus, setFocus] = React.useState<{ lat: number; lng: number; zoom?: number } | null>(null);

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
      return;
    }

    const controller = new AbortController();
    setSearchLoading(true);
    const t = setTimeout(() => {
      fetch(`${apiBase}/buscar?q=${encodeURIComponent(query)}`, { signal: controller.signal })
        .then(async (r) => {
          if (!r.ok) {
            const body = await r.json().catch(() => null);
            const message =
              body && typeof body === "object" && body.error && body.error.message
                ? String(body.error.message)
                : "Error al buscar";
            throw new Error(message);
          }
          return r.json() as Promise<NominatimResult[]>;
        })
        .then((data) => {
          setSearchResults(Array.isArray(data) ? data : []);
          setSearchLoading(false);
        })
        .catch((e) => {
          if (e && e.name === "AbortError") return;
          setSearchResults([]);
          setSearchLoading(false);
        });
    }, 320);

    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [apiBase, searchValue]);

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
    return new Promise<{ lat: number; lng: number }>((resolve, reject) => {
      if (!navigator.geolocation) return reject(new Error("Geolocalización no disponible"));
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => reject(err),
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 2000 },
      );
    });
  }, []);

  const handleRequestRoute = React.useCallback(async () => {
    if (!selectedHospital) return;
    setRouteLoading(true);
    setRouteError(null);
    try {
      const loc = await requestGeolocation();
      setUserLocation(loc);
      if (selectedHospital.coordenadas_fuente && selectedHospital.coordenadas_fuente !== "RENIPRESS") {
        setRouteError(
          "Ubicación aproximada: este establecimiento no tiene coordenadas exactas (RENIPRESS). La ruta puede no llegar al punto real.",
        );
      }
      const qs = new URLSearchParams({
        latUsuario: String(loc.lat),
        lonUsuario: String(loc.lng),
        latHospital: String(selectedHospital.lat),
        lonHospital: String(selectedHospital.lng),
      }).toString();
      const r = await fetch(`${apiBase}/ruta?${qs}`);
      if (!r.ok) {
        const body = await r.json().catch(() => null);
        const message =
          body && typeof body === "object" && body.error && body.error.message
            ? String(body.error.message)
            : "Error al calcular ruta";
        throw new Error(message);
      }
      const data = (await r.json()) as RouteResponse;
      setRoute(data);
      setFocus(null);
    } catch (e) {
      setRoute(null);
      setRouteError(e instanceof Error ? e.message : "Error al calcular ruta");
    } finally {
      setRouteLoading(false);
    }
  }, [apiBase, requestGeolocation, selectedHospital]);

  const handleRequestNearby = React.useCallback(async () => {
    if (!selectedHospital) return;
    setNearbyLoading(true);
    setNearbyError(null);
    try {
      const r = await fetch(`${apiBase}/lugares-cercanos/${encodeURIComponent(selectedHospital.id)}`);
      if (!r.ok) {
        const body = await r.json().catch(() => null);
        const message =
          body && typeof body === "object" && body.error && body.error.message
            ? String(body.error.message)
            : "Error al buscar lugares cercanos";
        throw new Error(message);
      }
      const data = (await r.json()) as NearbyPlacesResponse;
      setNearby(data);
    } catch (e) {
      setNearby(null);
      setNearbyError(e instanceof Error ? e.message : "Error al buscar lugares cercanos");
    } finally {
      setNearbyLoading(false);
    }
  }, [apiBase, selectedHospital]);

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader
        onOpenFilters={() => setFiltersOpenMobile(true)}
        searchValue={searchValue}
        searchLoading={searchLoading}
        searchResults={searchResults}
        onSearchChange={setSearchValue}
        onSelectSearchResult={handleSelectSearchResult}
      />

      <main className="mx-auto grid max-w-[1400px] gap-4 px-4 py-4 sm:grid-cols-[360px_1fr]">
        <div className="hidden sm:block">
          <FiltersBar filters={filters} setFilters={setFilters} options={options} />
        </div>

        <div className="flex min-h-[calc(100vh-112px)] flex-col gap-3">
          <div className="flex flex-col items-start justify-between gap-2 rounded-2xl border border-[var(--border)] bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center">
            <div className="grid gap-1">
              <div className="text-sm font-extrabold text-slate-900">
                {loading ? "Cargando…" : `${filteredHospitals.length} establecimientos`}
              </div>
              <div className="text-xs font-medium text-slate-500">
                {error ? error : "Selecciona un marcador para ver el detalle."}
              </div>
            </div>
            <Legend />
          </div>

          <div className="flex-1 min-h-[520px]">
            <HospitalMap
              hospitals={filteredHospitals}
              selectedHospitalId={selectedHospitalId}
              userLocation={userLocation}
              route={route}
              nearby={nearby}
              focus={focus}
              onSelectHospital={async (h) => {
                setSelectedHospitalId(h.id);
                setSelectedHospital(null);
                setDetailOpen(true);
                setDetailLoading(true);
                setDetailError(null);
                setRoute(null);
                setRouteError(null);
                setNearby(null);
                setNearbyError(null);
                setFocus({ lat: h.lat, lng: h.lng, zoom: 16 });
                try {
                  const full = await fetchHospitalById(h.id);
                  setSelectedHospital(full);
                } catch (e) {
                  setDetailError(e instanceof Error ? e.message : "Error al cargar detalle");
                } finally {
                  setDetailLoading(false);
                }
              }}
            />
          </div>
        </div>
      </main>

      <div
        className={cn(
          "fixed inset-0 z-[2500] sm:hidden",
          filtersOpenMobile ? "pointer-events-auto" : "pointer-events-none",
        )}
        aria-hidden={!filtersOpenMobile}
      >
        <div
          className={cn(
            "absolute inset-0 bg-slate-900/20 backdrop-blur-[1px] transition-opacity",
            filtersOpenMobile ? "opacity-100" : "opacity-0",
          )}
          onClick={() => setFiltersOpenMobile(false)}
        />
        <div
          className={cn(
            "absolute left-0 top-0 h-full w-[92%] max-w-[420px] p-3 transition-transform",
            filtersOpenMobile ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <FiltersBar
            filters={filters}
            setFilters={setFilters}
            options={options}
            onCloseMobile={() => setFiltersOpenMobile(false)}
          />
        </div>
      </div>

      <HospitalDetailPanel
        hospital={selectedHospital}
        loading={detailLoading}
        error={detailError}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        routeLoading={routeLoading}
        routeError={routeError}
        nearbyLoading={nearbyLoading}
        nearbyError={nearbyError}
        onRequestRoute={selectedHospital ? handleRequestRoute : undefined}
        onRequestNearby={selectedHospital ? handleRequestNearby : undefined}
      />
    </div>
  );
}
