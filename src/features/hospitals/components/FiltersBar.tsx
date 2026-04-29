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

function sameStringSet(a: string[] | null | undefined, b: string[] | null | undefined) {
  const aa = Array.isArray(a) ? a : [];
  const bb = Array.isArray(b) ? b : [];
  if (aa.length !== bb.length) return false;
  const sa = aa.slice().sort((x, y) => x.localeCompare(y));
  const sb = bb.slice().sort((x, y) => x.localeCompare(y));
  for (let i = 0; i < sa.length; i++) {
    if (sa[i] !== sb[i]) return false;
  }
  return true;
}

function sameScalar(a: unknown, b: unknown) {
  return (a ?? null) === (b ?? null);
}

function areHospitalFiltersEquivalent(a: HospitalFilters, b: HospitalFilters) {
  return (
    sameScalar(a.profesion, b.profesion) &&
    sameStringSet(a.institucion, b.institucion) &&
    sameStringSet(a.departamento, b.departamento) &&
    sameStringSet(a.grado_dificultad, b.grado_dificultad) &&
    sameStringSet(a.categoria, b.categoria) &&
    sameScalar(a.zaf, b.zaf) &&
    sameScalar(a.ze, b.ze) &&
    sameScalar(a.serums_periodo, b.serums_periodo) &&
    sameScalar(a.serums_modalidad, b.serums_modalidad) &&
    sameScalar(a.airport_hours_max ?? null, b.airport_hours_max ?? null)
  );
}

