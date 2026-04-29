"use client";

import * as React from "react";

import { Hospital, HospitalFilters, HospitalMapItem } from "../types";

export function createInitialHospitalFilters(): HospitalFilters {
  return {
    profesion: null,
    institucion: [],
    departamento: [],
    grado_dificultad: [],
    categoria: [],
    zaf: null,
    ze: null,
    bono: null,
    serums_periodo: "2026-I",
    serums_modalidad: null,
    airport_hours_max: null,
  };
}

function getApiBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (configured && configured.trim().length > 0) return configured.trim().replace(/\/$/, "");
  if (typeof window !== "undefined" && window.location && window.location.hostname) {
    return `${window.location.protocol}//${window.location.host}/api`;
  }
  return "http://localhost:3000/api";
}

function buildHospitalQuery(filters: HospitalFilters) {
  const params = new URLSearchParams();

  if (filters.profesion && filters.profesion.trim()) params.set("profesion", filters.profesion.trim());
  if (Array.isArray(filters.institucion)) {
    for (const v of filters.institucion) if (v && v.trim()) params.append("institucion", v.trim());
  }
  if (Array.isArray(filters.departamento)) {
    for (const v of filters.departamento) if (v && v.trim()) params.append("departamento", v.trim());
  }
  if (Array.isArray(filters.grado_dificultad)) {
    for (const v of filters.grado_dificultad) if (v && v.trim()) params.append("grado_dificultad", v.trim());
  }
  if (Array.isArray(filters.categoria)) {
    for (const v of filters.categoria) if (v && v.trim()) params.append("categoria", v.trim());
  }
  if (filters.zaf && filters.zaf.trim()) params.set("zaf", filters.zaf.trim());
  if (filters.ze && filters.ze.trim()) params.set("ze", filters.ze.trim());
  if (filters.bono && filters.bono.trim()) params.set("bono", filters.bono.trim());
  if (filters.serums_periodo && filters.serums_periodo.trim()) params.set("serums_periodo", filters.serums_periodo.trim());
  if (filters.serums_modalidad && filters.serums_modalidad.trim()) params.set("serums_modalidad", filters.serums_modalidad.trim());
  if (filters.airport_hours_max != null) params.set("airport_hours_max", String(filters.airport_hours_max));

  const qs = params.toString();
  return qs.length > 0 ? `?${qs}` : "";
}

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

export function useHospitalFiltering() {
  const [filters, setFilters] = React.useState<HospitalFilters>(createInitialHospitalFilters());
  const [hospitals, setHospitals] = React.useState<HospitalMapItem[]>([]);
  const [allHospitals, setAllHospitals] = React.useState<HospitalMapItem[] | null>(null);
  const [options, setOptions] = React.useState<Options>({
    departamentos: { values: [], enabled: {} },
    instituciones: { values: [], enabled: {} },
    grados_dificultad: { values: [], enabled: {} },
    categorias: { values: [], enabled: {} },
  });
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const apiBase = React.useMemo(() => getApiBaseUrl(), []);

  const fetchHospitalsMap = React.useCallback(
    async (qs: string, signal: AbortSignal) => {
      const preferred = `${apiBase}/hospitales/map${qs}`;
      const fallback = `${apiBase}/hospitales${qs}`;

      let r = await fetch(preferred, { signal });
      if (r.status === 404) {
        r = await fetch(fallback, { signal });
      }

      if (!r.ok) {
        const body = await r.json().catch(() => null);
        const message =
          body && typeof body === "object" && body.error && body.error.message
            ? String(body.error.message)
            : "Error al cargar establecimientos";
        throw new Error(message);
      }

      return (await r.json()) as HospitalMapItem[];
    },
    [apiBase],
  );

  const fetchFacets = React.useCallback(
    async (qs: string, signal: AbortSignal) => {
      const r = await fetch(`${apiBase}/hospitales/facets${qs}`, { signal });
      if (!r.ok) {
        const body = await r.json().catch(() => null);
        const message =
          body && typeof body === "object" && body.error && body.error.message
            ? String(body.error.message)
            : "Error al cargar opciones de filtros";
        throw new Error(message);
      }
      return (await r.json()) as Options;
    },
    [apiBase],
  );

  React.useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    const initialQs = buildHospitalQuery(createInitialHospitalFilters());

    fetchHospitalsMap(initialQs, controller.signal)
      .then((data) => {
        setAllHospitals(data);
        setHospitals(data);
        return fetchFacets(initialQs, controller.signal)
          .then((f) => {
            setOptions(f);
            setLoading(false);
          })
          .catch(() => {
            setLoading(false);
          });
      })
      .catch((e) => {
        if (e && e.name === "AbortError") return;
        setError(e instanceof Error ? e.message : "Error al cargar establecimientos");
        setLoading(false);
      });

    return () => controller.abort();
  }, [apiBase, fetchHospitalsMap, fetchFacets]);

  const filterSeqRef = React.useRef(0);

  React.useEffect(() => {
    if (!allHospitals) return;
    const qs = buildHospitalQuery(filters);
    const controller = new AbortController();
    const seq = (filterSeqRef.current += 1);

    const isAbort = (e: unknown) => {
      if (!e) return false;
      if (typeof e === "object" && "name" in e && e.name === "AbortError") return true;
      if (typeof e === "object" && "message" in e && typeof e.message === "string") {
        const m = e.message.toLowerCase();
        if (m.includes("abort")) return true;
      }
      return false;
    };

    setLoading(true);
    setError(null);

    const hospitalsPromise = qs ? fetchHospitalsMap(qs, controller.signal) : Promise.resolve(allHospitals);
    hospitalsPromise
      .then((data) => {
        if (controller.signal.aborted) return;
        if (filterSeqRef.current !== seq) return;
        setHospitals(data);
        setLoading(false);
        setError(null);
      })
      .catch((e) => {
        if (isAbort(e)) return;
        if (filterSeqRef.current !== seq) return;
        setError(e instanceof Error ? e.message : "Error al filtrar establecimientos");
        setLoading(false);
      });

    fetchFacets(qs, controller.signal)
      .then((f) => {
        if (controller.signal.aborted) return;
        if (filterSeqRef.current !== seq) return;
        setOptions(f);
      })
      .catch((e) => {
        if (isAbort(e)) return;
      });

    return () => controller.abort();
  }, [allHospitals, fetchFacets, fetchHospitalsMap, filters]);

  const fetchHospitalById = React.useCallback(
    async (id: string) => {
      const r = await fetch(`${apiBase}/hospitales/${encodeURIComponent(id)}`);
      if (!r.ok) {
        const body = await r.json().catch(() => null);
        const message =
          body && typeof body === "object" && body.error && body.error.message
            ? String(body.error.message)
            : "Error al obtener el establecimiento";
        throw new Error(message);
      }
      return (await r.json()) as Hospital;
    },
    [apiBase],
  );

  return {
    filters,
    setFilters,
    filteredHospitals: hospitals,
    options,
    loading,
    error,
    fetchHospitalById,
  };
}
