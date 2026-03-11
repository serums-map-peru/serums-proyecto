"use client";

import * as React from "react";

import { FiltersBar } from "@/features/hospitals/components/FiltersBar";
import { HospitalDetailPanel } from "@/features/hospitals/components/HospitalDetailPanel";
import { useHospitalFiltering } from "@/features/hospitals/hooks/useHospitalFiltering";
import { hospitalsMock } from "@/features/hospitals/mock/hospitals";
import { Hospital } from "@/features/hospitals/types";
import { HospitalMap } from "@/features/map/components/HospitalMap";
import { AppHeader } from "@/features/shell/components/AppHeader";
import { cn } from "@/shared/lib/cn";

function Legend() {
  const items = [
    { label: "MINSA", color: "#2A7DE1" },
    { label: "ESSALUD", color: "#2FBF71" },
    { label: "Militar", color: "#f59e0b" },
    { label: "Privado", color: "#8b5cf6" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-600">
      {items.map((i) => (
        <div key={i.label} className="flex items-center gap-2">
          <span
            className="inline-flex h-3 w-3 rounded-full border border-white shadow"
            style={{ backgroundColor: i.color }}
          />
          <span>{i.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function HomePage() {
  const { filters, setFilters, filteredHospitals, options } =
    useHospitalFiltering(hospitalsMock);

  const [filtersOpenMobile, setFiltersOpenMobile] = React.useState(false);
  const [selectedHospital, setSelectedHospital] = React.useState<Hospital | null>(null);
  const [detailOpen, setDetailOpen] = React.useState(false);

  React.useEffect(() => {
    if (!selectedHospital) return;
    const stillExists = filteredHospitals.some((h) => h.id === selectedHospital.id);
    if (!stillExists) {
      setSelectedHospital(null);
      setDetailOpen(false);
    }
  }, [filteredHospitals, selectedHospital]);

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader
        query={filters.query}
        onQueryChange={(value) => setFilters((p) => ({ ...p, query: value }))}
        onOpenFilters={() => setFiltersOpenMobile(true)}
      />

      <main className="mx-auto grid max-w-[1400px] gap-4 px-4 py-4 sm:grid-cols-[360px_1fr]">
        <div className="hidden sm:block">
          <FiltersBar filters={filters} setFilters={setFilters} options={options} />
        </div>

        <div className="flex min-h-[calc(100vh-112px)] flex-col gap-3">
          <div className="flex flex-col items-start justify-between gap-2 rounded-2xl border border-[var(--border)] bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center">
            <div className="grid gap-1">
              <div className="text-sm font-extrabold text-slate-900">
                {filteredHospitals.length} establecimientos
              </div>
              <div className="text-xs font-medium text-slate-500">
                Selecciona un marcador para ver el detalle.
              </div>
            </div>
            <Legend />
          </div>

          <div className="flex-1 min-h-[520px]">
            <HospitalMap
              hospitals={filteredHospitals}
              selectedHospitalId={selectedHospital?.id ?? null}
              onSelectHospital={(h) => {
                setSelectedHospital(h);
                setDetailOpen(true);
              }}
            />
          </div>
        </div>
      </main>

      <div
        className={cn(
          "fixed inset-0 z-[2500] sm:hidden",
          filtersOpenMobile ? "pointer-events-auto" : "pointer-events-none",
        )}
        aria-hidden={!filtersOpenMobile}
      >
        <div
          className={cn(
            "absolute inset-0 bg-slate-900/20 backdrop-blur-[1px] transition-opacity",
            filtersOpenMobile ? "opacity-100" : "opacity-0",
          )}
          onClick={() => setFiltersOpenMobile(false)}
        />
        <div
          className={cn(
            "absolute left-0 top-0 h-full w-[92%] max-w-[420px] p-3 transition-transform",
            filtersOpenMobile ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <FiltersBar
            filters={filters}
            setFilters={setFilters}
            options={options}
            onCloseMobile={() => setFiltersOpenMobile(false)}
          />
        </div>
      </div>

      <HospitalDetailPanel
        hospital={selectedHospital}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
      />
    </div>
  );
}
