"use client";

import * as React from "react";

import { createInitialHospitalFilters } from "@/features/hospitals/hooks/useHospitalFiltering";
import { HospitalFilters } from "@/features/hospitals/types";
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
  onCloseMobile?: () => void;
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-600">
      {children}
    </div>
  );
}

export function FiltersBar({ filters, setFilters, options, onCloseMobile }: FiltersBarProps) {
  return (
    <Card className="h-full w-full overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
        <div>
          <div className="text-sm font-bold text-slate-900">Filtros</div>
          <div className="text-xs text-slate-500">Conectado al backend</div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setFilters(createInitialHospitalFilters());
            }}
          >
            Limpiar
          </Button>
          {onCloseMobile ? (
            <Button size="sm" variant="secondary" onClick={onCloseMobile}>
              Cerrar
            </Button>
          ) : null}
        </div>
      </div>

      <div className="h-full overflow-auto p-4">
        <div className="grid gap-4">
          <div className="grid gap-3">
            <SectionTitle>Ubicación</SectionTitle>
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

          <div className="grid gap-3">
            <SectionTitle>Datos</SectionTitle>
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
        </div>
      </div>
    </Card>
  );
}
