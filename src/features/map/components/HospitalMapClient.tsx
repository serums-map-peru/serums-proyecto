"use client";
import L from "leaflet";
import * as React from "react";
import { Circle, MapContainer, Marker, Polyline, Popup, TileLayer, ZoomControl, useMap } from "react-leaflet";

import { HospitalMapItem, NearbyPlacesResponse, RouteResponse } from "@/features/hospitals/types";

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
  nearbyLoading?: boolean;
  focus: { lat: number; lng: number; zoom?: number } | null;
};

function formatAccuracy(meters: number) {
  if (!Number.isFinite(meters)) return "—";
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function categoriaColor(categoria: string) {
  switch (categoria) {
    case "I-4":
      return "#8b5cf6";
    case "I-3":
      return "#2A7DE1";
    case "I-2":
      return "#2FBF71";
    case "I-1":
      return "#f59e0b";
    default:
      return "#64748b";
  }
}

function institucionColor(institucion: string) {
  const normalized = (institucion || "").toLowerCase();
  if (normalized.includes("essalud")) return "#38BDF8";
  if (normalized.includes("minsa")) return "#FBBF24";
  if (normalized.includes("militar")) return "#16A34A";
  if (normalized.includes("marina")) return "#1E40AF";
  if (normalized.includes("polic")) return "#4ADE80";
  if (normalized.includes("fap")) return "#94A3B8";
  if (normalized.includes("minedu")) return "#FB923C";
  return "#A78BFA";
}

function gdColor(gd: string) {
  const normalized = (gd || "").toUpperCase();
  if (normalized.includes("GD-1")) return "#22C55E";
  if (normalized.includes("GD-2")) return "#84CC16";
  if (normalized.includes("GD-3")) return "#FBBF24";
  if (normalized.includes("GD-4")) return "#F97316";
  if (normalized.includes("GD-5")) return "#EF4444";
  return "#94A3B8";
}

function categoriaNumber(categoria: string) {
  const m = /^I-(\d)$/.exec((categoria || "").trim().toUpperCase());
  return m ? m[1] : "";
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function createHouseDivIcon({
  institucion,
  categoria,
  gd,
  label,
  size,
  selected,
  showLabel,
}: {
  institucion: string;
  categoria: string;
  gd: string;
  label: string;
  size: number;
  selected: boolean;
  showLabel: boolean;
}) {
  const fill = institucionColor(institucion);
  const dot = gdColor(gd);
  const cat = categoriaNumber(categoria);
  const safeLabel = escapeHtml(label || "");

  const stroke = selected ? "rgba(255,255,255,0.98)" : "rgba(255,255,255,0.92)";
  const shadow = "0 2px 12px rgba(0,0,0,0.08)";

  const iconSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24">
      <path
        fill="${fill}"
        stroke="${stroke}"
        stroke-width="1.5"
        stroke-linejoin="round"
        d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5.5v-6.5h-3V21H5a1 1 0 0 1-1-1v-9.5Z"
      />
    </svg>
  `;

  const html = `
    <div class="serums-marker-bounce" style="display:grid;gap:6px;place-items:center;transform-origin:50% 100%;">
      <div style="position:relative;width:${size}px;height:${size}px;filter:drop-shadow(${shadow});">
        ${iconSvg}
        ${
          cat
            ? `<div style="
                position:absolute;
                right:-6px;
                top:-6px;
                width:18px;
                height:18px;
                border-radius:9999px;
                background:rgba(255,255,255,0.95);
                border:1px solid rgba(0,0,0,0.08);
                display:grid;
                place-items:center;
                font-size:11px;
                font-weight:700;
                color:rgba(29,29,31,0.92);
              ">${cat}</div>`
            : ""
        }
        <div style="
          position:absolute;
          left:-4px;
          bottom:-4px;
          width:10px;
          height:10px;
          border-radius:9999px;
          background:${dot};
          border:2px solid rgba(255,255,255,0.95);
        "></div>
      </div>
      ${
        showLabel
          ? `<div style="
              max-width:160px;
              padding:6px 10px;
              border-radius:9999px;
              background:rgba(255,255,255,0.92);
              border:1px solid rgba(0,0,0,0.08);
              box-shadow:${shadow};
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
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
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
  const zoomRef = React.useRef<number>(map.getZoom());

  React.useEffect(() => {
    onSelectRef.current = onSelectHospital;
  }, [onSelectHospital]);

  const hospitalsById = React.useMemo(() => {
    const m = new Map<string, HospitalMapItem>();
    for (const h of hospitals) m.set(h.id, h);
    return m;
  }, [hospitals]);

  React.useEffect(() => {
    const clusterScaleColor = (count: number) => {
      if (count <= 10) return "#22C55E";
      if (count <= 50) return "#FBBF24";
      if (count <= 200) return "#FB923C";
      return "#EF4444";
    };

    const cluster = L.markerClusterGroup({
      chunkedLoading: true,
      disableClusteringAtZoom: 17,
      removeOutsideVisibleBounds: true,
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: false,
      maxClusterRadius: 52,
      iconCreateFunction: (c) => {
        const count = c.getChildCount();
        const size = count < 10 ? 36 : count < 100 ? 40 : 44;
        const bg = clusterScaleColor(count);
        const html = `<div class="serums-cluster" style="width:${size}px;height:${size}px;background:${bg};"><div style="font-size:13px;line-height:1">${count}</div></div>`;
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

    return () => {
      map.removeLayer(cluster);
      cluster.clearLayers();
      clusterRef.current = null;
      markersById.clear();
    };
  }, [map]);

  const resolveSize = React.useCallback((zoom: number) => {
    if (zoom >= 14) return 32;
    return 28;
  }, []);

  const resolveShowLabel = React.useCallback((zoom: number) => zoom >= 14, []);

  const updateMarkerIcon = React.useCallback(
    (h: HospitalMapItem, selected: boolean) => {
      const zoom = zoomRef.current;
      const size = resolveSize(zoom);
      const showLabel = resolveShowLabel(zoom);
      return createHouseDivIcon({
        institucion: h.institucion,
        categoria: h.categoria,
        gd: h.grado_dificultad,
        label: h.nombre_establecimiento,
        size,
        selected,
        showLabel,
      });
    },
    [resolveShowLabel, resolveSize],
  );

  React.useEffect(() => {
    const cluster = clusterRef.current;
    if (!cluster) return;

    cluster.clearLayers();
    markersByIdRef.current.clear();
    prevSelectedRef.current = null;

    for (const h of hospitals) {
      const marker = L.marker([h.lat, h.lng], {
        icon: updateMarkerIcon(h, false),
      });

      marker.on("click", () => onSelectRef.current(h));

      const popupHtml = `
        <div style="display:grid;gap:4px;min-width:180px">
          <div style="font-weight:650;font-size:14px;color:rgba(29,29,31,0.92)">${escapeHtml(h.nombre_establecimiento || "—")}</div>
          <div style="font-weight:520;font-size:12px;color:rgba(134,134,139,0.95)">${escapeHtml((Array.isArray(h.profesiones) && h.profesiones.length > 0 ? h.profesiones.join(" · ") : h.profesion) || "—")} · ${escapeHtml(h.categoria || "—")} · ${escapeHtml(h.grado_dificultad || "—")}</div>
          <div style="font-weight:520;font-size:12px;color:rgba(134,134,139,0.95)">${escapeHtml(h.departamento || "—")} · ${escapeHtml(h.provincia || "—")} · ${escapeHtml(h.distrito || "—")}</div>
        </div>
      `;
      marker.bindPopup(popupHtml);

      markersByIdRef.current.set(h.id, marker);
      cluster.addLayer(marker);
    }
  }, [hospitals, updateMarkerIcon]);

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

  React.useEffect(() => {
    const cluster = clusterRef.current;
    if (!cluster) return;

    const onZoom = () => {
      zoomRef.current = map.getZoom();
      for (const [id, marker] of markersByIdRef.current) {
        const h = hospitalsById.get(id);
        if (!h) continue;
        const selected = id === selectedHospitalId;
        marker.setIcon(updateMarkerIcon(h, selected));
      }
    };

    map.on("zoomend", onZoom);
    return () => {
      map.off("zoomend", onZoom);
    };
  }, [hospitalsById, map, selectedHospitalId, updateMarkerIcon]);

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
  nearbyLoading = false,
  focus,
}: HospitalMapProps) {
  const routeLatLngs = React.useMemo(() => {
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
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

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
          <Polyline positions={routeLatLngs} pathOptions={{ color: "#0ea5e9", weight: 5, opacity: 0.9 }} />
        ) : null}

        <ClusteredHospitalsLayer
          hospitals={hospitals}
          selectedHospitalId={selectedHospitalId}
          onSelectHospital={onSelectHospital}
        />

        {nearby
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
                    <div className="text-xs text-slate-600">
                      {String(
                        (p.tags as Record<string, unknown>)["amenity"] ||
                          (p.tags as Record<string, unknown>)["tourism"] ||
                          (p.tags as Record<string, unknown>)["shop"] ||
                          "",
                      )}
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))
          : null}
      </MapContainer>
    </div>
  );
});

export { HospitalMapClient };
