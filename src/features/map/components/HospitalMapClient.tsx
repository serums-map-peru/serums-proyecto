"use client";

import * as React from "react";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, ZoomControl } from "react-leaflet";

import { Hospital } from "@/features/hospitals/types";

export type HospitalMapProps = {
  hospitals: Hospital[];
  selectedHospitalId: string | null;
  onSelectHospital: (hospital: Hospital) => void;
};

function sectorColor(sector: Hospital["sector"]) {
  switch (sector) {
    case "MINSA":
      return "#2A7DE1";
    case "ESSALUD":
      return "#2FBF71";
    case "Militar":
      return "#f59e0b";
    case "Privado":
      return "#8b5cf6";
    default:
      return "#64748b";
  }
}

function createSectorIcon(sector: Hospital["sector"], selected: boolean) {
  const color = sectorColor(sector);
  const size = selected ? 18 : 14;
  const ring = selected
    ? "0 0 0 6px rgba(42,125,225,0.18)"
    : "0 0 0 4px rgba(15,23,42,0.10)";
  const html = `
    <div style="
      width:${size}px;
      height:${size}px;
      border-radius:9999px;
      background:${color};
      box-shadow:${ring}, 0 10px 20px rgba(15,23,42,0.20);
      border:2px solid rgba(255,255,255,0.95);
    "></div>
  `;

  return L.divIcon({
    className: "",
    html,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

export function HospitalMapClient({
  hospitals,
  selectedHospitalId,
  onSelectHospital,
}: HospitalMapProps) {
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

        {hospitals.map((h) => {
          const selected = h.id === selectedHospitalId;
          const icon = createSectorIcon(h.sector, selected);
          return (
            <Marker
              key={h.id}
              position={[h.lat, h.lng]}
              icon={icon}
              eventHandlers={{
                click: () => onSelectHospital(h),
              }}
            >
              <Popup>
                <div className="grid gap-1">
                  <div className="text-sm font-bold">{h.name}</div>
                  <div className="text-xs text-slate-600">
                    {h.sector} · {h.establishmentType}
                  </div>
                  <div className="text-xs text-slate-600">
                    {h.region} / {h.province} / {h.district}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