export type FiltersBarProps = {
  filters: HospitalFilters;
  setFilters: React.Dispatch<React.SetStateAction<HospitalFilters>>;
  options: Options;
  results: HospitalMapItem[];
  selectedHospitalId: string | null;
  onSelectHospital: (hospital: HospitalMapItem) => void;
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
  title,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  title?: string;
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
      <div className="min-w-0 text-sm font-medium text-[var(--label)]" title={title}>
        {label}
      </div>
      <div
        className={cn(
          "grid h-5 w-5 place-items-center rounded-full border-2 transition-[background-color,border-color] duration-200 ease-out"
        )}
        style={{
          borderColor: checked ? "var(--primary)" : "var(--border)",
          backgroundColor: checked ? "var(--primary)" : "var(--card)",
        }}
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

function normalizeDepartamentoKey(value: string) {
  return String(value || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function institutionOrderRank(institucion: string) {
  const v = normalizeInstitution(institucion);
  if (v.includes("essalud")) return 0;
  if (v.includes("minsa")) return 1;
  if (v.includes("marina")) return 2;
  if (v.includes("policia")) return 3;
  if (v.includes("ejercito")) return 4;
  if (v.includes("fuerza aerea") || v.includes("aerea del peru") || v.includes("fap")) return 5;
  return 6;
}

function abbreviateInstitutionForFilter(value: string) {
  const full = String(value || "").trim();
  const n = normalizeInstitution(full);
  if (n === "sanidad de la fuerza aerea del peru") return { label: "FAP", title: full };
  if (n === "sanidad de la marina de guerra del peru") return { label: "Marina", title: full };
  if (n === "sanidad de la policia nacional del peru") return { label: "PNP", title: full };
  if (n === "sanidad del ejercito del peru") return { label: "Ejército", title: full };
  return { label: full, title: undefined };
}

export function FiltersBar({
  filters,
  setFilters,
  options,
  results,
  selectedHospitalId,
  onSelectHospital,
  onCloseMobile,
}: FiltersBarProps) {
  const [locationOpen, setLocationOpen] = React.useState(false);
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [draftFilters, setDraftFilters] = React.useState<HospitalFilters>(filters);

  const [departmentSearch, setDepartmentSearch] = React.useState<string>("");

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
  }, [options, results]);
  const instValues = React.useMemo(() => {
    if (Array.isArray(options?.instituciones?.values) && options.instituciones.values.length > 0) {
      return options.instituciones.values.slice().sort((a, b) => {
        const ra = institutionOrderRank(a);
        const rb = institutionOrderRank(b);
        if (ra !== rb) return ra - rb;
        return a.localeCompare(b);
      });
    }
    const set = new Set<string>();
    for (const h of results) {
      const v = String(h?.institucion || "").trim();
      if (v) set.add(v);
    }
    return Array.from(set).sort((a, b) => {
      const ra = institutionOrderRank(a);
      const rb = institutionOrderRank(b);
      if (ra !== rb) return ra - rb;
      return a.localeCompare(b);
    });
  }, [options, results]);

  const professionSuggestions = React.useMemo(() => {
    const set = new Set<string>();
    for (const h of results) {
      const many = Array.isArray(h?.profesiones) ? h.profesiones : null;
      if (many && many.length > 0) {
        for (const p of many) {
          const v = String(p || "").trim();
          if (v) set.add(v);
        }
      } else {
        const v = String(h?.profesion || "").trim();
        if (v) set.add(v);
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [results]);

  const deptGroups = React.useMemo(() => {
    const groups = new Map<string, { key: string; label: string; variants: string[]; enabled: boolean }>();
    const enabledMap = options?.departamentos?.enabled || {};

    for (const raw of deptValues) {
      const key = normalizeDepartamentoKey(raw);
      if (!key) continue;
      const enabled = enabledMap[raw] ?? true;
      const existing = groups.get(key);
      if (existing) {
        if (!existing.variants.includes(raw)) existing.variants.push(raw);
        existing.enabled = existing.enabled || enabled;
        continue;
      }
      groups.set(key, { key, label: key, variants: [raw], enabled });
    }

    const out = Array.from(groups.values());
    out.sort((a, b) => a.label.localeCompare(b.label, "es-PE"));
    return out;
  }, [deptValues, options?.departamentos?.enabled]);

  const filteredDeptValues = React.useMemo(() => {
    const q = normalizeDepartamentoKey(departmentSearch);
    if (!q) return deptGroups;
    return deptGroups.filter((d) => d.label.includes(q));
  }, [departmentSearch, deptGroups]);

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

  const selectedDepartamentoKeys = React.useMemo(() => {
    return new Set(selectedDepartamentos.map(normalizeDepartamentoKey));
  }, [selectedDepartamentos]);

  React.useEffect(() => {
    setDraftFilters(filters);
    const nextDept = Array.isArray(filters.departamento) ? filters.departamento : [];
    const nextInst = Array.isArray(filters.institucion) ? filters.institucion : [];
    const nextGd = Array.isArray(filters.grado_dificultad) ? filters.grado_dificultad : [];
    const nextCat = Array.isArray(filters.categoria) ? filters.categoria : [];
    selectedDepartamentosRef.current = nextDept;
    selectedInstitucionesRef.current = nextInst;
    selectedGdRef.current = nextGd;
    selectedCategoriasRef.current = nextCat;
    setSelectedDepartamentos(nextDept);
    setSelectedInstituciones(nextInst);
    setSelectedGd(nextGd);
    setSelectedCategorias(nextCat);
  }, [filters]);

  const isDirty = React.useMemo(() => {
    return !areHospitalFiltersEquivalent(filters, draftFilters);
  }, [filters, draftFilters]);

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
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              const next = createInitialHospitalFilters();
              setFilters(next);
              setDraftFilters(next);
              setDepartmentSearch("");
              setSelectedDepartamentos([]);
              setSelectedInstituciones([]);
              setSelectedGd([]);
              setSelectedCategorias([]);
              selectedDepartamentosRef.current = [];
              selectedInstitucionesRef.current = [];
              selectedGdRef.current = [];
              selectedCategoriasRef.current = [];
            }}
          >
            Limpiar
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="!bg-[var(--medical-blue)] !text-white active:!bg-[var(--secondary)] active:!text-[var(--secondary-foreground)]"
            disabled={!isDirty}
            onClick={() => {
              setFilters(draftFilters);
            }}
          >
            Aplicar
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
            <div className="grid gap-2 px-2 py-2">
              <div className="grid gap-0.5">
                <SectionTitle>Carreras / Profesiones</SectionTitle>
                <div className="text-xs font-medium text-[var(--label)]">Selecciona una opción</div>
              </div>
              {professionSuggestions.length ? (
                <div className="grid max-h-[220px] gap-1 overflow-auto pr-1">
                  {professionSuggestions.map((p) => (
                    <AppleCheckbox
                      key={p}
                      label={p}
                      checked={draftFilters.profesion === p}
                      onChange={() =>
                        setDraftFilters((prev) => ({ ...prev, profesion: prev.profesion === p ? null : p }))
                      }
                    />
                  ))}
                </div>
              ) : (
                <div className="px-2 py-2 text-xs font-medium text-[var(--label)]">Sin opciones.</div>
              )}
            </div>
          </div>

          <div className="rounded-[var(--radius-panel)] bg-white px-3 py-2 shadow-[var(--shadow-soft)]">
            <div className="grid gap-3 px-2 py-2">
              <div className="grid gap-0.5">
                <SectionTitle>SERUMS</SectionTitle>
                <div className="text-xs font-medium text-[var(--label)]">Modalidad</div>
              </div>



              <div className="grid gap-1">
                <div className="text-xs font-medium text-[var(--label)]">Modalidad</div>
                {[
                  { label: "Remunerado", value: "remunerado" },
                  { label: "Equivalente", value: "equivalente" },
                ].map((m) => (
                  <AppleCheckbox
                    key={m.value}
                    label={m.label}
                    checked={draftFilters.serums_modalidad === m.value}
                    onChange={() =>
                      setDraftFilters((prev) => ({
                        ...prev,
                        serums_modalidad: prev.serums_modalidad === m.value ? null : m.value,
                      }))
                    }
                  />
                ))}
              </div>
            </div>
          </div>

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
                  <input
                    value={departmentSearch}
                    onChange={(e) => setDepartmentSearch(e.target.value)}
                    placeholder="Escribe para buscar departamento..."
                    className="h-9 w-full rounded-2xl border border-[var(--border)] bg-white px-3 text-sm font-medium text-[var(--title)] shadow-[0_1px_0_rgba(0,0,0,0.04)] outline-none focus:ring-2 focus:ring-black/5"
                  />
                  <div className="grid max-h-[260px] gap-1 overflow-auto pr-1">
                    {filteredDeptValues.map((g) => {
                      const checked = selectedDepartamentoKeys.has(g.key);
                      const enabled = g.enabled;
                      return (
                        <AppleCheckbox
                          key={g.key}
                          label={g.label}
                          checked={checked}
                          disabled={!enabled}
                          onChange={() => {
                            const prev = selectedDepartamentosRef.current;
                            let next: string[];
                            if (checked) {
                              next = prev.filter((v) => normalizeDepartamentoKey(v) !== g.key);
                            } else {
                              const set = new Set(prev);
                              for (const v of g.variants) set.add(v);
                              set.add(g.key);
                              next = Array.from(set);
                            }
                            selectedDepartamentosRef.current = next;
                            setSelectedDepartamentos(next);
                            setDraftFilters((p) => ({ ...p, departamento: next }));
                          }}
                        />
                      );
                    })}
                  </div>
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
                  <div className="px-2 pt-1 text-xs font-medium text-[var(--label)]">Bono</div>
                  {[
                    {
                      key: "zaf" as const,
                      label: "ZAF",
                      checked: draftFilters.zaf === "SI",
                      onToggle: () => setDraftFilters((prev) => ({ ...prev, zaf: prev.zaf === "SI" ? null : "SI" })),
                    },
                    {
                      key: "ze" as const,
                      label: "ZE",
                      checked: draftFilters.ze === "SI",
                      onToggle: () => setDraftFilters((prev) => ({ ...prev, ze: prev.ze === "SI" ? null : "SI" })),
                    },
                  ].map((f) => (
                    <AppleCheckbox key={f.key} label={f.label} checked={f.checked} onChange={f.onToggle} />
                  ))}
                </div>

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
                        const display = abbreviateInstitutionForFilter(i);
                        return (
                          <AppleCheckbox
                            key={i}
                            label={display.label}
                            title={display.title}
                            checked={checked}
                            disabled={!enabled}
                            onChange={() => {
                              const next = toggleMulti(selectedInstitucionesRef.current, i);
                              selectedInstitucionesRef.current = next;
                              setSelectedInstituciones(next);
                              setDraftFilters((prev) => ({ ...prev, institucion: next }));
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
                        setDraftFilters((prev) => ({ ...prev, grado_dificultad: next }));
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
                        setDraftFilters((prev) => ({ ...prev, categoria: next }));
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
