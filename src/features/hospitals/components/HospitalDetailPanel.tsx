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

function PlaceList({ title, items }: { title: string; items: NearbyPlace[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-white px-4 py-3">
      <div className="text-xs font-semibold text-slate-500">{title}</div>
      <div className="mt-2 grid gap-2">
        {items.slice(0, 5).map((p) => (
          <a
            key={p.id}
            href={mapsUrlForPlace(p)}
            target="_blank"
            rel="noreferrer"
            className="rounded-2xl border border-[var(--border)] bg-white px-3 py-2 text-left shadow-sm hover:bg-slate-50"
          >
            <div className="line-clamp-1 text-sm font-extrabold text-slate-900">{p.name || "Lugar"}</div>
            <div className="line-clamp-1 text-xs font-semibold text-slate-600">
              {String(
                (p.tags as Record<string, unknown>)["amenity"] ||
                  (p.tags as Record<string, unknown>)["tourism"] ||
                  (p.tags as Record<string, unknown>)["shop"] ||
                  "",
              )}
            </div>
          </a>
        ))}
      </div>
    </div>
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
  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const modeForCards = activeTripMode;
  const modeForSummary = activeTripMode ?? travelMode;

  React.useEffect(() => {
    setImageOk(true);
  }, [imageUrl]);

  React.useEffect(() => {
    if (!open) return;
    setDetailsOpen(false);
  }, [open, hospital?.id]);

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
            "absolute inset-0 bg-slate-900/20 transition-opacity",
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
        <Card className="flex h-full flex-col overflow-hidden bg-sky-50">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] bg-white px-4 py-3">
            <div className="min-w-0">
              <div className="text-lg font-extrabold text-slate-900">Cómo llegar</div>
              <div className="truncate text-xs font-semibold text-slate-500">
                {hospital ? hospital.nombre_establecimiento : "Selecciona un establecimiento"}
              </div>
            </div>
            <Button variant="secondary" size="sm" onClick={onClose} aria-label="Cerrar">
              ✕
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
            <div className="flex h-full min-h-0 flex-col">
              <div className="flex-1 min-h-0 overflow-auto px-4 py-4">
                <div className="grid gap-3">
                  <div className="rounded-3xl border border-[var(--border)] bg-white px-4 py-3">
                    <div className="text-xs font-semibold text-slate-500">Destino</div>
                    <div className="mt-0.5 line-clamp-2 text-sm font-extrabold text-slate-900">
                      {hospital.nombre_establecimiento || "—"}
                    </div>
                    <div className="mt-1 text-xs font-semibold text-slate-600">
                      {hospital.distrito} · {hospital.provincia} · {hospital.departamento}
                    </div>
                  </div>

                  <div className="rounded-3xl border border-[var(--border)] bg-white px-4 py-3">
                    <div className="text-xs font-semibold text-slate-500">Modo</div>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      <Button
                        size="sm"
                        variant={travelMode === "carro" ? "primary" : "secondary"}
                        className="w-full"
                        onClick={() => onChangeTravelMode("carro")}
                      >
                        <span className="flex items-center justify-center gap-2">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path
                              d="M3.5 13.5V11.2c0-.7.4-1.4 1-1.7l2.2-1.1 1.1-2.6C8.1 4.9 8.9 4.3 9.8 4.3h4.4c.9 0 1.7.6 2 1.5l1.1 2.6 2.2 1.1c.6.3 1 .9 1 1.7v2.3"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                            />
                            <path
                              d="M6.5 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM17.5 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"
                              stroke="currentColor"
                              strokeWidth="2"
                            />
                            <path
                              d="M3.5 13.5h17"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                            />
                          </svg>
                          Carro
                        </span>
                      </Button>
                      <Button
                        size="sm"
                        variant={travelMode === "pie" ? "primary" : "secondary"}
                        className="w-full"
                        onClick={() => onChangeTravelMode("pie")}
                      >
                        <span className="flex items-center justify-center gap-2">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path
                              d="M13 5.5a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z"
                              stroke="currentColor"
                              strokeWidth="2"
                            />
                            <path
                              d="M10.5 8.5 8.2 12.1c-.3.5-.3 1.1 0 1.6l2 3.3M12.4 9.2l3.1 2.2c.4.3.6.8.6 1.3V19M7 21l3-4M14 21l2-4"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                          A pie
                        </span>
                      </Button>
                      <Button
                        size="sm"
                        variant={travelMode === "avion" ? "primary" : "secondary"}
                        className="w-full"
                        onClick={() => onChangeTravelMode("avion")}
                      >
                        <span className="flex items-center justify-center gap-2">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path
                              d="M2.5 12l19-7-6.2 18.5-3.2-7.1L2.5 12Z"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinejoin="round"
                            />
                            <path
                              d="M21.5 5 12.1 16.4"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                            />
                          </svg>
                          Avión
                        </span>
                      </Button>
                    </div>
                  </div>

                  {modeForCards === "avion" ? (
                    <div className="grid gap-3">
                      {flightEstimate ? (
                        <div className="rounded-3xl border border-[var(--border)] bg-white px-4 py-3">
                          <div className="text-xs font-semibold text-slate-500">Vuelo estimado</div>
                          <div className="mt-0.5 text-sm font-extrabold text-slate-900">
                            {formatDistance(flightEstimate.distancia)} · {formatDuration(flightEstimate.duracion)}
                          </div>
                          <div className="mt-1 text-xs font-semibold text-slate-500">Línea recta (aprox.)</div>
                        </div>
                      ) : null}

                      <div className="rounded-3xl border border-[var(--border)] bg-white px-4 py-3">
                        <div className="text-xs font-semibold text-slate-500">Aeropuerto más cercano</div>
                        {airportLoading ? (
                          <div className="mt-1 text-sm font-extrabold text-slate-900">Buscando aeropuerto…</div>
                        ) : airportError ? (
                          <div className="mt-1 text-sm font-extrabold text-slate-900">{airportError}</div>
                        ) : nearestAirport ? (
                          <div className="mt-1 grid gap-1">
                            <a
                              href={mapsUrlForPlace(nearestAirport)}
                              target="_blank"
                              rel="noreferrer"
                              className="line-clamp-1 text-sm font-extrabold text-slate-900 underline"
                            >
                              {nearestAirport.name || "Aeropuerto"}
                            </a>
                            {nearestAirportDistanceMeters != null ? (
                              <div className="text-xs font-semibold text-slate-600">
                                A {formatDistance(nearestAirportDistanceMeters)} del establecimiento
                              </div>
                            ) : null}
                            {airportDriveRoute ? (
                              <div className="text-xs font-semibold text-slate-600">
                                En carro desde aeropuerto: {formatDistance(airportDriveRoute.distancia)} ·{" "}
                                {formatDuration(airportDriveRoute.duracion)}
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          <div className="mt-1 text-sm font-extrabold text-slate-900">
                            No se encontró un aeropuerto cercano.
                          </div>
                        )}
                      </div>
                    </div>
                  ) : modeForCards === "pie" || modeForCards === "carro" ? (
                    <div className="rounded-3xl border border-[var(--border)] bg-white px-4 py-3">
                      <div className="text-xs font-semibold text-slate-500">
                        {modeForCards === "pie" ? "Ruta estimada (a pie)" : "Ruta estimada (carro)"}
                      </div>
                      {route ? (
                        <div className="mt-0.5 text-sm font-extrabold text-slate-900">
                          {formatDistance(route.distancia)} · {formatDuration(route.duracion)}
                        </div>
                      ) : (
                        <div className="mt-0.5 text-sm font-extrabold text-slate-900">—</div>
                      )}
                    </div>
                  ) : directDistanceMeters != null ? (
                    <div className="rounded-3xl border border-[var(--border)] bg-white px-4 py-3">
                      <div className="text-xs font-semibold text-slate-500">Distancia directa</div>
                      <div className="mt-0.5 text-sm font-extrabold text-slate-900">
                        {formatDistance(directDistanceMeters)}
                      </div>
                    </div>
                  ) : null}

                  {(routeError || nearbyError || geocodeError || geocodeMessage) && (
                    <div className="rounded-3xl border border-[var(--border)] bg-white px-4 py-3 text-sm font-semibold text-slate-700">
                      {routeError || nearbyError || geocodeError || geocodeMessage}
                    </div>
                  )}

                  <div className="rounded-3xl border border-[var(--border)] bg-white px-4 py-3">
                    <Button
                      variant="secondary"
                      className="w-full"
                      onClick={() => setDetailsOpen((v) => !v)}
                    >
                      {detailsOpen ? "Ocultar detalles" : "Ver detalles del puesto"}
                    </Button>

                    {detailsOpen ? (
                      <div className="mt-3 grid gap-3">
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
                          <Field label="Grado de dificultad" value={hospital.grado_dificultad || "—"} />
                          <Field label="Presupuesto" value={hospital.presupuesto || "—"} />
                          <Field label="Categoría" value={hospital.categoria || "—"} />
                          <Field label="ZAF" value={hospital.zaf || "—"} />
                          <Field label="ZE" value={hospital.ze || "—"} />
                          <Field label="Código RENIPRESS modular" value={hospital.codigo_renipress_modular || "—"} />
                          <Field label="Coordenadas" value={`${hospital.lat.toFixed(6)}, ${hospital.lng.toFixed(6)}`} />
                          {hospital.serums_resumen && hospital.serums_resumen.length > 0 ? (
                            <div className="sm:col-span-2 rounded-2xl border border-[var(--border)] bg-white px-4 py-3">
                              <div className="text-xs font-semibold text-slate-500">Plazas SERUMS</div>
                              <div className="mt-2 grid gap-1">
                                {hospital.serums_resumen.map((r) => (
                                  <div key={`${r.periodo}-${r.modalidad}`} className="flex items-center justify-between gap-3">
                                    <div className="text-sm font-semibold text-slate-700">
                                      {r.periodo} · {r.modalidad.charAt(0).toUpperCase() + r.modalidad.slice(1)}
                                    </div>
                                    <div className="text-sm font-extrabold text-slate-900">{r.plazas_total}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null}
                          <div className="sm:col-span-2">
                            <Button
                              variant="secondary"
                              className="w-full"
                              onClick={onRequestGeocode}
                              disabled={!onRequestGeocode || geocodeLoading}
                            >
                              {geocodeLoading
                                ? "Corrigiendo ubicación…"
                                : geocodeError
                                  ? "Reintentar corrección"
                                  : "Corregir ubicación"}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {nearby ? (
                    <div className="grid gap-3">
                      <PlaceList title="Hospedajes" items={nearby.hospedajes} />
                      <PlaceList title="Restaurantes" items={nearby.restaurantes} />
                      <PlaceList title="Farmacias" items={nearby.farmacias} />
                      <PlaceList title="Tiendas" items={nearby.tiendas} />
                      <PlaceList title="Comisarías" items={nearby.comisarias} />
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="border-t border-[var(--border)] bg-white px-4 py-4">
                <div className="grid gap-2">
                  <div className="rounded-3xl bg-blue-600 px-4 py-3 text-white">
                    <div className="text-xs font-semibold text-white/80">Resumen</div>
                    <div className="mt-0.5 text-lg font-extrabold">
                      {modeForSummary === "avion"
                        ? flightEstimate
                          ? `${formatDuration(flightEstimate.duracion)}`
                          : "—"
                        : route
                          ? `${formatDuration(route.duracion)}`
                          : "—"}
                    </div>
                    <div className="text-xs font-semibold text-white/90">
                      {modeForSummary === "avion"
                        ? flightEstimate
                          ? formatDistance(flightEstimate.distancia)
                          : directDistanceMeters != null
                            ? formatDistance(directDistanceMeters)
                            : "—"
                        : route
                          ? formatDistance(route.distancia)
                          : directDistanceMeters != null
                            ? formatDistance(directDistanceMeters)
                            : "—"}
                    </div>
                  </div>

                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={onRequestNearby}
                    disabled={!onRequestNearby || nearbyLoading}
                  >
                    {nearbyLoading ? "Buscando cerca…" : nearbyError ? "Reintentar cerca" : "Qué hay cerca"}
                  </Button>

                  <Button
                    variant="primary"
                    className="w-full"
                    onClick={onRequestRoute}
                    disabled={!onRequestRoute || routeLoading}
                  >
                    {routeLoading
                      ? travelMode === "avion"
                        ? "Calculando…"
                        : "Calculando ruta…"
                      : routeError
                        ? "Reintentar"
                        : travelMode === "avion"
                          ? "Ver tiempo de vuelo"
                          : "Ver cómo llegar"}
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
