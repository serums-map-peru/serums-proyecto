"use client";

import dynamic from "next/dynamic";

import type { HospitalMapProps } from "./HospitalMapClient";

export const HospitalMap = dynamic(
  () => import("./HospitalMapClient").then((m) => m.HospitalMapClient),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
        <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-slate-500">
          Cargando mapa…
        </div>
      </div>
    ),
  },
);

export type { HospitalMapProps };
