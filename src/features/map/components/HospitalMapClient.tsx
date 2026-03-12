"use client";
import L from "leaflet";
import * as React from "react";
import { MapContainer, Marker, Polyline, Popup, TileLayer, ZoomControl, useMap } from "react-leaflet";

import { Hospital, NearbyPlacesResponse, RouteResponse } from "@/features/hospitals/types";

import "leaflet.markercluster";

export type HospitalMapProps = {
  hospitals: Hospital[];
  selectedHospitalId: string | null;
  onSelectHospital: (hospital: Hospital) => void;
  userLocation: { lat: number; lng: number } | null;
  route: RouteResponse | null;
  nearby: NearbyPlacesResponse | null;
  focus: { lat: number; lng: number; zoom?: number } | null;
};

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

function houseSvgDataUrl(fill: string, stroke: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="${fill}" stroke="${stroke}" stroke-width="1.5" stroke-linejoin="round" d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5.5v-6.5h-3V21H5a1 1 0 0 1-1-1v-9.5Z"/></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function createHouseIcon(color: string, selected: boolean) {
  const size = selected ? 28 : 24;
  const iconUrl = houseSvgDataUrl(color, "rgba(255,255,255,0.95)");
  return L.icon({
    iconUrl,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
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

function ClusteredHospitalsLayer({
  hospitals,
  selectedHospitalId,
  onSelectHospital,
}: {
  hospitals: Hospital[];
  selectedHospitalId: string | null;
  onSelectHospital: (hospital: Hospital) => void;
}) {
  const map = useMap();
  const clusterRef = React.useRef<L.MarkerClusterGroup | null>(null);
  const markersByIdRef = React.useRef<Map<string, L.Marker>>(new Map());
  const prevSelectedRef = React.useRef<string | null>(null);
  const onSelectRef = React.useRef(onSelectHospital);

  React.useEffect(() => {
    onSelectRef.current = onSelectHospital;
  }, [onSelectHospital]);

  const hospitalsById = React.useMemo(() => {
    const m = new Map<string, Hospital>();
    for (const h of hospitals) m.set(h.id, h);
    return m;
  }, [hospitals]);

  const iconCache = React.useMemo(() => {
    const cache = new Map<string, L.Icon>();
    return {
      get(categoria: string, selected: boolean) {
        const color = categoriaColor(categoria);
        const key = `${color}-${selected ? "1" : "0"}`;
        const cached = cache.get(key);
        if (cached) return cached;
        const icon = createHouseIcon(color, selected);
        cache.set(key, icon);
        return icon;
      },
    };
  }, []);

  React.useEffect(() => {
    const cluster = L.markerClusterGroup({
      chunkedLoading: true,
      disableClusteringAtZoom: 17,
      removeOutsideVisibleBounds: true,
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: false,
      maxClusterRadius: 52,
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

  const escapeHtml = React.useCallback((value: string) => {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }, []);

  React.useEffect(() => {
    const cluster = clusterRef.current;
    if (!cluster) return;

    cluster.clearLayers();
    markersByIdRef.current.clear();
    prevSelectedRef.current = null;

    for (const h of hospitals) {
      const marker = L.marker([h.lat, h.lng], {
        icon: iconCache.get(h.categoria, false),
      });

      marker.on("click", () => onSelectRef.current(h));

      const popupHtml = `
        <div style="display:grid;gap:4px;min-width:180px">
          <div style="font-weight:800;font-size:14px;color:#0f172a">${escapeHtml(h.nombre_establecimiento || "—")}</div>
          <div style="font-weight:600;font-size:12px;color:#475569">${escapeHtml((Array.isArray(h.profesiones) && h.profesiones.length > 0 ? h.profesiones.join(" · ") : h.profesion) || "—")} · ${escapeHtml(h.categoria || "—")}</div>
          <div style="font-weight:600;font-size:12px;color:#475569">${escapeHtml(h.departamento || "—")} / ${escapeHtml(h.provincia || "—")} / ${escapeHtml(h.distrito || "—")}</div>
        </div>
      `;
      marker.bindPopup(popupHtml);

      markersByIdRef.current.set(h.id, marker);
      cluster.addLayer(marker);
    }
  }, [escapeHtml, hospitals, iconCache]);

  React.useEffect(() => {
    const prev = prevSelectedRef.current;
    const next = selectedHospitalId;
    if (prev === next) return;

    if (prev) {
      const prevMarker = markersByIdRef.current.get(prev);
      if (prevMarker) {
        const hospital = hospitalsById.get(prev);
        if (hospital) prevMarker.setIcon(iconCache.get(hospital.categoria, false));
      }
    }

    if (next) {
      const nextMarker = markersByIdRef.current.get(next);
      if (nextMarker) {
        const hospital = hospitalsById.get(next);
        if (hospital) nextMarker.setIcon(iconCache.get(hospital.categoria, true));
      }
    }

    prevSelectedRef.current = next;
  }, [hospitalsById, iconCache, selectedHospitalId]);

  return null;
}

export function HospitalMapClient({
  hospitals,
  selectedHospitalId,
  onSelectHospital,
  userLocation,
  route,
  nearby,
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

  return (
    <div className="h-full w-full overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
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

        {userLocation ? <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon} /> : null}

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
}
