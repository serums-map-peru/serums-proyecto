"use client";

import * as React from "react";

import { createInitialHospitalFilters } from "@/features/hospitals/hooks/useHospitalFiltering";
import { HospitalFilters, HospitalMapItem } from "@/features/hospitals/types";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { SearchableSelect } from "@/shared/ui/SearchableSelect";

type Options = {
  profesiones: string[];
  instituciones: string[];
  departamentos: string[];
  provincias: string[];
  distritos: string[];
  grados_dificultad: string[];
  categorias: string[];
  zaf: string[];
  ze: string[];
};

export type FiltersBarProps = {
  filters: HospitalFilters;
  setFilters: React.Dispatch<React.SetStateAction<HospitalFilters>>;
  options: Options;
  results: HospitalMapItem[];
  selectedHospitalId: string | null;
  onSelectHospital: (hospital: HospitalMapItem) => void;
  userLocation: { lat: number; lng: number } | null;
  onCloseMobile?: () => void;
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs font-semibold text-slate-500">{children}</div>
  );
}

function SectionChevron({ open }: { open: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      className={open ? "rotate-180" : ""}
      aria-hidden="true"
    >
      <path
        d="M6 9l6 6 6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
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

export function FiltersBar({
  filters,
  setFilters,
  options,
  results,
  selectedHospitalId,
  onSelectHospital,
  userLocation,
  onCloseMobile,
}: FiltersBarProps) {
  const [locationOpen, setLocationOpen] = React.useState(false);
  const [dataOpen, setDataOpen] = React.useState(false);

  return (
    <Card className="h-full w-full overflow-hidden bg-sky-50">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] bg-white px-4 py-3">
        <div className="min-w-0">
          <div className="text-lg font-extrabold text-slate-900">Encuentra tu plaza ideal</div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setFilters(createInitialHospitalFilters());
            }}
          >
            Limpiar
          </Button>
          {onCloseMobile ? (
            <Button size="sm" variant="secondary" onClick={onCloseMobile} aria-label="Cerrar">
              ✕
            </Button>
          ) : null}
        </div>
      </div>

      <div className="h-full overflow-auto p-4">
        <div className="grid gap-4">
          <div className="grid gap-3 rounded-3xl border border-[var(--border)] bg-white px-4 py-3">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3"
              onClick={() => setLocationOpen((v) => !v)}
              aria-expanded={locationOpen}
            >
              <div className="grid gap-0.5 text-left">
                <SectionTitle>Ubicación</SectionTitle>
                <div className="text-xs font-semibold text-slate-700">
                  {filters.departamento || filters.provincia || filters.distrito ? "Filtrando" : "Sin filtros"}
                </div>
              </div>
              <div className="text-slate-600">
                <SectionChevron open={locationOpen} />
              </div>
            </button>
            {locationOpen ? (
              <div className="grid gap-3">
                <SearchableSelect
                  label="Departamento"
                  value={filters.departamento}
                  options={options.departamentos.map((r) => ({ value: r, label: r }))}
                  onChange={(departamento) =>
                    setFilters((p) => ({ ...p, departamento, provincia: null, distrito: null }))
                  }
                  placeholder="Todas"
                  searchPlaceholder="Buscar departamento…"
                />
                <SearchableSelect
                  label="Provincia"
                  value={filters.provincia}
                  options={options.provincias.map((r) => ({ value: r, label: r }))}
                  onChange={(provincia) => setFilters((p) => ({ ...p, provincia, distrito: null }))}
                  placeholder="Todas"
                  searchPlaceholder="Buscar provincia…"
                />
                <SearchableSelect
                  label="Distrito"
                  value={filters.distrito}
                  options={options.distritos.map((r) => ({ value: r, label: r }))}
                  onChange={(distrito) => setFilters((p) => ({ ...p, distrito }))}
                  placeholder="Todos"
                  searchPlaceholder="Buscar distrito…"
                />
              </div>
            ) : null}
          </div>

          <div className="grid gap-3 rounded-3xl border border-[var(--border)] bg-white px-4 py-3">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3"
              onClick={() => setDataOpen((v) => !v)}
              aria-expanded={dataOpen}
            >
              <div className="grid gap-0.5 text-left">
                <SectionTitle>Datos</SectionTitle>
                <div className="text-xs font-semibold text-slate-700">
                  {filters.profesion ||
                  filters.institucion ||
                  filters.grado_dificultad ||
                  filters.categoria ||
                  filters.zaf ||
                  filters.ze
                    ? "Filtrando"
                    : "Sin filtros"}
                </div>
              </div>
              <div className="text-slate-600">
                <SectionChevron open={dataOpen} />
              </div>
            </button>
            {dataOpen ? (
              <div className="grid gap-3">
                <SearchableSelect
                  label="Profesión"
                  value={filters.profesion}
                  options={options.profesiones.map((r) => ({ value: r, label: r }))}
                  onChange={(profesion) => setFilters((p) => ({ ...p, profesion }))}
                  placeholder="Todas"
                  searchPlaceholder="Buscar profesión…"
                />
                <SearchableSelect
                  label="Institución"
                  value={filters.institucion}
                  options={options.instituciones.map((r) => ({ value: r, label: r }))}
                  onChange={(institucion) => setFilters((p) => ({ ...p, institucion }))}
                  placeholder="Todas"
                  searchPlaceholder="Buscar institución…"
                />
                <SearchableSelect
                  label="Grado de dificultad"
                  value={filters.grado_dificultad}
                  options={options.grados_dificultad.map((r) => ({ value: r, label: r }))}
                  onChange={(grado_dificultad) => setFilters((p) => ({ ...p, grado_dificultad }))}
                  placeholder="Todos"
                  searchPlaceholder="Buscar grado…"
                />
                <SearchableSelect
                  label="Categoría"
                  value={filters.categoria}
                  options={options.categorias.map((r) => ({ value: r, label: r }))}
                  onChange={(categoria) => setFilters((p) => ({ ...p, categoria }))}
                  placeholder="Todas"
                  searchPlaceholder="Buscar categoría…"
                />
                <SearchableSelect
                  label="ZAF"
                  value={filters.zaf}
                  options={options.zaf.map((r) => ({ value: r, label: r }))}
                  onChange={(zaf) => setFilters((p) => ({ ...p, zaf }))}
                  placeholder="Todas"
                  searchPlaceholder="Buscar ZAF…"
                />
                <SearchableSelect
                  label="ZE"
                  value={filters.ze}
                  options={options.ze.map((r) => ({ value: r, label: r }))}
                  onChange={(ze) => setFilters((p) => ({ ...p, ze }))}
                  placeholder="Todas"
                  searchPlaceholder="Buscar ZE…"
                />
              </div>
            ) : null}
          </div>

          <div className="grid gap-3 rounded-3xl border border-[var(--border)] bg-white px-4 py-3">
            <SectionTitle>Establecimientos médicos más cercanos a ti</SectionTitle>
            <div className="grid gap-2">
              {results.slice(0, 5).map((h) => {
                const distance =
                  userLocation && Number.isFinite(h.lat) && Number.isFinite(h.lng)
                    ? haversineMeters(userLocation, { lat: h.lat, lng: h.lng })
                    : null;
                const isSelected = selectedHospitalId === h.id;
                return (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => onSelectHospital(h)}
                    className={[
                      "w-full rounded-2xl border px-3 py-2 text-left shadow-sm transition-colors",
                      isSelected
                        ? "border-blue-200 bg-blue-50"
                        : "border-[var(--border)] bg-white hover:bg-slate-50",
                    ].join(" ")}
                  >
                    <div className="line-clamp-1 text-sm font-extrabold text-slate-900">
                      {h.nombre_establecimiento}
                    </div>
                    <div className="line-clamp-1 text-xs font-semibold text-slate-600">
                      {h.distrito} · {h.provincia} · {h.departamento}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-extrabold text-slate-700">
                      <span className="rounded-xl bg-slate-100 px-2 py-1">{h.categoria}</span>
                      <span className="rounded-xl bg-slate-100 px-2 py-1">{h.grado_dificultad}</span>
                      {h.zaf === "SI" ? <span className="rounded-xl bg-emerald-50 px-2 py-1 text-emerald-700">ZAF</span> : null}
                      {h.ze === "SI" ? <span className="rounded-xl bg-amber-50 px-2 py-1 text-amber-700">ZE</span> : null}
                      {distance != null ? (
                        <span className="rounded-xl bg-blue-50 px-2 py-1 text-blue-700">
                          {formatDistance(distance)}
                        </span>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
