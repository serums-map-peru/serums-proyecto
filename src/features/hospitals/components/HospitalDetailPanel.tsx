"use client";

import * as React from "react";
import Image from "next/image";

import { Hospital, NearbyPlace, NearbyPlacesResponse, RouteResponse } from "@/features/hospitals/types";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";

type TravelMode = "carro" | "pie" | "avion";

export type HospitalDetailPanelProps = {
  hospital: Hospital | null;
  loading?: boolean;
  error?: string | null;
  open: boolean;
  onClose: () => void;
  route?: RouteResponse | null;
  routeLoading?: boolean;
  routeError?: string | null;
  flightEstimate?: { distancia: number; duracion: number } | null;
  nearestAirport?: NearbyPlace | null;
  nearestAirportDistanceMeters?: number | null;
  airportDriveRoute?: RouteResponse | null;
  airportLoading?: boolean;
  airportError?: string | null;
  travelMode: TravelMode;
  onChangeTravelMode: (mode: TravelMode) => void;
  activeTripMode?: TravelMode | null;
  directDistanceMeters?: number | null;
  nearby?: NearbyPlacesResponse | null;
  nearbyLoading?: boolean;
  nearbyError?: string | null;
  geocodeLoading?: boolean;
  geocodeError?: string | null;
  geocodeMessage?: string | null;
  onRequestRoute?: () => void;
  onRequestNearby?: () => void;
  onRequestGeocode?: () => void;
};

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid gap-1">
      <div className="text-xs font-semibold text-slate-500">{label}</div>
      <div className="text-sm font-medium text-slate-900">{value}</div>
    </div>
  );
}

function formatDistance(meters: number) {
  if (!Number.isFinite(meters)) return "—";
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds)) return "—";
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

function mapsUrlForPlace(p: NearbyPlace) {
  const name = p.name ? ` ${p.name}` : "";
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${p.lat},${p.lon}${name}`)}`;
}

function toTitleCase(value: string) {
  return (value || "")
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path d="M18 6 6 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M6 6l12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="M20.3 7.6a4.6 4.6 0 0 0-6.5 0L12 9.4l-1.8-1.8a4.6 4.6 0 0 0-6.5 6.5l1.8 1.8L12 21l6.5-5.1 1.8-1.8a4.6 4.6 0 0 0 0-6.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TravelIcon({ mode }: { mode: TravelMode }) {
  if (mode === "avion") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
        <path
          d="M2.5 12l19-7-6.2 18.5-3.2-7.1L2.5 12Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path d="M21.5 5 12.1 16.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }
  if (mode === "pie") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
        <path d="M13 5.5a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M10.5 8.5 8.2 12.1c-.3.5-.3 1.1 0 1.6l2 3.3M12.4 9.2l3.1 2.2c.4.3.6.8.6 1.3V19M7 21l3-4M14 21l2-4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
      <path
        d="M3.5 13.5V11.2c0-.7.4-1.4 1-1.7l2.2-1.1 1.1-2.6C8.1 4.9 8.9 4.3 9.8 4.3h4.4c.9 0 1.7.6 2 1.5l1.1 2.6 2.2 1.1c.6.3 1 .9 1 1.7v2.3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path d="M6.5 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M17.5 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3.5 13.5h17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid gap-1">
      <div className="text-xs font-medium text-[var(--label)]">{label}</div>
      <div className="text-sm font-medium text-[var(--title)]">{value}</div>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-full bg-black/[0.03] px-3 py-2 text-xs font-medium text-[var(--title)]">{children}</div>
  );
}

