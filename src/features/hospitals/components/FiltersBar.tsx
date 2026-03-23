"use client";

import * as React from "react";

import { createInitialHospitalFilters } from "@/features/hospitals/hooks/useHospitalFiltering";
import { HospitalFilters, HospitalMapItem } from "@/features/hospitals/types";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { cn } from "@/shared/lib/cn";

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
  userLocation: { lat: number; lng: number; accuracy?: number | null } | null;
  onCloseMobile?: () => void;
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[12px] font-semibold text-[var(--title)]">{children}</div>
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
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AppleCheckbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      className="flex w-full items-center justify-between gap-3 rounded-2xl px-2 py-2 text-left hover:bg-black/[0.03]"
      onClick={onChange}
      aria-pressed={checked}
    >
      <div className="min-w-0 text-sm font-medium text-[var(--label)]">{label}</div>
      <div
        className={cn(
          "grid h-5 w-5 place-items-center rounded-full border-2 transition-[background-color,border-color] duration-200 ease-out",
          checked ? "border-[var(--accent)] bg-[var(--accent)]" : "border-black/20 bg-white",
        )}
        aria-hidden="true"
      >
        <svg viewBox="0 0 24 24" className={cn("h-4 w-4", checked ? "block" : "hidden")} fill="none">
          <path
            d="M20 6 9 17l-5-5"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </button>
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
  const [filtersOpen, setFiltersOpen] = React.useState(true);
  const [airportOpen, setAirportOpen] = React.useState(false);

  const [selectedDepartamentos, setSelectedDepartamentos] = React.useState<string[]>(
    filters.departamento ? [filters.departamento] : [],
  );
  const [selectedInstituciones, setSelectedInstituciones] = React.useState<string[]>(
    filters.institucion ? [filters.institucion] : [],
  );
  const [selectedGd, setSelectedGd] = React.useState<string[]>(filters.grado_dificultad ? [filters.grado_dificultad] : []);
  const [selectedCategorias, setSelectedCategorias] = React.useState<string[]>(filters.categoria ? [filters.categoria] : []);
  const [selectedAirportDistance, setSelectedAirportDistance] = React.useState<string[]>([]);

  React.useEffect(() => {
    setSelectedDepartamentos(filters.departamento ? [filters.departamento] : []);
  }, [filters.departamento]);

  React.useEffect(() => {
    setSelectedInstituciones(filters.institucion ? [filters.institucion] : []);
  }, [filters.institucion]);

  React.useEffect(() => {
    setSelectedGd(filters.grado_dificultad ? [filters.grado_dificultad] : []);
  }, [filters.grado_dificultad]);

  React.useEffect(() => {
    setSelectedCategorias(filters.categoria ? [filters.categoria] : []);
  }, [filters.categoria]);

  const toggleMulti = React.useCallback((prev: string[], value: string) => {
    return prev.includes(value) ? prev.filter((x) => x !== value) : [...prev, value];
  }, []);

  return (
    <Card className="h-full w-full overflow-hidden bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] bg-white px-5 py-4">
        <div className="min-w-0">
          <div className="text-base font-semibold text-[var(--title)]">Filtros</div>
          <div className="mt-0.5 text-xs font-medium text-[var(--label)]">Selecciona múltiples opciones.</div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setFilters(createInitialHospitalFilters());
              setSelectedDepartamentos([]);
              setSelectedInstituciones([]);
              setSelectedGd([]);
              setSelectedCategorias([]);
              setSelectedAirportDistance([]);
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

      <div className="h-full overflow-auto px-3 py-4">
        <div className="grid gap-3">
          <div className="rounded-[var(--radius-panel)] bg-white px-3 py-2 shadow-[var(--shadow-soft)]">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 px-2 py-2"
              onClick={() => setLocationOpen((v) => !v)}
              aria-expanded={locationOpen}
            >
              <div className="grid gap-0.5 text-left">
                <SectionTitle>Ubicación</SectionTitle>
                <div className="text-xs font-medium text-[var(--label)]">Departamento (filtro)</div>
              </div>
              <div className="text-[var(--label)]">
                <SectionChevron open={locationOpen} />
              </div>
            </button>
            <div
              className="overflow-hidden transition-[max-height,opacity] duration-300 ease-out"
              style={{ maxHeight: locationOpen ? 520 : 0, opacity: locationOpen ? 1 : 0 }}
            >
              <div className="grid gap-1 px-1 pb-2">
                {options.departamentos.slice(0, 18).map((d) => (
                  <AppleCheckbox
                    key={d}
                    label={d}
                    checked={selectedDepartamentos.includes(d)}
                    onChange={() => {
                      setSelectedDepartamentos((p) => {
                        const next = toggleMulti(p, d);
                        setFilters((prev) => ({
                          ...prev,
                          departamento: next.length > 0 ? next[next.length - 1] : null,
                          provincia: null,
                          distrito: null,
                        }));
                        return next;
                      });
                    }}
                  />
                ))}
              </div>

              <div className="px-3 pb-3 pt-2">
                <div className="grid gap-2 rounded-[var(--radius-card)] bg-black/[0.02] px-3 py-3">
                  <div className="text-xs font-medium text-[var(--label)]">Provincia (informativo)</div>
                  <div className="text-sm font-medium text-[var(--title)]">{filters.provincia || "—"}</div>
                  <div className="text-xs font-medium text-[var(--label)]">Distrito (informativo)</div>
                  <div className="text-sm font-medium text-[var(--title)]">{filters.distrito || "—"}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[var(--radius-panel)] bg-white px-3 py-2 shadow-[var(--shadow-soft)]">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 px-2 py-2"
              onClick={() => setFiltersOpen((v) => !v)}
              aria-expanded={filtersOpen}
            >
              <div className="grid gap-0.5 text-left">
                <SectionTitle>Filtros</SectionTitle>
                <div className="text-xs font-medium text-[var(--label)]">Institución, GD, Categoría</div>
              </div>
              <div className="text-[var(--label)]">
                <SectionChevron open={filtersOpen} />
              </div>
            </button>
            <div
              className="overflow-hidden transition-[max-height,opacity] duration-300 ease-out"
              style={{ maxHeight: filtersOpen ? 920 : 0, opacity: filtersOpen ? 1 : 0 }}
            >
              <div className="grid gap-3 px-2 pb-3">
                <div className="grid gap-1">
                  <div className="px-2 pt-1 text-xs font-medium text-[var(--label)]">Institución</div>
                  {options.instituciones.slice(0, 10).map((i) => (
                    <AppleCheckbox
                      key={i}
                      label={i}
                      checked={selectedInstituciones.includes(i)}
                      onChange={() => {
                        setSelectedInstituciones((p) => {
                          const next = toggleMulti(p, i);
                          setFilters((prev) => ({ ...prev, institucion: next.length > 0 ? next[next.length - 1] : null }));
                          return next;
                        });
                      }}
                    />
                  ))}
                </div>

                <div className="grid gap-1">
                  <div className="px-2 pt-1 text-xs font-medium text-[var(--label)]">Grado de dificultad</div>
                  {["GD-1", "GD-2", "GD-3", "GD-4", "GD-5"].map((gd) => (
                    <AppleCheckbox
                      key={gd}
                      label={gd}
                      checked={selectedGd.includes(gd)}
                      onChange={() => {
                        setSelectedGd((p) => {
                          const next = toggleMulti(p, gd);
                          setFilters((prev) => ({ ...prev, grado_dificultad: next.length > 0 ? next[next.length - 1] : null }));
                          return next;
                        });
                      }}
                    />
                  ))}
                </div>

                <div className="grid gap-1">
                  <div className="px-2 pt-1 text-xs font-medium text-[var(--label)]">Categoría</div>
                  {["I-1", "I-2", "I-3", "I-4"].map((c) => (
                    <AppleCheckbox
                      key={c}
                      label={c}
                      checked={selectedCategorias.includes(c)}
                      onChange={() => {
                        setSelectedCategorias((p) => {
                          const next = toggleMulti(p, c);
                          setFilters((prev) => ({ ...prev, categoria: next.length > 0 ? next[next.length - 1] : null }));
                          return next;
                        });
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[var(--radius-panel)] bg-white px-3 py-2 shadow-[var(--shadow-soft)]">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 px-2 py-2"
              onClick={() => setAirportOpen((v) => !v)}
              aria-expanded={airportOpen}
            >
              <div className="grid gap-0.5 text-left">
                <SectionTitle>Distancia al aeropuerto</SectionTitle>
                <div className="text-xs font-medium text-[var(--label)]">Filtro (diseño)</div>
              </div>
              <div className="text-[var(--label)]">
                <SectionChevron open={airportOpen} />
              </div>
            </button>
            <div
              className="overflow-hidden transition-[max-height,opacity] duration-300 ease-out"
              style={{ maxHeight: airportOpen ? 320 : 0, opacity: airportOpen ? 1 : 0 }}
            >
              <div className="grid gap-1 px-1 pb-2">
                {["<1h", "<2h", "<3h", "<4h"].map((o) => (
                  <AppleCheckbox
                    key={o}
                    label={o}
                    checked={selectedAirportDistance.includes(o)}
                    onChange={() => setSelectedAirportDistance((p) => toggleMulti(p, o))}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-[var(--radius-panel)] bg-white px-4 py-3 shadow-[var(--shadow-soft)]">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs font-medium text-[var(--label)]">Cerca de ti</div>
                <div className="text-sm font-semibold text-[var(--title)]">Establecimientos más cercanos</div>
              </div>
            </div>

            <div className="mt-3 grid gap-2">
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
                    className={cn(
                      "w-full rounded-[var(--radius-card)] px-3 py-3 text-left shadow-[0_1px_0_rgba(0,0,0,0.04)] transition-colors",
                      isSelected ? "bg-black/[0.04]" : "bg-black/[0.02] hover:bg-black/[0.04]",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 line-clamp-1 text-sm font-semibold text-[var(--title)]">
                        {h.nombre_establecimiento}
                      </div>
                      <div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white text-[var(--label)] shadow-[0_1px_0_rgba(0,0,0,0.04)]">
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
                          <path
                            d="M20.3 7.6a4.6 4.6 0 0 0-6.5 0L12 9.4l-1.8-1.8a4.6 4.6 0 0 0-6.5 6.5l1.8 1.8L12 21l6.5-5.1 1.8-1.8a4.6 4.6 0 0 0 0-6.5Z"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                    </div>
                    <div className="mt-0.5 line-clamp-1 text-xs font-medium text-[var(--label)]">
                      {h.distrito} · {h.provincia} · {h.departamento}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-[var(--label)]">
                      {h.categoria ? (
                        <span className="rounded-full bg-white px-2 py-1 shadow-[0_1px_0_rgba(0,0,0,0.04)]">{h.categoria}</span>
                      ) : null}
                      {h.grado_dificultad ? (
                        <span className="rounded-full bg-white px-2 py-1 shadow-[0_1px_0_rgba(0,0,0,0.04)]">
                          {h.grado_dificultad}
                        </span>
                      ) : null}
                      {h.zaf === "SI" ? (
                        <span className="rounded-full bg-white px-2 py-1 shadow-[0_1px_0_rgba(0,0,0,0.04)]">ZAF</span>
                      ) : null}
                      {h.ze === "SI" ? (
                        <span className="rounded-full bg-white px-2 py-1 shadow-[0_1px_0_rgba(0,0,0,0.04)]">ZE</span>
                      ) : null}
                      {distance != null ? (
                        <span className="rounded-full bg-white px-2 py-1 shadow-[0_1px_0_rgba(0,0,0,0.04)]">
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
