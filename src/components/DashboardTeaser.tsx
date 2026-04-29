import Link from "next/link";
import { ArrowRight, Filter, Layers, MapPin, Plus, TrendingUp } from "lucide-react";

const clusters = [
  { x: 18, y: 22, n: 60, size: "sm" },
  { x: 14, y: 30, n: 36, size: "sm" },
  { x: 22, y: 32, n: 279, size: "lg" },
  { x: 30, y: 30, n: 16, size: "sm" },
  { x: 28, y: 40, n: 35, size: "sm" },
  { x: 38, y: 40, n: 184, size: "md" },
  { x: 26, y: 48, n: 105, size: "md" },
  { x: 32, y: 56, n: 344, size: "lg" },
  { x: 44, y: 56, n: 132, size: "md" },
  { x: 36, y: 64, n: 237, size: "md" },
  { x: 30, y: 70, n: 219, size: "md" },
  { x: 34, y: 80, n: 661, size: "lg" },
  { x: 44, y: 78, n: 380, size: "md" },
  { x: 50, y: 86, n: 273, size: "md" },
  { x: 58, y: 88, n: 212, size: "md" },
  { x: 56, y: 26, n: 76, size: "sm" },
  { x: 50, y: 32, n: 11, size: "xs" },
  { x: 62, y: 18, n: 4, size: "xs" },
  { x: 70, y: 22, n: 9, size: "xs" },
  { x: 68, y: 60, n: 2, size: "xs" },
  { x: 76, y: 70, n: 10, size: "xs" },
  { x: 78, y: 80, n: 39, size: "sm" },
] as const;

const sizeMap = {
  xs: "h-6 w-6 text-[9px] sm:h-7 sm:w-7 sm:text-[10px]",
  sm: "h-7 w-7 text-[10px] sm:h-9 sm:w-9 sm:text-[11px]",
  md: "h-9 w-9 text-[11px] sm:h-11 sm:w-11 sm:text-xs",
  lg: "h-11 w-11 text-xs sm:h-14 sm:w-14 sm:text-sm",
} as const;

