"use client";
import L from "leaflet";
import * as React from "react";
import { Circle, MapContainer, Marker, Polyline, Popup, TileLayer, ZoomControl, useMap } from "react-leaflet";

import { HospitalMapItem, NearbyPlacesResponse, RouteResponse } from "@/features/hospitals/types";
import { Button } from "@/shared/ui/Button";

import "leaflet.markercluster";

export type HospitalMapProps = {
  hospitals: HospitalMapItem[];
  selectedHospitalId: string | null;
  onSelectHospital: (hospital: HospitalMapItem) => void;
  loading?: boolean;
  userLocation: { lat: number; lng: number; accuracy?: number | null } | null;
  route: RouteResponse | null;
  routeLoading?: boolean;
  nearby: NearbyPlacesResponse | null;
  nearbyPlaces?: Array<{ p: { id: string; name: string | null; lat: number; lon: number }; index: number }>;
  hoveredNearbyId?: string | null;
  selectedNearbyId?: string | null;
  focusNearbyId?: string | null;
  nearbyLoading?: boolean;
  focus: { lat: number; lng: number; zoom?: number } | null;
};

function formatAccuracy(meters: number) {
  if (!Number.isFinite(meters)) return "—";
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function normalizeInstitution(value: string) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function institucionGroup(institucion: string) {
  const v = normalizeInstitution(institucion);
  if (v.includes("essalud")) return "essalud";
  if (v.includes("minsa")) return "minsa";

  const isFfaa =
    v.includes("ffaa") ||
    v.includes("ff.aa") ||
    v.includes("fuerza aerea") ||
    v.includes("aerea del peru") ||
    v.includes("marina") ||
    v.includes("policia") ||
    v.includes("ejercito");
  if (isFfaa) return "ffaa";

  return "otros";
}

function institucionGroupColor(institucion: string) {
  const g = institucionGroup(institucion);
  if (g === "essalud") return "#38BDF8";
  if (g === "minsa") return "#FBBF24";
  if (g === "ffaa") return "#22C55E";
  return "#EF4444";
}

function categoriaNumber(categoria: string) {
  const m = /^I-(\d)$/.exec((categoria || "").trim().toUpperCase());
  return m ? m[1] : "";
}

function categoriaScale(categoria: string) {
  const n = categoriaNumber(categoria);
  if (n === "1") return 1.0;
  if (n === "2") return 1.06;
  if (n === "3") return 1.12;
  if (n === "4") return 1.18;
  return 1.0;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
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

function createMedicalPinDivIcon({
  institucion,
  categoria,
  label,
  size,
  selected,
  showLabel,
}: {
  institucion: string;
  categoria: string;
  label: string;
  size: number;
  selected: boolean;
  showLabel: boolean;
}) {
  const fill = institucionGroupColor(institucion);
  const safeLabel = escapeHtml(label || "");

  const height = Math.round(size * 1.35);
  const shadow = selected ? "0 6px 18px rgba(0,0,0,0.18)" : "0 4px 16px rgba(0,0,0,0.14)";
  const stroke = selected ? "rgba(255,255,255,0.98)" : "rgba(255,255,255,0.92)";

  const iconSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${height}" viewBox="0 0 24 32">
      <path
        d="M12 0C6.5 0 2 4.5 2 10c0 7.6 10 22 10 22s10-14.4 10-22C22 4.5 17.5 0 12 0Z"
        fill="${fill}"
        stroke="${stroke}"
        stroke-width="1.5"
        stroke-linejoin="round"
      />
      <path d="M12 6.5v8.5M7.75 10.75h8.5" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" />
    </svg>
  `;

  const html = `
    <div class="serums-marker-bounce" style="display:grid;gap:6px;place-items:center;transform-origin:50% 100%;">
      <div style="position:relative;width:${size}px;height:${height}px;filter:drop-shadow(${shadow});">
        ${iconSvg}
      </div>
      ${
        showLabel
          ? `<div style="
              max-width:160px;
              padding:6px 10px;
              border-radius:9999px;
              background:rgba(255,255,255,0.92);
              border:1px solid rgba(0,0,0,0.08);
              box-shadow:0 2px 12px rgba(0,0,0,0.08);
              font-size:12px;
              font-weight:600;
              color:rgba(29,29,31,0.92);
              white-space:nowrap;
              overflow:hidden;
              text-overflow:ellipsis;
            ">${safeLabel}</div>`
          : ""
      }
    </div>
  `;

  return L.divIcon({
    className: "",
    html,
    iconSize: [size, height],
    iconAnchor: [size / 2, height],
    popupAnchor: [0, -height],
  });
}

function createUserIcon() {
  const size = 14;
  const html = `
    <div style="
      width:${size}px;
      height:${size}px;
      border-radius:9999px;
      background:#0ea5e9;
      box-shadow:0 0 0 6px rgba(14,165,233,0.18), 0 10px 20px rgba(15,23,42,0.18);
      border:2px solid rgba(255,255,255,0.95);
    "></div>
  `;

  return L.divIcon({
    className: "",
    html,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function createPlaceIcon(color: string) {
  const size = 12;
  const html = `
    <div style="
      width:${size}px;
      height:${size}px;
      border-radius:9999px;
      background:${color};
      box-shadow:0 0 0 4px rgba(15,23,42,0.10), 0 10px 18px rgba(15,23,42,0.16);
      border:2px solid rgba(255,255,255,0.95);
    "></div>
  `;

  return L.divIcon({
    className: "",
    html,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function createNumberedPlaceIcon(index: number, highlighted: boolean) {
  const size = highlighted ? 26 : 22;
  const bg = highlighted ? "#0ea5e9" : "#111827";
  const ring = highlighted ? "0 0 0 6px rgba(14,165,233,0.18), 0 10px 18px rgba(15,23,42,0.16)" : "0 0 0 4px rgba(15,23,42,0.10), 0 8px 16px rgba(15,23,42,0.12)";
  const html = `
    <div style="
      width:${size}px;
      height:${size}px;
      border-radius:9999px;
      background:${bg};
      color:#fff;
      display:grid;
      place-items:center;
      font-weight:800;
      font-size:${highlighted ? 13 : 12}px;
      box-shadow:${ring};
      border:2px solid rgba(255,255,255,0.95);
    ">${index}</div>
  `;
  return L.divIcon({
    className: "",
    html,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function FocusController({ focus }: { focus: { lat: number; lng: number; zoom?: number } | null }) {
  const map = useMap();

  React.useEffect(() => {
    if (!focus) return;
    map.setView([focus.lat, focus.lng], focus.zoom ?? map.getZoom(), { animate: true });
  }, [focus, map]);

  return null;
}

function RouteFitController({ routeLatLngs }: { routeLatLngs: Array<[number, number]> | null }) {
  const map = useMap();
  const prevRef = React.useRef<Array<[number, number]> | null>(null);

  React.useEffect(() => {
    if (!routeLatLngs || routeLatLngs.length === 0) {
      prevRef.current = null;
      return;
    }

    if (prevRef.current === routeLatLngs) return;
    prevRef.current = routeLatLngs;

    const bounds = L.latLngBounds(routeLatLngs.map(([lat, lng]) => L.latLng(lat, lng)));
    map.fitBounds(bounds, { padding: [28, 28], maxZoom: 16, animate: true });
  }, [map, routeLatLngs]);

  return null;
}

function ClusteredHospitalsLayer({
  hospitals,
  selectedHospitalId,
  onSelectHospital,
}: {
  hospitals: HospitalMapItem[];
  selectedHospitalId: string | null;
  onSelectHospital: (hospital: HospitalMapItem) => void;
}) {
  const map = useMap();
  const clusterRef = React.useRef<L.MarkerClusterGroup | null>(null);
  const markersByIdRef = React.useRef<Map<string, L.Marker>>(new Map());
  const prevSelectedRef = React.useRef<string | null>(null);
  const onSelectRef = React.useRef(onSelectHospital);
  const [clusterReady, setClusterReady] = React.useState(false);

  React.useEffect(() => {
    onSelectRef.current = onSelectHospital;
  }, [onSelectHospital]);

  const hospitalsById = React.useMemo(() => {
    const m = new Map<string, HospitalMapItem>();
    for (const h of hospitals) m.set(h.id, h);
    return m;
  }, [hospitals]);

  React.useEffect(() => {
    const cluster = L.markerClusterGroup({
      chunkedLoading: true,
      chunkDelay: 30,
      chunkInterval: 100,
      animateAddingMarkers: true,
      animate: true,
      removeOutsideVisibleBounds: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      spiderfyOnMaxZoom: true,
      spiderfyDistanceMultiplier: 1.25,
      disableClusteringAtZoom: 14,
      maxClusterRadius: (zoom) => (zoom >= 12 ? 38 : zoom >= 9 ? 46 : 52),
      iconCreateFunction: (c) => {
        const count = c.getChildCount();
        const size = count < 10 ? 36 : count < 100 ? 40 : 44;
        const html = `<div class="serums-cluster" style="width:${size}px;height:${size}px;background:#F3F4F6;border:1px solid rgba(0,0,0,0.10);color:rgba(17,24,39,0.95);"><div style="font-size:13px;line-height:1">${count}</div></div>`;
        return L.divIcon({
          className: "",
          html,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        });
      },
    });
    const markersById = markersByIdRef.current;
    clusterRef.current = cluster;
    map.addLayer(cluster);
    setClusterReady(true);

    return () => {
      map.removeLayer(cluster);
      cluster.clearLayers();
      clusterRef.current = null;
      markersById.clear();
      setClusterReady(false);
    };
  }, [map]);

  const resolveSize = React.useCallback(() => 36, []);

  const resolveShowLabel = React.useCallback((selected: boolean) => selected, []);

  const updateMarkerIcon = React.useCallback(
    (h: HospitalMapItem, selected: boolean) => {
      const base = resolveSize();
      const size = Math.round(base * categoriaScale(h.categoria));
      const showLabel = resolveShowLabel(selected);
      return createMedicalPinDivIcon({
        institucion: h.institucion,
        categoria: h.categoria,
        label: toTitleCase(h.nombre_establecimiento),
        size,
        selected,
        showLabel,
      });
    },
    [resolveShowLabel, resolveSize],
  );

  const buildPopupHtml = React.useCallback((h: HospitalMapItem) => {
    const profesion = (Array.isArray(h.profesiones) && h.profesiones.length > 0 ? h.profesiones.join(" · ") : h.profesion) || "—";
    const catRaw = String(h.categoria || "").trim();
    const categoria = catRaw && catRaw !== "0" ? catRaw : "";
    const meta = [profesion, categoria].filter((x) => String(x || "").trim() !== "").join(" · ");
    return `
      <div style="display:grid;gap:4px;min-width:180px">
        <div style="font-weight:650;font-size:14px;color:rgba(29,29,31,0.92)">${escapeHtml(toTitleCase(h.nombre_establecimiento) || "—")}</div>
        <div style="font-weight:520;font-size:12px;color:rgba(134,134,139,0.95)">${escapeHtml(meta || "—")}</div>
        <div style="font-weight:520;font-size:12px;color:rgba(134,134,139,0.95)">${escapeHtml(h.departamento || "—")} · ${escapeHtml(h.provincia || "—")} · ${escapeHtml(h.distrito || "—")}</div>
      </div>
    `;
  }, []);

  React.useEffect(() => {
    const cluster = clusterRef.current;
    if (!cluster) return;
    if (!map.hasLayer(cluster)) return;
    if (!clusterReady) return;

    const markersById = markersByIdRef.current;
    const nextIds = new Set(hospitals.map((h) => h.id));

    for (const [id, marker] of markersById) {
      if (nextIds.has(id)) continue;
      cluster.removeLayer(marker);
      marker.off();
      markersById.delete(id);
    }

    const toAdd: L.Marker[] = [];
    for (const h of hospitals) {
      const existing = markersById.get(h.id);
      if (existing) {
        const ll = existing.getLatLng();
        if (ll.lat !== h.lat || ll.lng !== h.lng) existing.setLatLng([h.lat, h.lng]);
        continue;
      }

      const marker = L.marker([h.lat, h.lng], { icon: updateMarkerIcon(h, false) });
      marker.on("click", () => onSelectRef.current(h));
      marker.bindPopup(buildPopupHtml(h));
      markersById.set(h.id, marker);
      toAdd.push(marker);
    }

    if (toAdd.length) cluster.addLayers(toAdd);

    if (selectedHospitalId) {
      const marker = markersById.get(selectedHospitalId);
      const hospital = hospitalsById.get(selectedHospitalId);
      if (marker && hospital) marker.setIcon(updateMarkerIcon(hospital, true));
    }

    if (prevSelectedRef.current && !markersById.has(prevSelectedRef.current)) {
      prevSelectedRef.current = null;
    }
  }, [buildPopupHtml, hospitals, hospitalsById, selectedHospitalId, updateMarkerIcon, map, clusterReady]);

  React.useEffect(() => {
    const prev = prevSelectedRef.current;
    const next = selectedHospitalId;
    if (prev === next) return;

    if (prev) {
      const prevMarker = markersByIdRef.current.get(prev);
      if (prevMarker) {
        const hospital = hospitalsById.get(prev);
        if (hospital) prevMarker.setIcon(updateMarkerIcon(hospital, false));
      }
    }

    if (next) {
      const nextMarker = markersByIdRef.current.get(next);
      if (nextMarker) {
        const hospital = hospitalsById.get(next);
        if (hospital) nextMarker.setIcon(updateMarkerIcon(hospital, true));
      }
    }

    prevSelectedRef.current = next;
  }, [hospitalsById, selectedHospitalId, updateMarkerIcon]);

  return null;
}

const HospitalMapClient = React.memo(function HospitalMapClient({
  hospitals,
  selectedHospitalId,
  onSelectHospital,
  loading = false,
  userLocation,
  route,
  routeLoading = false,
  nearby,
  nearbyPlaces,
  hoveredNearbyId = null,
  selectedNearbyId = null,
  focusNearbyId = null,
  nearbyLoading = false,
  focus,
}: HospitalMapProps) {
  const mapRef = React.useRef<L.Map | null>(null);

  const routeLatLngs = React.useMemo(() => {
    if (route?.aproximada) return null;
    const coords = route?.geometria?.coordinates;
    if (!coords || coords.length === 0) return null;
    return coords.map(([lon, lat]) => [lat, lon] as [number, number]);
  }, [route]);

  const userIcon = React.useMemo(() => createUserIcon(), []);
  const iconHospedajes = React.useMemo(() => createPlaceIcon("#f59e0b"), []);
  const iconRestaurantes = React.useMemo(() => createPlaceIcon("#ef4444"), []);
  const iconFarmacias = React.useMemo(() => createPlaceIcon("#22c55e"), []);
  const iconTiendas = React.useMemo(() => createPlaceIcon("#64748b"), []);
  const iconComisarias = React.useMemo(() => createPlaceIcon("#8b5cf6"), []);

  const loadingLabel = React.useMemo(() => {
    const parts: string[] = [];
    if (loading) parts.push("Cargando establecimientos…");
    if (routeLoading) parts.push("Calculando ruta…");
    if (nearbyLoading) parts.push("Buscando cerca…");
    return parts.length > 0 ? parts.join(" · ") : null;
  }, [loading, nearbyLoading, routeLoading]);

  const accuracyMeters =
    userLocation && typeof userLocation.accuracy === "number" && Number.isFinite(userLocation.accuracy)
      ? Math.max(10, Math.min(20000, userLocation.accuracy))
      : null;

  const placeMarkersRef = React.useRef<Map<string, L.Marker>>(new Map());

  const fitAllHospitals = React.useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const latLngs = hospitals
      .map((h) => ({ lat: Number(h.lat), lng: Number(h.lng) }))
      .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
      .map((p) => L.latLng(p.lat, p.lng));
    if (latLngs.length === 0) return;
    const bounds = L.latLngBounds(latLngs);
    map.fitBounds(bounds, { padding: [28, 28], maxZoom: 12, animate: true });
  }, [hospitals]);

  const InvalidateSizeController = () => {
    const map = useMap();

    React.useEffect(() => {
      const container = map.getContainer();
      let raf = 0;

      const invalidate = () => {
        if (raf) window.cancelAnimationFrame(raf);
        raf = window.requestAnimationFrame(() => map.invalidateSize());
      };

      invalidate();

      const t1 = window.setTimeout(invalidate, 0);
      const t2 = window.setTimeout(invalidate, 300);
      const t3 = window.setTimeout(invalidate, 900);

      let ro: ResizeObserver | null = null;
      if (typeof ResizeObserver !== "undefined") {
        ro = new ResizeObserver(() => invalidate());
        ro.observe(container);
      }

      window.addEventListener("resize", invalidate);
      window.addEventListener("orientationchange", invalidate);

      return () => {
        window.clearTimeout(t1);
        window.clearTimeout(t2);
        window.clearTimeout(t3);
        if (ro) ro.disconnect();
        window.removeEventListener("resize", invalidate);
        window.removeEventListener("orientationchange", invalidate);
        if (raf) window.cancelAnimationFrame(raf);
      };
    }, [map]);

    return null;
  };

  const MapRefController = () => {
    const map = useMap();
    React.useEffect(() => {
      mapRef.current = map;
      return () => {
        mapRef.current = null;
      };
    }, [map]);
    return null;
  };

  const MapEffects = ({ focusNearbyId }: { focusNearbyId: string | null }) => {
    const map = useMap();
    React.useEffect(() => {
      if (!focusNearbyId) return;
      const m = placeMarkersRef.current.get(focusNearbyId);
      if (!m) return;
      const ll = m.getLatLng();
      map.setView(ll, Math.max(map.getZoom(), 16), { animate: true });
      m.openPopup();
    }, [focusNearbyId, map]);
    return null;
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-white">
      {loadingLabel ? (
        <div className="pointer-events-none absolute left-3 top-3 z-[1200] rounded-2xl border border-[var(--border)] bg-white/95 px-3 py-2 text-xs font-extrabold text-slate-700 shadow-sm backdrop-blur">
          {loadingLabel}
        </div>
      ) : null}
      {userLocation && accuracyMeters != null ? (
        <div className="pointer-events-none absolute left-3 top-14 z-[1200] rounded-2xl border border-[var(--border)] bg-white/95 px-3 py-2 text-xs font-extrabold text-slate-700 shadow-sm backdrop-blur">
          Precisión aprox: {formatAccuracy(accuracyMeters)}
        </div>
      ) : null}
      <div className="absolute bottom-4 left-4 z-[1200]">
        <Button
          size="sm"
          variant="secondary"
          className="rounded-full border border-[var(--border)] bg-white/95 px-4 shadow-sm backdrop-blur"
          onClick={fitAllHospitals}
          disabled={loading || hospitals.length === 0}
        >
          Ver todo
        </Button>
      </div>
      <MapContainer
        center={[-9.19, -75.0152]}
        zoom={5}
        className="h-full w-full"
        zoomControl={false}
        scrollWheelZoom
      >
        <ZoomControl position="bottomright" />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="/api/tiles/{z}/{x}/{y}"
          updateWhenZooming={false}
          updateWhenIdle
          keepBuffer={3}
        />

        <MapRefController />
        <InvalidateSizeController />
        <FocusController focus={focus} />
        <RouteFitController routeLatLngs={routeLatLngs} />

        {userLocation ? (
          <>
            <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon} />
            {accuracyMeters != null ? (
              <Circle
                center={[userLocation.lat, userLocation.lng]}
                radius={accuracyMeters}
                pathOptions={{ color: "#0ea5e9", weight: 2, opacity: 0.5, fillColor: "#0ea5e9", fillOpacity: 0.12 }}
              />
            ) : null}
          </>
        ) : null}

        {routeLatLngs ? (
          <Polyline positions={routeLatLngs} pathOptions={{ color: "#0ea5e9", weight: 5, opacity: 0.9 }} interactive={false} />
        ) : null}

        <ClusteredHospitalsLayer
          hospitals={hospitals}
          selectedHospitalId={selectedHospitalId}
          onSelectHospital={onSelectHospital}
        />

        {nearbyPlaces && nearbyPlaces.length > 0
          ? nearbyPlaces.map(({ p, index }) => {
              const highlighted = hoveredNearbyId === p.id || selectedNearbyId === p.id;
              const icon = createNumberedPlaceIcon(index, highlighted);
              return (
                <Marker
                  key={`near-${p.id}`}
                  position={[p.lat, p.lon]}
                  icon={icon}
                  ref={(ref) => {
                    const mapRef = placeMarkersRef.current;
                    if (!ref) {
                      mapRef.delete(p.id);
                      return;
                    }
                    mapRef.set(p.id, ref);
                  }}
                >
                  <Popup>
                    <div className="grid gap-1">
                      <div className="text-sm font-bold">{p.name || "Lugar"}</div>
                    </div>
                  </Popup>
                </Marker>
              );
            })
          : nearby
            ? [
                ...nearby.hospedajes.map((p) => ({ p, icon: iconHospedajes, key: `hosp-${p.id}` })),
                ...nearby.restaurantes.map((p) => ({ p, icon: iconRestaurantes, key: `rest-${p.id}` })),
                ...nearby.farmacias.map((p) => ({ p, icon: iconFarmacias, key: `farm-${p.id}` })),
                ...nearby.tiendas.map((p) => ({ p, icon: iconTiendas, key: `tienda-${p.id}` })),
                ...nearby.comisarias.map((p) => ({ p, icon: iconComisarias, key: `com-${p.id}` })),
              ].map(({ p, icon, key }) => (
                <Marker key={key} position={[p.lat, p.lon]} icon={icon}>
                  <Popup>
                    <div className="grid gap-1">
                      <div className="text-sm font-bold">{p.name || "Lugar"}</div>
                    </div>
                  </Popup>
                </Marker>
              ))
            : null}

        <MapEffects focusNearbyId={focusNearbyId} />
      </MapContainer>
    </div>
  );
});

export { HospitalMapClient };
