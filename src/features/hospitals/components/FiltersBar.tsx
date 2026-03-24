"use client";

import * as React from "react";

import { createInitialHospitalFilters } from "@/features/hospitals/hooks/useHospitalFiltering";
import { HospitalFilters, HospitalMapItem } from "@/features/hospitals/types";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { cn } from "@/shared/lib/cn";

type FacetGroup = {
  values: string[];
  enabled: Record<string, boolean>;
};

type Options = {
  departamentos: FacetGroup;
  instituciones: FacetGroup;
  grados_dificultad: FacetGroup;
  categorias: FacetGroup;
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
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        "flex w-full items-center justify-between gap-3 rounded-2xl px-2 py-2 text-left",
        disabled && !checked ? "cursor-not-allowed opacity-45" : "hover:bg-black/[0.03]",
      )}
      onClick={() => {
        if (disabled && !checked) return;
        onChange();
      }}
      aria-pressed={checked}
      aria-disabled={disabled && !checked ? true : undefined}
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

function normalizeInstitution(value: string) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function institutionAccentColor(institucion: string) {
  const v = normalizeInstitution(institucion);
  if (v.includes("essalud")) return "#38BDF8";
  if (v.includes("minsa")) return "#FBBF24";
  if (
    v.includes("ffaa") ||
    v.includes("ff.aa") ||
    v.includes("fuerza aerea") ||
    v.includes("aerea del peru") ||
    v.includes("marina") ||
    v.includes("policia") ||
    v.includes("ejercito")
  )
    return "#22C55E";
  return "#EF4444";
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
  const [locationOpen, setLocationOpen] = React.useState(true);
  const [filtersOpen, setFiltersOpen] = React.useState(true);
  const [airportOpen, setAirportOpen] = React.useState(false);

  const deptValues = React.useMemo(() => {
    if (Array.isArray(options?.departamentos?.values) && options.departamentos.values.length > 0) {
      return options.departamentos.values;
    }
    const set = new Set<string>();
    for (const h of results) {
      const v = String(h?.departamento || "").trim();
      if (v) set.add(v);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [options?.departamentos?.values, results]);
  const instValues = React.useMemo(() => {
    if (Array.isArray(options?.instituciones?.values) && options.instituciones.values.length > 0) {
      return options.instituciones.values;
    }
    const set = new Set<string>();
    for (const h of results) {
      const v = String(h?.institucion || "").trim();
      if (v) set.add(v);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [options?.instituciones?.values, results]);

  const [selectedDepartamentos, setSelectedDepartamentos] = React.useState<string[]>(
    Array.isArray(filters.departamento) ? filters.departamento : [],
  );
  const selectedDepartamentosRef = React.useRef<string[]>(selectedDepartamentos);
  const [selectedInstituciones, setSelectedInstituciones] = React.useState<string[]>(
    Array.isArray(filters.institucion) ? filters.institucion : [],
  );
  const selectedInstitucionesRef = React.useRef<string[]>(selectedInstituciones);
  const [selectedGd, setSelectedGd] = React.useState<string[]>(
    Array.isArray(filters.grado_dificultad) ? filters.grado_dificultad : [],
  );
  const selectedGdRef = React.useRef<string[]>(selectedGd);
  const [selectedCategorias, setSelectedCategorias] = React.useState<string[]>(
    Array.isArray(filters.categoria) ? filters.categoria : [],
  );
  const selectedCategoriasRef = React.useRef<string[]>(selectedCategorias);
  const [selectedAirportDistance, setSelectedAirportDistance] = React.useState<string[]>(
    [],
  );

  React.useEffect(() => {
    const next = Array.isArray(filters.departamento) ? filters.departamento : [];
    selectedDepartamentosRef.current = next;
    setSelectedDepartamentos(next);
  }, [filters.departamento]);

  React.useEffect(() => {
    const next = Array.isArray(filters.institucion) ? filters.institucion : [];
    selectedInstitucionesRef.current = next;
    setSelectedInstituciones(next);
  }, [filters.institucion]);

  React.useEffect(() => {
    const next = Array.isArray(filters.grado_dificultad) ? filters.grado_dificultad : [];
    selectedGdRef.current = next;
    setSelectedGd(next);
  }, [filters.grado_dificultad]);

  React.useEffect(() => {
    const next = Array.isArray(filters.categoria) ? filters.categoria : [];
    selectedCategoriasRef.current = next;
    setSelectedCategorias(next);
  }, [filters.categoria]);

  React.useEffect(() => {
    if (!selectedAirportDistance.length) {
      setFilters((prev) => ({ ...prev, airport_hours_max: null }));
      return;
    }
    const toHours = (s: string) => {
      const m = s.match(/<(\d+)h/);
      return m ? Number(m[1]) : null;
    };
    const hours = selectedAirportDistance.map(toHours).filter((n): n is number => Number.isFinite(n));
    const minH = hours.length ? Math.min(...hours) : null;
    setFilters((prev) => ({ ...prev, airport_hours_max: minH }));
  }, [selectedAirportDistance, setFilters]);
  const toggleMulti = React.useCallback((prev: string[], value: string) => {
    return prev.includes(value) ? prev.filter((x) => x !== value) : [...prev, value];
  }, []);

  return (
    <Card className="flex h-full w-full flex-col overflow-hidden bg-white">
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

      <div
        className="min-h-0 flex-1 overflow-auto overscroll-contain touch-pan-y px-3 py-4"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
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
                <div className="text-xs font-medium text-[var(--label)]">Departamento</div>
              </div>
              <div className="text-[var(--label)]">
                <SectionChevron open={locationOpen} />
              </div>
            </button>
            <div
              className="overflow-hidden transition-[max-height,opacity] duration-300 ease-out"
              style={{ maxHeight: locationOpen ? 4000 : 0, opacity: locationOpen ? 1 : 0 }}
            >
              <div
                className="pr-1"
              >
                <div className="grid gap-1 px-1 pb-2">
                  {deptValues.map((d) => {
                    const checked = selectedDepartamentos.includes(d);
                    const enabled = options.departamentos.enabled[d] ?? true;
                    return (
                      <AppleCheckbox
                        key={d}
                        label={d}
                        checked={checked}
                        disabled={!enabled}
                        onChange={() => {
                          const next = toggleMulti(selectedDepartamentosRef.current, d);
                          selectedDepartamentosRef.current = next;
                          setSelectedDepartamentos(next);
                          setFilters((prev) => ({
                            ...prev,
                            departamento: next,
                          }));
                        }}
                      />
                    );
                  })}
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
                  <div
                    className="max-h-[240px] overflow-y-auto overscroll-contain touch-pan-y pr-1"
                    style={{ WebkitOverflowScrolling: "touch" }}
                    onWheel={(e) => {
                      const el = e.currentTarget as HTMLDivElement;
                      const delta = e.deltaY;
                      const atTop = el.scrollTop <= 0;
                      const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
                      if ((delta < 0 && atTop) || (delta > 0 && atBottom)) {
                        e.preventDefault();
                      }
                      e.stopPropagation();
                    }}
                    onTouchStartCapture={(e) => {
                      const el = e.currentTarget as HTMLDivElement;
                      if (el.scrollHeight <= el.clientHeight) return;
                      if (el.scrollTop <= 0) el.scrollTop = 1;
                      else if (el.scrollTop + el.clientHeight >= el.scrollHeight) el.scrollTop = el.scrollHeight - el.clientHeight - 1;
                    }}
                    onTouchMove={(e) => {
                      e.stopPropagation();
                    }}
                  >
                    <div className="grid gap-1">
                      {instValues.map((i) => {
                        const checked = selectedInstituciones.includes(i);
                        const enabled = options.instituciones.enabled[i] ?? true;
                        return (
                          <AppleCheckbox
                            key={i}
                            label={i}
                            checked={checked}
                            disabled={!enabled}
                            onChange={() => {
                              const next = toggleMulti(selectedInstitucionesRef.current, i);
                              selectedInstitucionesRef.current = next;
                              setSelectedInstituciones(next);
                              setFilters((prev) => ({ ...prev, institucion: next }));
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="grid gap-1">
                  <div className="px-2 pt-1 text-xs font-medium text-[var(--label)]">Grado de dificultad</div>
                  {["GD-1", "GD-2", "GD-3", "GD-4", "GD-5"].map((gd) => (
                    <AppleCheckbox
                      key={gd}
                      label={gd}
                      checked={selectedGd.includes(gd)}
                      disabled={!(options.grados_dificultad.enabled[gd] ?? true)}
                      onChange={() => {
                        const next = toggleMulti(selectedGdRef.current, gd);
                        selectedGdRef.current = next;
                        setSelectedGd(next);
                        setFilters((prev) => ({ ...prev, grado_dificultad: next }));
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
                      disabled={!(options.categorias.enabled[c] ?? true)}
                      onChange={() => {
                        const next = toggleMulti(selectedCategoriasRef.current, c);
                        selectedCategoriasRef.current = next;
                        setSelectedCategorias(next);
                        setFilters((prev) => ({ ...prev, categoria: next }));
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
                <div className="text-xs font-medium text-[var(--label)]">Tiempo de manejo</div>
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

          <div className="rounded-[var(--radius-panel)] bg-white px-5 py-4 shadow-[var(--shadow-soft)]">
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
                const accent = institutionAccentColor(h.institucion);
                return (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => onSelectHospital(h)}
                    className={cn(
                      "relative w-full overflow-hidden rounded-[var(--radius-card)] bg-white px-4 py-3 text-left shadow-[var(--shadow-soft)] transition-[background-color,box-shadow] duration-200 ease-out",
                      isSelected
                        ? "bg-[var(--background-secondary)] shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
                        : "hover:bg-[var(--background-secondary)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)]",
                    )}
                  >
                    <div className="absolute left-0 top-0 h-full w-1.5" style={{ background: accent }} aria-hidden="true" />
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 line-clamp-2 text-sm font-semibold leading-snug text-[var(--title)]">
                        {toTitleCase(h.nombre_establecimiento)}
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
                      {h.categoria && String(h.categoria).trim() !== "0" ? (
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