export function DashboardTeaser() {
  return (
    <section id="dashboard" className="py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-dark p-8 text-white shadow-glow md:p-12">
          <div className="pointer-events-none absolute inset-0 grid-pattern opacity-40" />
          <div className="pointer-events-none absolute -top-32 -right-32 h-96 w-96 rounded-full bg-primary/40 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-accent/30 blur-3xl" />

          <div className="relative grid gap-10 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <div className="inline-flex items-center gap-2 rounded-full glass-dark px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-white/80">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Actualizado al 2026-1
              </div>

              <h2 className="mt-5 font-display text-4xl font-extrabold leading-[1.05] tracking-tight md:text-5xl">
                Todas las plazas, <span className="text-gradient-brand">en un mapa.</span>
              </h2>

              <p className="mt-4 text-base font-medium leading-relaxed text-white/70">
                Un vistazo claro a clusters geoespaciales y plazas SERUMS: compara regiones, toma decisiones y aterriza tu shortlist más rápido.
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {[
                  { icon: Layers, title: "+20mil plazas" },
                  { icon: Filter, title: "Filtros inteligentes" },
                  { icon: TrendingUp, title: "17 carreras" },
                  { icon: MapPin, title: "+5mil establecimientos" },
                ].map((it) => {
                  const Icon = it.icon;
                  return (
                    <div key={it.title} className="flex items-center gap-3 rounded-2xl border border-white/10 glass-dark px-4 py-3">
                      <div className="grid h-8 w-8 place-items-center rounded-xl glass-dark text-[var(--primary-glow)]">
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </div>
                      <div className="text-sm font-semibold text-white/85">{it.title}</div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-8">
                <Link
                  href="/map"
                  className="group inline-flex items-center gap-2 rounded-full bg-gradient-brand px-6 py-3.5 text-sm font-semibold text-white shadow-glow transition-transform hover:scale-[1.03]"
                >
                  Ir al mapa
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </Link>
              </div>
            </div>

            <div className="lg:col-span-3">
              <div className="rounded-2xl border border-white/10 glass-dark p-4 shadow-glow">
                <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
                    <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
                  </div>
                  <div className="truncate font-mono text-xs font-semibold text-white/60">www.localisa.pe</div>
                </div>

                <div className="relative mt-4 aspect-[4/3] overflow-hidden rounded-xl bg-[oklch(0.18_0.05_280)]">
                  <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:28px_28px]" />

                  <div className="pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--primary-glow)]/25 blur-3xl animate-glow-pulse" />
                  <div className="pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/25 blur-3xl animate-glow-pulse [animation-delay:-2s]" />

                  <svg
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    className="pointer-events-none absolute inset-0 h-full w-full"
                    aria-hidden="true"
                  >
                    <defs>
                      <linearGradient id="peruFill" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0.35" stopColor="oklch(0.46 0.21 295)" />
                        <stop offset="1" stopColor="oklch(0.6 0.18 245)" />
                      </linearGradient>
                      <linearGradient id="peruStroke" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0" stopColor="oklch(0.62 0.24 295)" />
                        <stop offset="1" stopColor="oklch(0.6 0.18 245)" />
                      </linearGradient>
                      <filter id="peruGlow" x="-50%" y="-50%" width="200%" height="200%">
                        <feDropShadow dx="0" dy="0" stdDeviation="1.8" floodColor="oklch(0.62 0.24 295)" floodOpacity="0.35" />
                      </filter>
                    </defs>
                    <path
                      d="M16,18 L24,14 L32,16 L40,14 L52,12 L62,14 L72,16 L80,22 L84,32 L82,42 L78,50 L74,58 L70,66 L62,74 L54,82 L46,90 L38,92 L32,88 L28,80 L24,72 L20,62 L16,50 L14,38 L12,28 Z"
                      fill="url(#peruFill)"
                      stroke="url(#peruStroke)"
                      strokeWidth="0.4"
                      filter="url(#peruGlow)"
                      opacity="0.95"
                    />
                  </svg>

                  <svg viewBox="0 0 100 100" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
                    <line x1="22" y1="32" x2="38" y2="40" stroke="oklch(0.6 0.18 245 / 0.5)" strokeWidth="0.5" strokeDasharray="3 4">
                      <animate attributeName="stroke-dashoffset" values="0;-14" dur="2s" repeatCount="indefinite" />
                    </line>
                    <line x1="32" y1="56" x2="44" y2="56" stroke="oklch(0.46 0.21 295 / 0.5)" strokeWidth="0.5" strokeDasharray="3 4">
                      <animate attributeName="stroke-dashoffset" values="0;-14" dur="2.4s" repeatCount="indefinite" />
                    </line>
                    <line x1="34" y1="80" x2="50" y2="86" stroke="oklch(0.6 0.18 245 / 0.5)" strokeWidth="0.5" strokeDasharray="3 4">
                      <animate attributeName="stroke-dashoffset" values="0;-14" dur="2.8s" repeatCount="indefinite" />
                    </line>
                  </svg>

                  {clusters.map((c, i) => (
                    <div
                      key={`${c.x}-${c.y}-${c.n}`}
                      className="absolute -translate-x-1/2 -translate-y-1/2 animate-float"
                      style={{
                        left: `${c.x}%`,
                        top: `${c.y}%`,
                        animationDelay: `${(i % 6) * 0.4}s`,
                      }}
                    >
                      <span
                        className="absolute inset-0 rounded-full bg-white/20 blur-md animate-glow-pulse"
                        style={{ animationDelay: `${i * 0.2}s` }}
                      />
                      <span
                        className={[
                          "relative flex items-center justify-center rounded-full bg-white font-bold text-[oklch(0.18_0.04_285)] ring-2 ring-white/40",
                          "shadow-[0_4px_20px_-2px_oklch(0.62_0.24_295/0.6)]",
                          sizeMap[c.size],
                        ].join(" ")}
                      >
                        {c.n}
                      </span>
                    </div>
                  ))}

                  <div className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: "62%", top: "10%" }}>
                    <div className="absolute inset-0 h-10 w-10 -translate-x-0.5 -translate-y-0.5 rounded-full bg-yellow-400/30 blur-xl" />
                    <div className="relative h-9 w-9 -rotate-45 rounded-full rounded-bl-none bg-yellow-400 shadow-[0_18px_50px_-26px_rgba(250,204,21,0.85)]">
                      <div className="grid h-full w-full rotate-45 place-items-center">
                        <Plus className="h-4 w-4 text-[oklch(0.18_0.04_285)]" aria-hidden="true" />
                      </div>
                    </div>
                  </div>

                  <div className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: "54%", top: "55%" }}>
                    <div className="absolute inset-0 h-10 w-10 -translate-x-0.5 -translate-y-0.5 rounded-full bg-emerald-400/25 blur-xl" />
                    <div className="relative h-9 w-9 -rotate-45 rounded-full rounded-bl-none bg-emerald-400 shadow-[0_18px_50px_-26px_rgba(52,211,153,0.85)] animate-pulse [animation-delay:-1s]">
                      <div className="grid h-full w-full rotate-45 place-items-center">
                        <Plus className="h-4 w-4 text-[oklch(0.18_0.04_285)]" aria-hidden="true" />
                      </div>
                    </div>
                  </div>
                  <div className="absolute right-3 top-3 rounded-lg glass-dark px-2.5 py-1.5 font-mono text-[10px] font-semibold text-white/80">
                    25 regiones
                  </div>
                  <div className="absolute bottom-3 right-3 flex gap-2">
                    <button
                      type="button"
                      className="grid h-7 w-7 place-items-center rounded-md glass-dark text-[10px] font-bold text-white/85"
                      aria-label="Zoom in"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      className="grid h-7 w-7 place-items-center rounded-md glass-dark text-[10px] font-bold text-white/85"
                      aria-label="Zoom out"
                    >
                      −
                    </button>
                  </div>

                  <div className="pointer-events-none absolute inset-x-0 top-0 h-24 opacity-40 [background:linear-gradient(180deg,transparent,oklch(0.6_0.18_245/0.25),transparent)] animate-[scan_6s_linear_infinite]" />
                  <style>{`@keyframes scan { 0% { transform: translateY(-30%); } 100% { transform: translateY(420%); } }`}</style>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
