"use client";

import * as React from "react";

import { createInitialHospitalFilters } from "@/features/hospitals/hooks/useHospitalFiltering";
import {
  EstablishmentType,
  HospitalFilters,
  HospitalSector,
  RuralityLevel,
} from "@/features/hospitals/types";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { SearchableSelect } from "@/shared/ui/SearchableSelect";

type Options = {
  regions: string[];
  provinces: string[];
  districts: string[];
  services: string[];
};

export type FiltersBarProps = {
  filters: HospitalFilters;
  setFilters: React.Dispatch<React.SetStateAction<HospitalFilters>>;
  options: Options;
  onCloseMobile?: () => void;
};

function toggleArrayValue<T>(arr: T[], value: T) {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-600">{children}</div>;
}

function CheckboxRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-xl px-2 py-2 hover:bg-slate-50">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-slate-300 text-[var(--medical-blue)] focus:ring-[var(--medical-blue)]"
      />
      <span className="text-sm text-slate-800">{label}</span>
    </label>
  );
}

function RadioRow({
  label,
  checked,
  onSelect,
}: {
  label: string;
  checked: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm shadow-sm transition-colors",
        checked
          ? "border-[var(--medical-blue)] bg-blue-50 text-slate-900"
          : "border-[var(--border)] bg-white text-slate-700 hover:bg-slate-50",
      )}
    >
      <span className="font-medium">{label}</span>
      <span
        className={cn(
          "h-3 w-3 rounded-full border",
          checked
            ? "border-[var(--medical-blue)] bg-[var(--medical-blue)]"
            : "border-slate-300 bg-white",
        )}
      />
    </button>
  );
}

const sectorOptions: Array<{ value: HospitalSector; label: string }> = [
  { value: "MINSA", label: "MINSA" },
  { value: "ESSALUD", label: "ESSALUD" },
  { value: "Militar", label: "Militar" },
  { value: "Privado", label: "Privado" },
];

const establishmentOptions: Array<{ value: EstablishmentType; label: string }> = [
  { value: "I-1", label: "I-1" },
  { value: "I-2", label: "I-2" },
  { value: "I-3", label: "I-3" },
  { value: "I-4", label: "I-4" },
];

const ruralityOptions: RuralityLevel[] = ["Alto", "Medio", "Bajo"];

export function FiltersBar({ filters, setFilters, options, onCloseMobile }: FiltersBarProps) {
  return (
    <Card className="h-full w-full overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
        <div>
          <div className="text-sm font-bold text-slate-900">Filtros</div>
          <div className="text-xs text-slate-500">Solo estado interno (sin backend)</div>
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
              label="Región"
              value={filters.region}
              options={options.regions.map((r) => ({ value: r, label: r }))}
              onChange={(region) =>
                setFilters((p) => ({ ...p, region, province: null, district: null }))
              }
              placeholder="Todas"
              searchPlaceholder="Buscar región…"
            />
            <SearchableSelect
              label="Provincia"
              value={filters.province}
              options={options.provinces.map((r) => ({ value: r, label: r }))}
              onChange={(province) =>
                setFilters((p) => ({ ...p, province, district: null }))
              }
              placeholder="Todas"
              searchPlaceholder="Buscar provincia…"
            />
            <SearchableSelect
              label="Distrito"
              value={filters.district}
              options={options.districts.map((r) => ({ value: r, label: r }))}
              onChange={(district) => setFilters((p) => ({ ...p, district }))}
              placeholder="Todos"
              searchPlaceholder="Buscar distrito…"
            />
          </div>

          <div className="grid gap-2">
            <SectionTitle>Sector</SectionTitle>
            <div className="grid gap-1">
              {sectorOptions.map((s) => (
                <CheckboxRow
                  key={s.value}
                  label={s.label}
                  checked={filters.sectors.includes(s.value)}
                  onChange={() =>
                    setFilters((p) => ({
                      ...p,
                      sectors: toggleArrayValue(p.sectors, s.value),
                    }))
                  }
                />
              ))}
            </div>
          </div>

          <div className="grid gap-2">
            <SectionTitle>Tipo de establecimiento</SectionTitle>
            <div className="grid grid-cols-2 gap-1">
              {establishmentOptions.map((t) => (
                <CheckboxRow
                  key={t.value}
                  label={t.label}
                  checked={filters.establishmentTypes.includes(t.value)}
                  onChange={() =>
                    setFilters((p) => ({
                      ...p,
                      establishmentTypes: toggleArrayValue(p.establishmentTypes, t.value),
                    }))
                  }
                />
              ))}
            </div>
          </div>

          <div className="grid gap-2">
            <SectionTitle>Nivel de ruralidad</SectionTitle>
            <div className="grid gap-2">
              <RadioRow
                label="Cualquiera"
                checked={!filters.rurality}
                onSelect={() => setFilters((p) => ({ ...p, rurality: null }))}
              />
              {ruralityOptions.map((r) => (
                <RadioRow
                  key={r}
                  label={r}
                  checked={filters.rurality === r}
                  onSelect={() => setFilters((p) => ({ ...p, rurality: r }))}
                />
              ))}
            </div>
          </div>

          <div className="grid gap-2">
            <SectionTitle>Servicios disponibles</SectionTitle>
            <div className="max-h-56 overflow-auto rounded-2xl border border-[var(--border)] bg-white p-1">
              {options.services.map((s) => (
                <CheckboxRow
                  key={s}
                  label={s}
                  checked={filters.services.includes(s)}
                  onChange={() =>
                    setFilters((p) => ({
                      ...p,
                      services: toggleArrayValue(p.services, s),
                    }))
                  }
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
