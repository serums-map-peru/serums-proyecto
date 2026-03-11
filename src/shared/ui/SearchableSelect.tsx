"use client";

import * as React from "react";

import { cn } from "@/shared/lib/cn";

export type SelectOption = {
  value: string;
  label: string;
};

export type SearchableSelectProps = {
  label: string;
  value: string | null;
  options: SelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  onChange: (value: string | null) => void;
};

export function SearchableSelect({
  label,
  value,
  options,
  placeholder = "Seleccionar…",
  searchPlaceholder = "Buscar…",
  onChange,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const rootRef = React.useRef<HTMLDivElement | null>(null);

  const selected = value ? options.find((o) => o.value === value) : null;

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  React.useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, []);

  React.useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <div className="mb-1 text-xs font-semibold text-slate-700">{label}</div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-xl border border-[var(--border)] bg-white px-3 text-left text-sm text-slate-900 shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--medical-blue)] focus-visible:ring-offset-2 focus-visible:ring-offset-white",
          open && "ring-2 ring-[var(--medical-blue)] ring-offset-2 ring-offset-white",
        )}
      >
        <span className={cn(!selected && "text-slate-400")}>
          {selected ? selected.label : placeholder}
        </span>
        <span className="ml-2 text-slate-400">▾</span>
      </button>

      {open ? (
        <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-[0_16px_40px_rgba(15,23,42,0.12)]">
          <div className="flex items-center gap-2 border-b border-[var(--border)] p-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-9 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[var(--medical-blue)]"
            />
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
              className="h-9 rounded-xl border border-[var(--border)] bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Limpiar
            </button>
          </div>
          <div className="max-h-56 overflow-auto p-1">
            {filtered.length ? (
              filtered.map((o) => {
                const isSelected = o.value === value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => {
                      onChange(o.value);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm text-slate-800 hover:bg-slate-50",
                      isSelected && "bg-slate-50 font-semibold",
                    )}
                  >
                    <span>{o.label}</span>
                    {isSelected ? <span className="text-[var(--medical-blue)]">✓</span> : null}
                  </button>
                );
              })
            ) : (
              <div className="px-3 py-6 text-sm text-slate-500">
                Sin resultados
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
