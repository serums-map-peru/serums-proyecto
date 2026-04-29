"use client";

import * as React from "react";
import { MapPin, Menu, Sparkles, X } from "lucide-react";

type NavLink = { label: string; href: string };

export function Navbar({
  productName,
  primaryCta,
  links,
}: {
  productName: string;
  primaryCta: string;
  links: NavLink[];
}) {
  const [scrolled, setScrolled] = React.useState(false);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const half = Math.ceil(productName.length / 2);
  const first = productName.slice(0, half);
  const second = productName.slice(half);

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div
          className={[
            "mt-3 flex items-center justify-between gap-4 rounded-3xl border border-transparent transition-all",
            scrolled ? "glass shadow-soft border-white/20 py-2" : "bg-transparent py-3",
          ].join(" ")}
        >
          <a href="#top" className="flex items-center gap-3 rounded-2xl px-3 py-2">
            <div className="grid h-9 w-9 place-items-center rounded-2xl bg-gradient-brand shadow-glow text-white">
              <Sparkles className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="text-base font-bold tracking-tight text-foreground">
              <span className="font-display">{first}</span>
              <span className="font-display text-gradient-brand">{second}</span>
            </div>
          </a>

          <nav className="hidden flex-1 items-center justify-center gap-1 md:flex">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="rounded-full px-4 py-2 text-sm font-semibold text-foreground/75 transition-colors hover:bg-secondary"
              >
                {l.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2 pr-2">
            <a
              href="/"
              className="hidden items-center gap-2 rounded-full bg-gradient-brand px-5 py-2.5 text-sm font-semibold text-white shadow-glow transition-transform hover:scale-[1.03] md:inline-flex"
            >
              <MapPin className="h-4 w-4" aria-hidden="true" />
              {primaryCta}
            </a>
            <button
              type="button"
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-white/60 text-foreground shadow-soft backdrop-blur md:hidden"
              aria-label={open ? "Cerrar menú" : "Abrir menú"}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
            </button>
          </div>
        </div>

        {open ? (
          <div className="mt-3 rounded-3xl border border-white/20 glass p-4 shadow-soft md:hidden">
            <div className="grid gap-2">
              {links.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  className="rounded-2xl px-4 py-3 text-sm font-semibold text-foreground/85 transition-colors hover:bg-secondary"
                  onClick={() => setOpen(false)}
                >
                  {l.label}
                </a>
              ))}
              <a
                href="/"
                className="mt-2 inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-brand px-5 py-3 text-sm font-semibold text-white shadow-glow"
                onClick={() => setOpen(false)}
              >
                <MapPin className="h-4 w-4" aria-hidden="true" />
                {primaryCta}
              </a>
            </div>
          </div>
        ) : null}
      </div>
    </header>
  );
}
