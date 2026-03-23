"use client";

import dynamic from "next/dynamic";

import type { HospitalMapProps } from "./HospitalMapClient";

export const HospitalMap = dynamic(
  () => import("./HospitalMapClient").then((m) => m.HospitalMapClient),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full overflow-hidden bg-white">
        <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-slate-500">
          Cargando mapa…
        </div>
      </div>
    ),
  },
);

export type { HospitalMapProps };
