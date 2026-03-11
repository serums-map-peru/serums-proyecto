"use client";

import * as React from "react";

import { cn } from "@/shared/lib/cn";
import { IconButton } from "@/shared/ui/IconButton";

export type AppHeaderProps = {
  query: string;
  onQueryChange: (value: string) => void;
  onOpenFilters: () => void;
};

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M4 21a8 8 0 0 1 16 0"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="M4 6h16M7 12h10M10 18h4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function AppHeader({ query, onQueryChange, onOpenFilters }: AppHeaderProps) {
  return (
    <header className="border-b border-[var(--border)] bg-white shadow-sm">
      <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-[var(--medical-blue)]">
            <span className="text-lg font-black">S</span>
          </div>
          <div className="leading-tight">
            <div className="text-base font-extrabold text-slate-900">SERUMS Map Perú</div>
            <div className="text-xs font-medium text-slate-500">Mapa de establecimientos</div>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center">
          <div className="relative w-full max-w-xl">
            <input
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="Buscar hospital por nombre…"
              className={cn(
                "h-10 w-full rounded-2xl border border-[var(--border)] bg-white px-4 pr-10 text-sm outline-none shadow-sm",
                "focus:ring-2 focus:ring-[var(--medical-blue)]",
              )}
            />
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
                <path
                  d="M10 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <path
                  d="m21 21-4.35-4.35"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <IconButton
            className="sm:hidden"
            onClick={onOpenFilters}
            aria-label="Abrir filtros"
          >
            <FilterIcon />
          </IconButton>

          <IconButton aria-label="Usuario">
            <UserIcon />
          </IconButton>
        </div>
      </div>
    </header>
  );
}
