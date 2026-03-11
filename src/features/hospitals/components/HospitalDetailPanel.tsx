"use client";

import * as React from "react";

import { Hospital } from "@/features/hospitals/types";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";

export type HospitalDetailPanelProps = {
  hospital: Hospital | null;
  open: boolean;
  onClose: () => void;
};

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid gap-1">
      <div className="text-xs font-semibold text-slate-500">{label}</div>
      <div className="text-sm font-medium text-slate-900">{value}</div>
    </div>
  );
}

function Badge({
  children,
  tone = "blue",
}: {
  children: React.ReactNode;
  tone?: "blue" | "green" | "gray";
}) {
  const toneClass =
    tone === "green"
      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
      : tone === "gray"
        ? "bg-slate-50 text-slate-700 border-slate-200"
        : "bg-blue-50 text-blue-800 border-blue-200";

  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold", toneClass)}>
      {children}
    </span>
  );
}

export function HospitalDetailPanel({ hospital, open, onClose }: HospitalDetailPanelProps) {
  return (
    <div
      className={cn(
        "fixed inset-0 z-[3000]",
        open ? "pointer-events-auto" : "pointer-events-none",
      )}
      aria-hidden={!open}
    >
      <div
        className={cn(
          "absolute inset-0 bg-slate-900/20 backdrop-blur-[1px] transition-opacity",
          open ? "opacity-100" : "opacity-0",
        )}
        onClick={onClose}
      />

      <div
        className={cn(
          "absolute right-0 top-0 h-full w-full max-w-[480px] p-3 transition-transform sm:p-4",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <Card className="flex h-full flex-col overflow-hidden">
          <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-500">Detalle del establecimiento</div>
              <div className="truncate text-base font-extrabold text-slate-900">
                {hospital ? hospital.name : "Selecciona un hospital"}
              </div>
            </div>
            <Button variant="secondary" size="sm" onClick={onClose}>
              Cerrar
            </Button>
          </div>

          {hospital ? (
            <div className="flex h-full flex-col overflow-auto">
              <div className="px-4 pt-4">
                <div className="aspect-[16/9] overflow-hidden rounded-2xl border border-[var(--border)] bg-gradient-to-br from-blue-50 to-emerald-50">
                  <div className="flex h-full items-center justify-center text-sm font-semibold text-slate-500">
                    Foto (placeholder)
                  </div>
                </div>
              </div>

              <div className="grid gap-4 px-4 py-4">
                <div className="flex flex-wrap gap-2">
                  <Badge tone="blue">{hospital.sector}</Badge>
                  <Badge tone="gray">{hospital.establishmentType}</Badge>
                  <Badge tone="green">Ruralidad: {hospital.rurality}</Badge>
                </div>

                <div className="grid gap-3 rounded-2xl border border-[var(--border)] bg-white p-4">
                  <Field label="Dirección" value={hospital.address} />
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <Field label="Región" value={hospital.region} />
                    <Field label="Provincia" value={hospital.province} />
                    <Field label="Distrito" value={hospital.district} />
                  </div>
                </div>

                <div className="grid gap-2">
                  <div className="text-xs font-bold uppercase tracking-wide text-slate-600">
                    Servicios disponibles
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {hospital.services.map((s) => (
                      <span
                        key={s}
                        className="inline-flex items-center rounded-full border border-[var(--border)] bg-white px-3 py-1 text-xs font-semibold text-slate-700"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="grid gap-2">
                  <Button variant="secondary" className="w-full">
                    Qué hay cerca
                  </Button>
                  <Button variant="primary" className="w-full">
                    Ver cómo llegar
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center px-8 text-center text-sm text-slate-500">
              Haz clic en un marcador del mapa para ver la información.
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