export function HospitalDetailPanel({
  hospital,
  loading = false,
  error = null,
  open,
  onClose,
  route = null,
  routeLoading = false,
  routeError = null,
  flightEstimate = null,
  nearestAirport = null,
  nearestAirportDistanceMeters = null,
  airportDriveRoute = null,
  airportLoading = false,
  airportError = null,
  travelMode,
  onChangeTravelMode,
  activeTripMode = null,
  directDistanceMeters = null,
  nearby = null,
  nearbyLoading = false,
  nearbyError = null,
  geocodeLoading = false,
  geocodeError = null,
  geocodeMessage = null,
  onRequestRoute,
  onRequestNearby,
  onRequestGeocode,
}: HospitalDetailPanelProps) {
  const imageUrl = hospital && hospital.imagenes && hospital.imagenes.length > 0 ? hospital.imagenes[0] : null;
  const [imageOk, setImageOk] = React.useState(true);
  const [tab, setTab] = React.useState<"info" | "como-llegar">("info");
  const [moreOpen, setMoreOpen] = React.useState(false);
  const [technicalOpen, setTechnicalOpen] = React.useState(false);
  const [sheet, setSheet] = React.useState<"collapsed" | "medium" | "full">("medium");
  const modeForSummary = activeTripMode ?? travelMode;

  React.useEffect(() => {
    setImageOk(true);
  }, [imageUrl]);

  React.useEffect(() => {
    if (!open) return;
    setTab("info");
    setMoreOpen(false);
    setTechnicalOpen(false);
    setSheet("medium");
  }, [open, hospital?.id]);

  const fullName = hospital?.nombre_establecimiento ? toTitleCase(hospital.nombre_establecimiento) : "";
  const fullLocation = hospital ? `${hospital.distrito} · ${hospital.provincia} · ${hospital.departamento}` : "";
  const profesion = hospital
    ? hospital.profesiones && hospital.profesiones.length > 0
      ? hospital.profesiones.join(" · ")
      : hospital.profesion || "—"
    : "—";
  const plazasTotal =
    hospital && hospital.serums_resumen && hospital.serums_resumen.length > 0
      ? hospital.serums_resumen.reduce((acc, r) => acc + (Number.isFinite(r.plazas_total) ? r.plazas_total : 0), 0)
      : null;

  const summaryMetric = React.useMemo(() => {
    if (modeForSummary === "avion") {
      const dur = flightEstimate ? formatDuration(flightEstimate.duracion) : "—";
      const dist = flightEstimate
        ? formatDistance(flightEstimate.distancia)
        : directDistanceMeters != null
          ? formatDistance(directDistanceMeters)
          : "—";
      return { primary: dur, secondary: dist, label: "Vuelo" };
    }
    const dur = route ? formatDuration(route.duracion) : "—";
    const dist = route ? formatDistance(route.distancia) : directDistanceMeters != null ? formatDistance(directDistanceMeters) : "—";
    return { primary: dur, secondary: dist, label: modeForSummary === "pie" ? "A pie" : "Carro" };
  }, [directDistanceMeters, flightEstimate, modeForSummary, route]);

  const sheetHeight = sheet === "collapsed" ? "25vh" : sheet === "full" ? "100vh" : "50vh";

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
          "absolute inset-0 bg-black/20 transition-opacity",
          open ? "opacity-100" : "opacity-0",
        )}
        onClick={onClose}
      />

      <div
        className={cn(
          "absolute bottom-0 left-0 right-0 p-3 transition-transform sm:bottom-auto sm:left-auto sm:right-0 sm:top-0 sm:h-full sm:w-full sm:max-w-[480px] sm:p-4",
          open ? "translate-y-0 sm:translate-x-0" : "translate-y-full sm:translate-x-full",
        )}
      >
        <Card
          className={cn(
            "flex h-[var(--sheet-h)] max-h-[var(--sheet-h)] flex-col overflow-hidden bg-white sm:h-full sm:max-h-none",
            open ? "serums-panel-anim-right sm:serums-panel-anim-right" : "",
          )}
          style={{ ["--sheet-h" as never]: sheetHeight } as React.CSSProperties}
        >
          <div className="sm:hidden">
            <button
              type="button"
              className="flex w-full items-center justify-center py-2"
              onClick={() => setSheet((v) => (v === "collapsed" ? "medium" : v === "medium" ? "full" : "collapsed"))}
              aria-label="Cambiar tamaño del panel"
            >
              <div className="h-1.5 w-14 rounded-full bg-black/15" />
            </button>
          </div>

          <div className="border-b border-[var(--border)] bg-white px-5 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="line-clamp-2 text-base font-semibold text-[var(--title)]">
                  {fullName || "Selecciona un establecimiento"}
                </div>
                <div className="mt-0.5 line-clamp-1 text-xs font-medium text-[var(--label)]">
                  {hospital ? fullLocation : "Haz clic en un marcador del mapa."}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <div className="rounded-full bg-black/[0.03] px-3 py-1.5 text-xs font-semibold text-[var(--title)]">
                    {summaryMetric.primary} · {summaryMetric.secondary}
                  </div>
                  <div className="rounded-full bg-black/[0.03] px-3 py-1.5 text-xs font-medium text-[var(--label)]">
                    {summaryMetric.label}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-white text-[var(--title)] shadow-[var(--shadow-soft)] hover:bg-black/[0.03]"
                  aria-label="Agregar a favoritos"
                  title="Agregar a favoritos"
                >
                  <HeartIcon />
                </button>
                <button
                  type="button"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-white text-[var(--title)] shadow-[var(--shadow-soft)] hover:bg-black/[0.03]"
                  onClick={onClose}
                  aria-label="Cerrar"
                  title="Cerrar"
                >
                  <CloseIcon />
                </button>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                className={cn(
                  "h-9 rounded-full border text-sm font-medium shadow-[0_1px_0_rgba(0,0,0,0.04)] transition-colors",
                  tab === "info"
                    ? "border-black/10 bg-black/[0.04] text-[var(--title)]"
                    : "border-[var(--border)] bg-white text-[var(--label)] hover:bg-black/[0.03]",
                )}
                onClick={() => setTab("info")}
              >
                Información
              </button>
              <button
                type="button"
                className={cn(
                  "h-9 rounded-full border text-sm font-medium shadow-[0_1px_0_rgba(0,0,0,0.04)] transition-colors",
                  tab === "como-llegar"
                    ? "border-black/10 bg-black/[0.04] text-[var(--title)]"
                    : "border-[var(--border)] bg-white text-[var(--label)] hover:bg-black/[0.03]",
                )}
                onClick={() => setTab("como-llegar")}
              >
                Cómo llegar
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex h-full items-center justify-center px-8 text-center text-sm text-[var(--label)]">
              Cargando detalle…
            </div>
          ) : error ? (
            <div className="flex h-full items-center justify-center px-8 text-center text-sm text-[var(--title)]">
              {error}
            </div>
          ) : hospital ? (
            <div className="flex h-full min-h-0 flex-col">
              <div className="flex-1 min-h-0 overflow-auto px-5 py-4">
                {tab === "info" ? (
                  <div className="grid gap-3">
                    {imageUrl && imageOk ? (
                      <div className="overflow-hidden rounded-[var(--radius-panel)] border border-[var(--border)] bg-white shadow-[var(--shadow-soft)]">
                        <div className="relative aspect-[16/9]">
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
                      </div>
                    ) : null}

                    <div className="rounded-[var(--radius-panel)] border border-[var(--border)] bg-white px-4 py-4 shadow-[var(--shadow-soft)]">
                      <div className="grid gap-3">
                        <InfoRow label="Ubicación" value={fullLocation || "—"} />
                        <InfoRow label="Profesión requerida" value={profesion} />
                        <InfoRow label="Institución" value={hospital.institucion || "—"} />
                        <InfoRow label="GD" value={hospital.grado_dificultad || "—"} />
                        <InfoRow
                          label="Plazas SERUMS disponibles"
                          value={plazasTotal != null ? plazasTotal : hospital.serums_resumen && hospital.serums_resumen.length > 0 ? "—" : "—"}
                        />
                      </div>
                    </div>

                    <div className="rounded-[var(--radius-panel)] border border-[var(--border)] bg-white px-4 py-4 shadow-[var(--shadow-soft)]">
                      <button
                        type="button"
                        className="flex w-full items-center justify-between gap-3"
                        onClick={() => setMoreOpen((v) => !v)}
                        aria-expanded={moreOpen}
                      >
                        <div className="text-sm font-semibold text-[var(--title)]">Ver más</div>
                        <div className="text-xs font-medium text-[var(--label)]">{moreOpen ? "Ocultar" : "Mostrar"}</div>
                      </button>

                      <div
                        className="overflow-hidden transition-[max-height,opacity] duration-300 ease-out"
                        style={{ maxHeight: moreOpen ? 520 : 0, opacity: moreOpen ? 1 : 0 }}
                      >
                        <div className="mt-3 grid gap-3">
                          <div className="flex flex-wrap gap-2">
                            {hospital.zaf === "SI" ? <Chip>ZAF</Chip> : null}
                            {hospital.ze === "SI" ? <Chip>ZE</Chip> : null}
                          </div>
                          {hospital.presupuesto ? <InfoRow label="Presupuesto" value={hospital.presupuesto} /> : null}

                          {hospital.serums_resumen && hospital.serums_resumen.length > 0 ? (
                            <div className="rounded-[var(--radius-card)] bg-black/[0.02] px-3 py-3">
                              <div className="text-xs font-semibold text-[var(--title)]">Plazas por periodo</div>
                              <div className="mt-2 grid gap-1">
                                {hospital.serums_resumen.map((r) => (
                                  <div
                                    key={`${r.periodo}-${r.modalidad}`}
                                    className="flex items-center justify-between gap-3 rounded-xl px-2 py-2 hover:bg-black/[0.03]"
                                  >
                                    <div className="text-xs font-medium text-[var(--label)]">
                                      {r.periodo} · {r.modalidad.charAt(0).toUpperCase() + r.modalidad.slice(1)}
                                    </div>
                                    <div className="text-sm font-semibold text-[var(--title)]">{r.plazas_total}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null}

                          <button
                            type="button"
                            className="w-fit rounded-full bg-black/[0.03] px-3 py-2 text-xs font-medium text-[var(--title)] hover:bg-black/[0.06]"
                            onClick={() => setTechnicalOpen((v) => !v)}
                            aria-expanded={technicalOpen}
                          >
                            Datos técnicos
                          </button>
                          <div
                            className="overflow-hidden rounded-[var(--radius-card)] bg-black/[0.02] transition-[max-height,opacity] duration-300 ease-out"
                            style={{ maxHeight: technicalOpen ? 220 : 0, opacity: technicalOpen ? 1 : 0 }}
                          >
                            <div className="grid gap-3 px-4 py-3">
                              <InfoRow label="Código RENIPRESS modular" value={hospital.codigo_renipress_modular || "—"} />
                              <InfoRow label="Coordenadas" value={`${hospital.lat.toFixed(6)}, ${hospital.lng.toFixed(6)}`} />
                              <Button
                                variant="secondary"
                                className="w-full"
                                onClick={onRequestGeocode}
                                disabled={!onRequestGeocode || geocodeLoading}
                              >
                                {geocodeLoading ? "Corrigiendo ubicación…" : geocodeError ? "Reintentar corrección" : "Corregir ubicación"}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[var(--radius-panel)] border border-[var(--border)] bg-white px-4 py-4 shadow-[var(--shadow-soft)]">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-[var(--title)]">Qué hay cerca</div>
                          <div className="text-xs font-medium text-[var(--label)]">Explora servicios en el área.</div>
                        </div>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={onRequestNearby}
                          disabled={!onRequestNearby || nearbyLoading}
                        >
                          {nearbyLoading ? "Buscando…" : nearby ? "Actualizar" : "Buscar"}
                        </Button>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <Chip>Restaurantes</Chip>
                        <Chip>Farmacias</Chip>
                        <Chip>Bancos</Chip>
                        <Chip>Gimnasios</Chip>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <Chip>1 km</Chip>
                        <Chip>2 km</Chip>
                        <Chip>5 km</Chip>
                      </div>

                      {nearby ? (
                        <div className="mt-3 grid gap-2">
                          {[
                            ...nearby.hospedajes.map((p) => ({ p, group: "Hospedaje" })),
                            ...nearby.restaurantes.map((p) => ({ p, group: "Restaurante" })),
                            ...nearby.farmacias.map((p) => ({ p, group: "Farmacia" })),
                            ...nearby.tiendas.map((p) => ({ p, group: "Tienda" })),
                            ...nearby.comisarias.map((p) => ({ p, group: "Comisaría" })),
                          ]
                            .slice(0, 10)
                            .map(({ p, group }, idx) => (
                              <a
                                key={p.id}
                                href={mapsUrlForPlace(p)}
                                target="_blank"
                                rel="noreferrer"
                                className="group flex items-start gap-3 rounded-[var(--radius-card)] bg-black/[0.02] px-3 py-3 hover:bg-black/[0.04]"
                              >
                                <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white text-xs font-semibold text-[var(--title)] shadow-[0_1px_0_rgba(0,0,0,0.04)]">
                                  {idx + 1}
                                </div>
                                <div className="min-w-0">
                                  <div className="line-clamp-1 text-sm font-semibold text-[var(--title)]">{p.name || "Lugar"}</div>
                                  <div className="line-clamp-1 text-xs font-medium text-[var(--label)]">{group}</div>
                                </div>
                              </a>
                            ))}
                        </div>
                      ) : (
                        <div className="mt-3 text-xs font-medium text-[var(--label)]">Selecciona Buscar para ver resultados.</div>
                      )}
                    </div>

                    {(nearbyError || geocodeError || geocodeMessage) && (
                      <div className="rounded-[var(--radius-panel)] border border-[var(--border)] bg-white px-4 py-3 text-sm font-medium text-[var(--title)] shadow-[var(--shadow-soft)]">
                        {nearbyError || geocodeError || geocodeMessage}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid gap-3">
                    <div className="rounded-[var(--radius-panel)] border border-[var(--border)] bg-white px-4 py-4 shadow-[var(--shadow-soft)]">
                      <div className="text-sm font-semibold text-[var(--title)]">Modo</div>
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        {(["carro", "pie", "avion"] as const).map((m) => (
                          <button
                            key={m}
                            type="button"
                            className={cn(
                              "flex h-10 items-center justify-center gap-2 rounded-full border text-sm font-medium transition-colors",
                              travelMode === m
                                ? "border-black/10 bg-black/[0.04] text-[var(--title)]"
                                : "border-[var(--border)] bg-white text-[var(--label)] hover:bg-black/[0.03]",
                            )}
                            onClick={() => onChangeTravelMode(m)}
                          >
                            <TravelIcon mode={m} />
                            {m === "carro" ? "Carro" : m === "pie" ? "A pie" : "Avión"}
                          </button>
                        ))}
                      </div>
                      <div className="mt-3 text-xs font-medium text-[var(--label)]">
                        Tiempo estimado sin considerar tráfico.
                      </div>
                    </div>

                    <div className="rounded-[var(--radius-panel)] border border-[var(--border)] bg-white px-4 py-4 shadow-[var(--shadow-soft)]">
                      <div className="text-xs font-semibold text-[var(--label)]">Tramo 1</div>
                      <div className="mt-1 text-sm font-semibold text-[var(--title)]">Vuelo al aeropuerto más cercano</div>
                      <div className="mt-2 rounded-[var(--radius-card)] bg-black/[0.02] px-3 py-3">
                        <div className="text-xs font-medium text-[var(--label)]">Aeropuerto</div>
                        <div className="mt-0.5 text-sm font-medium text-[var(--title)]">
                          {nearestAirport ? nearestAirport.name || "Aeropuerto" : "Aeropuerto más cercano"}
                        </div>
                        <div className="mt-1 text-xs font-medium text-[var(--label)]">
                          {flightEstimate ? `${formatDuration(flightEstimate.duracion)} · ${formatDistance(flightEstimate.distancia)}` : "—"}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[var(--radius-panel)] border border-[var(--border)] bg-white px-4 py-4 shadow-[var(--shadow-soft)]">
                      <div className="text-xs font-semibold text-[var(--label)]">Tramo 2</div>
                      <div className="mt-1 text-sm font-semibold text-[var(--title)]">Ruta terrestre destacada</div>
                      <div className="mt-2 rounded-[var(--radius-card)] bg-black/[0.02] px-3 py-3">
                        <div className="text-xs font-medium text-[var(--label)]">Ruta</div>
                        <div className="mt-0.5 text-sm font-medium text-[var(--title)]">
                          {airportDriveRoute ? `${formatDuration(airportDriveRoute.duracion)} · ${formatDistance(airportDriveRoute.distancia)}` : "—"}
                        </div>
                        {nearestAirportDistanceMeters != null ? (
                          <div className="mt-1 text-xs font-medium text-[var(--label)]">
                            Aeropuerto → establecimiento: {formatDistance(nearestAirportDistanceMeters)}
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Button variant="primary" className="w-full" onClick={onRequestRoute} disabled={!onRequestRoute || routeLoading}>
                        {routeLoading ? "Calculando…" : routeError ? "Reintentar" : "Mostrar ruta en el mapa"}
                      </Button>
                      {airportError || routeError ? (
                        <div className="rounded-[var(--radius-panel)] bg-black/[0.02] px-4 py-3 text-sm font-medium text-[var(--title)]">
                          {airportError || routeError}
                        </div>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center px-8 text-center text-sm text-[var(--label)]">
              Haz clic en un marcador del mapa para ver la información.
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
