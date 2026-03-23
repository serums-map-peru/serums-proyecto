"use client";

import * as React from "react";

import { Hospital, HospitalFilters, HospitalMapItem } from "../types";

function uniqueSorted(values: string[]) {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

export function createInitialHospitalFilters(): HospitalFilters {
  return {
    profesion: null,
    institucion: null,
    departamento: null,
    provincia: null,
    distrito: null,
    grado_dificultad: null,
    categoria: null,
    zaf: null,
    ze: null,
    serums_periodo: null,
    serums_modalidad: null,
  };
}

function getApiBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (configured && configured.trim().length > 0) return configured.trim().replace(/\/$/, "");
  return "/api";
}

function buildHospitalQuery(filters: HospitalFilters) {
  const params = new URLSearchParams();

  const entries: Array<[keyof HospitalFilters, string]> = [
    ["profesion", filters.profesion ?? ""],
    ["institucion", filters.institucion ?? ""],
    ["departamento", filters.departamento ?? ""],
    ["provincia", filters.provincia ?? ""],
    ["distrito", filters.distrito ?? ""],
    ["grado_dificultad", filters.grado_dificultad ?? ""],
    ["categoria", filters.categoria ?? ""],
    ["zaf", filters.zaf ?? ""],
    ["ze", filters.ze ?? ""],
    ["serums_periodo", filters.serums_periodo ?? ""],
    ["serums_modalidad", filters.serums_modalidad ?? ""],
  ];

  for (const [k, v] of entries) {
    const value = v.trim();
    if (value.length > 0) params.set(String(k), value);
  }

  const qs = params.toString();
  return qs.length > 0 ? `?${qs}` : "";
}

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

export function useHospitalFiltering() {
  const [filters, setFilters] = React.useState<HospitalFilters>(createInitialHospitalFilters());
  const [hospitals, setHospitals] = React.useState<HospitalMapItem[]>([]);
  const [allHospitals, setAllHospitals] = React.useState<HospitalMapItem[] | null>(null);
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

  React.useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetchHospitalsMap("", controller.signal)
      .then((data) => {
        setAllHospitals(data);
        setHospitals(data);
        setLoading(false);
      })
      .catch((e) => {
        if (e && e.name === "AbortError") return;
        setError(e instanceof Error ? e.message : "Error al cargar establecimientos");
        setLoading(false);
      });

    return () => controller.abort();
  }, [apiBase, fetchHospitalsMap]);

  React.useEffect(() => {
    if (!allHospitals) return;
    const qs = buildHospitalQuery(filters);
    if (!qs) {
      setHospitals(allHospitals);
      setError(null);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetchHospitalsMap(qs, controller.signal)
      .then((data) => {
        setHospitals(data);
        setLoading(false);
      })
      .catch((e) => {
        if (e && e.name === "AbortError") return;
        setError(e instanceof Error ? e.message : "Error al filtrar establecimientos");
        setLoading(false);
      });

    return () => controller.abort();
  }, [allHospitals, fetchHospitalsMap, filters]);

  const options: Options = React.useMemo(() => {
    const base = allHospitals ?? hospitals;
    const allProfessions: string[] = [];
    for (const h of base) {
      const profs = Array.isArray(h.profesiones) && h.profesiones.length > 0 ? h.profesiones : [h.profesion];
      for (const p of profs) {
        if (p) allProfessions.push(p);
      }
    }
    return {
      profesiones: uniqueSorted(allProfessions),
      instituciones: uniqueSorted(base.map((h) => h.institucion).filter(Boolean)),
      departamentos: uniqueSorted(base.map((h) => h.departamento).filter(Boolean)),
      provincias: uniqueSorted(base.map((h) => h.provincia).filter(Boolean)),
      distritos: uniqueSorted(base.map((h) => h.distrito).filter(Boolean)),
      grados_dificultad: uniqueSorted(base.map((h) => h.grado_dificultad).filter(Boolean)),
      categorias: uniqueSorted(base.map((h) => h.categoria).filter(Boolean)),
      zaf: uniqueSorted(base.map((h) => h.zaf).filter(Boolean)),
      ze: uniqueSorted(base.map((h) => h.ze).filter(Boolean)),
    };
  }, [allHospitals, hospitals]);

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
