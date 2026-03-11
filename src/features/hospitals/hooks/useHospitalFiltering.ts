"use client";

import * as React from "react";

import { Hospital, HospitalFilters } from "../types";

function uniqueSorted(values: string[]) {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

export function createInitialHospitalFilters(): HospitalFilters {
  return {
    query: "",
    region: null,
    province: null,
    district: null,
    sectors: [],
    establishmentTypes: [],
    rurality: null,
    services: [],
  };
}

export function filterHospitals(hospitals: Hospital[], filters: HospitalFilters) {
  const q = filters.query.trim().toLowerCase();

  return hospitals.filter((h) => {
    if (q && !h.name.toLowerCase().includes(q)) return false;
    if (filters.region && h.region !== filters.region) return false;
    if (filters.province && h.province !== filters.province) return false;
    if (filters.district && h.district !== filters.district) return false;
    if (filters.rurality && h.rurality !== filters.rurality) return false;

    if (filters.sectors.length && !filters.sectors.includes(h.sector)) return false;
    if (
      filters.establishmentTypes.length &&
      !filters.establishmentTypes.includes(h.establishmentType)
    )
      return false;
    if (
      filters.services.length &&
      !filters.services.every((s) => h.services.includes(s))
    )
      return false;

    return true;
  });
}

export function useHospitalFiltering(hospitals: Hospital[]) {
  const [filters, setFilters] = React.useState<HospitalFilters>(
    createInitialHospitalFilters(),
  );

  const regionOptions = React.useMemo(
    () => uniqueSorted(hospitals.map((h) => h.region)),
    [hospitals],
  );

  const provinceOptions = React.useMemo(() => {
    const base = filters.region
      ? hospitals.filter((h) => h.region === filters.region)
      : hospitals;
    return uniqueSorted(base.map((h) => h.province));
  }, [filters.region, hospitals]);

  const districtOptions = React.useMemo(() => {
    let base = hospitals;
    if (filters.region) base = base.filter((h) => h.region === filters.region);
    if (filters.province)
      base = base.filter((h) => h.province === filters.province);
    return uniqueSorted(base.map((h) => h.district));
  }, [filters.region, filters.province, hospitals]);

  const serviceOptions = React.useMemo(
    () => uniqueSorted(hospitals.flatMap((h) => h.services)),
    [hospitals],
  );

  const filteredHospitals = React.useMemo(
    () => filterHospitals(hospitals, filters),
    [hospitals, filters],
  );

  React.useEffect(() => {
    setFilters((prev) => {
      let changed = false;
      const next: HospitalFilters = { ...prev };

      if (next.region && !regionOptions.includes(next.region)) {
        next.region = null;
        changed = true;
      }
      if (next.province && !provinceOptions.includes(next.province)) {
        next.province = null;
        changed = true;
      }
      if (next.district && !districtOptions.includes(next.district)) {
        next.district = null;
        changed = true;
      }

      return changed ? next : prev;
    });
  }, [regionOptions, provinceOptions, districtOptions]);

  return {
    filters,
    setFilters,
    filteredHospitals,
    options: {
      regions: regionOptions,
      provinces: provinceOptions,
      districts: districtOptions,
      services: serviceOptions,
    },
  };
}
