"use client";

import * as React from "react";
import Image from "next/image";

import { Hospital } from "@/features/hospitals/types";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";

export type HospitalDetailPanelProps = {
  hospital: Hospital | null;
  loading?: boolean;
  error?: string | null;
  open: boolean;
  onClose: () => void;
  routeLoading?: boolean;
  routeError?: string | null;
  nearbyLoading?: boolean;
  nearbyError?: string | null;
  onRequestRoute?: () => void;
  onRequestNearby?: () => void;
};

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid gap-1">
      <div className="text-xs font-semibold text-slate-500">{label}</div>
      <div className="text-sm font-medium text-slate-900">{value}</div>
    </div>
  );
}

export function HospitalDetailPanel({
  hospital,
  loading = false,
  error = null,
  open,
  onClose,
  routeLoading = false,
  routeError = null,
  nearbyLoading = false,
  nearbyError = null,
  onRequestRoute,
  onRequestNearby,
}: HospitalDetailPanelProps) {
  const imageUrl = hospital && hospital.imagenes && hospital.imagenes.length > 0 ? hospital.imagenes[0] : null;
  const [imageOk, setImageOk] = React.useState(true);

  React.useEffect(() => {
    setImageOk(true);
  }, [imageUrl]);

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
                {hospital ? hospital.nombre_establecimiento : "Selecciona un establecimiento"}
              </div>
            </div>
            <Button variant="secondary" size="sm" onClick={onClose}>
              Cerrar
            </Button>
          </div>

          {loading ? (
            <div className="flex h-full items-center justify-center px-8 text-center text-sm text-slate-500">
              Cargando detalle…
            </div>
          ) : error ? (
            <div className="flex h-full items-center justify-center px-8 text-center text-sm text-slate-700">
              {error}
            </div>
          ) : hospital ? (
            <div className="flex h-full flex-col overflow-auto">
              <div className="px-4 pt-4">
                <div className="aspect-[16/9] overflow-hidden rounded-2xl border border-[var(--border)] bg-gradient-to-br from-blue-50 to-emerald-50">
                  {imageUrl && imageOk ? (
                    <div className="relative h-full w-full">
                      <Image
                        src={imageUrl}
                        alt={hospital.nombre_establecimiento || "Imagen del establecimiento"}
                        fill
                        sizes="480px"
                        className="object-cover"
                        unoptimized
                        onError={() => setImageOk(false)}
                      />
                    </div>
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm font-semibold text-slate-500">
                      Sin foto
                    </div>
                  )}
                </div>
              </div>

              <div className="grid gap-4 px-4 py-4">
                <div className="grid gap-3 rounded-2xl border border-[var(--border)] bg-white p-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Field
                      label="Profesión"
                      value={
                        hospital.profesiones && hospital.profesiones.length > 0
                          ? hospital.profesiones.join(" · ")
                          : hospital.profesion || "—"
                      }
                    />
                    <Field label="Institución" value={hospital.institucion || "—"} />
                    <Field label="Departamento" value={hospital.departamento || "—"} />
                    <Field label="Provincia" value={hospital.provincia || "—"} />
                    <Field label="Distrito" value={hospital.distrito || "—"} />
                    <Field label="Grado de dificultad" value={hospital.grado_dificultad || "—"} />
                    <Field
                      label="Código RENIPRESS modular"
                      value={hospital.codigo_renipress_modular || "—"}
                    />
                    <Field
                      label="Coordenadas"
                      value={`${hospital.lat.toFixed(6)}, ${hospital.lng.toFixed(6)}`}
                    />
                    <Field
                      label="Fuente coordenadas"
                      value={
                        hospital.coordenadas_fuente
                          ? hospital.coordenadas_fuente === "RENIPRESS"
                            ? "RENIPRESS (exacta)"
                            : `${hospital.coordenadas_fuente} (aprox)`
                          : "—"
                      }
                    />
                    <Field
                      label="Nombre de establecimiento"
                      value={hospital.nombre_establecimiento || "—"}
                    />
                    <Field label="Presupuesto" value={hospital.presupuesto || "—"} />
                    <Field label="Categoría" value={hospital.categoria || "—"} />
                    <Field label="ZAF" value={hospital.zaf || "—"} />
                    <Field label="ZE" value={hospital.ze || "—"} />
                  </div>
                </div>

                <div className="grid gap-2">
                  {(routeError || nearbyError) && (
                    <div className="rounded-2xl border border-[var(--border)] bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                      {routeError || nearbyError}
                    </div>
                  )}
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={onRequestNearby}
                    disabled={!onRequestNearby || nearbyLoading}
                  >
                    {nearbyLoading ? "Buscando cerca…" : "Qué hay cerca"}
                  </Button>
                  <Button
                    variant="primary"
                    className="w-full"
                    onClick={onRequestRoute}
                    disabled={!onRequestRoute || routeLoading}
                  >
                    {routeLoading ? "Calculando ruta…" : "Ver cómo llegar"}
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
