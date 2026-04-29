import { MapPin } from "lucide-react";

type Row = { region: string; establecimiento: string; categoria: string; vacantes: string; badge: string };

export function DashboardTeaser({
  eyebrow,
  title,
  titleHighlight,
  description,
  rows,
}: {
  eyebrow: string;
  title: string;
  titleHighlight: string;
  description: string;
  rows: Row[];
}) {
  return (
    <section id="dashboard" className="py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-dark p-8 text-white shadow-[0_30px_90px_-50px_rgba(0,0,0,0.65)] sm:p-10">
          <div className="pointer-events-none absolute inset-0 grid-pattern" />
          <div className="pointer-events-none absolute -left-24 top-12 h-[420px] w-[420px] rounded-full bg-[var(--primary-glow)]/25 blur-3xl animate-blob" />
          <div className="pointer-events-none absolute -right-24 bottom-8 h-[420px] w-[420px] rounded-full bg-accent/20 blur-3xl animate-blob [animation-delay:-8s]" />

          <div className="relative">
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-accent">{eyebrow}</div>
            <h2 className="mt-4 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
              {title} <span className="text-gradient-brand">{titleHighlight}</span>
            </h2>
            <p className="mt-5 max-w-2xl text-base font-medium leading-relaxed text-white/70">{description}</p>

            <div className="mt-12 grid gap-6 lg:grid-cols-2 lg:items-start">
              <div className="rounded-3xl border border-white/10 glass-dark p-6 shadow-[0_30px_90px_-55px_rgba(0,0,0,0.7)]">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-white/90">Mapa cluster</div>
                  <div className="inline-flex items-center gap-2 text-xs font-semibold text-white/60">
                    <MapPin className="h-4 w-4" aria-hidden="true" />
                    Vista general
                  </div>
                </div>
                <div className="relative mt-4 h-48 overflow-hidden rounded-2xl border border-white/10 bg-black/20">
                  <div className="absolute inset-0 grid-pattern opacity-60" />
                  {[
                    { x: "18%", y: "32%", color: "bg-[var(--primary-glow)]", delay: "0ms" },
                    { x: "32%", y: "58%", color: "bg-accent", delay: "350ms" },
                    { x: "52%", y: "38%", color: "bg-accent", delay: "700ms" },
                    { x: "62%", y: "70%", color: "bg-[var(--primary-glow)]", delay: "1050ms" },
                    { x: "78%", y: "44%", color: "bg-accent", delay: "1400ms" },
                    { x: "42%", y: "24%", color: "bg-[var(--primary-glow)]", delay: "1750ms" },
                  ].map((p, idx) => (
                    <div
                      key={idx}
                      className={[
                        "absolute h-2.5 w-2.5 rounded-full",
                        p.color,
                        "shadow-[0_0_0_10px_rgba(49,130,206,0.14)] animate-pulse",
                      ].join(" ")}
                      style={{ left: p.x, top: p.y, animationDelay: p.delay }}
                    />
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 glass-dark p-6 shadow-[0_30px_90px_-55px_rgba(0,0,0,0.7)]">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-white/90">Tabla rápida</div>
                  <div className="text-xs font-semibold text-white/60">Datos simulados</div>
                </div>
                <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
                  <div className="grid grid-cols-[1.2fr_1.6fr_0.7fr_0.6fr_0.7fr] gap-0 bg-white/5 px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-white/60">
                    <div>Región</div>
                    <div>Establecimiento</div>
                    <div>Categoría</div>
                    <div>Vacantes</div>
                    <div>Estado</div>
                  </div>
                  <div className="divide-y divide-white/10">
                    {rows.map((r) => (
                      <div
                        key={`${r.region}-${r.establecimiento}-${r.categoria}`}
                        className="grid grid-cols-[1.2fr_1.6fr_0.7fr_0.6fr_0.7fr] items-center gap-0 px-4 py-3 text-sm"
                      >
                        <div className="truncate font-semibold text-white/85">{r.region}</div>
                        <div className="truncate font-semibold text-white/75">{r.establecimiento}</div>
                        <div className="font-semibold text-white/85">{r.categoria}</div>
                        <div className="font-semibold text-white/85">{r.vacantes}</div>
                        <div>
                          <span className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white/80">
                            {r.badge}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

