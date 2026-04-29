import { ArrowUpRight, CalendarCheck, MapPin, Search } from "lucide-react";

type Feature1 = { title: string; query: string; tags: string[] };
type Feature2 = { title: string; chip: string };
type Feature3Item = { name: string; subtitle: string; badge: string };
type Feature3 = { title: string; items: [Feature3Item, Feature3Item, Feature3Item] };

export function Features({
  eyebrow,
  title,
  titleHighlight,
  description,
  feature1,
  feature2,
  feature3,
}: {
  eyebrow: string;
  title: string;
  titleHighlight: string;
  description: string;
  feature1: Feature1;
  feature2: Feature2;
  feature3: Feature3;
}) {
  return (
    <section id="features" className="py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-primary">{eyebrow}</div>
          <h2 className="mt-4 font-display text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            {title} <span className="text-gradient-brand">{titleHighlight}</span>
          </h2>
          <p className="mt-5 text-base font-medium leading-relaxed text-muted-foreground">{description}</p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          <div className="group rounded-3xl border border-border bg-card p-6 shadow-card transition-transform hover:-translate-y-1 hover:shadow-glow">
            <div className="flex items-start justify-between gap-4">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-brand shadow-glow text-white">
                <Search className="h-5 w-5" aria-hidden="true" />
              </div>
              <ArrowUpRight className="h-5 w-5 text-foreground/50 transition-transform group-hover:rotate-12" aria-hidden="true" />
            </div>
            <div className="mt-5 text-lg font-semibold text-foreground">{feature1.title}</div>
            <div className="mt-4 rounded-2xl border border-border bg-secondary p-4">
              <div className="flex items-center gap-3 rounded-xl bg-white/70 px-4 py-3 shadow-soft">
                <Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <div className="text-sm font-semibold text-foreground/80">{feature1.query}</div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {feature1.tags.map((t) => (
                  <div
                    key={t}
                    className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-foreground/80"
                  >
                    {t}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="group rounded-3xl border border-border bg-card p-6 shadow-card transition-transform hover:-translate-y-1 hover:shadow-glow">
            <div className="flex items-start justify-between gap-4">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-brand shadow-glow text-white">
                <MapPin className="h-5 w-5" aria-hidden="true" />
              </div>
              <ArrowUpRight className="h-5 w-5 text-foreground/50 transition-transform group-hover:rotate-12" aria-hidden="true" />
            </div>
            <div className="mt-5 text-lg font-semibold text-foreground">{feature2.title}</div>
            <div className="relative mt-4 h-32 overflow-hidden rounded-2xl border border-border bg-surface-dark/90">
              <div className="absolute inset-0 grid-pattern opacity-100" />

              <div className="absolute left-[18%] top-[42%] h-3 w-3 rounded-full bg-accent shadow-[0_0_0_6px_oklch(0.6_0.18_245/0.25)] animate-pulse [animation-delay:0ms]" />
              <div className="absolute left-[48%] top-[32%] h-3 w-3 rounded-full bg-primary shadow-[0_0_0_6px_oklch(0.46_0.21_295/0.25)] animate-pulse [animation-delay:250ms]" />
              <div className="absolute left-[72%] top-[58%] h-3 w-3 rounded-full bg-[var(--primary-glow)] shadow-[0_0_0_6px_oklch(0.62_0.24_295/0.25)] animate-pulse [animation-delay:500ms]" />

              <div className="absolute bottom-3 right-3 rounded-full glass px-3 py-1.5 text-xs font-semibold text-foreground/80">
                {feature2.chip}
              </div>
            </div>
          </div>

          <div className="group rounded-3xl border border-border bg-card p-6 shadow-card transition-transform hover:-translate-y-1 hover:shadow-glow">
            <div className="flex items-start justify-between gap-4">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-brand shadow-glow text-white">
                <CalendarCheck className="h-5 w-5" aria-hidden="true" />
              </div>
              <ArrowUpRight className="h-5 w-5 text-foreground/50 transition-transform group-hover:rotate-12" aria-hidden="true" />
            </div>
            <div className="mt-5 text-lg font-semibold text-foreground">{feature3.title}</div>
            <div className="mt-4 grid gap-2">
              {feature3.items.map((it) => (
                <div key={it.name} className="flex items-center justify-between gap-3 rounded-xl bg-secondary px-4 py-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-foreground">{it.name}</div>
                    <div className="mt-0.5 text-xs font-semibold text-muted-foreground">{it.subtitle}</div>
                  </div>
                  <div className="shrink-0 rounded-full bg-accent/15 px-3 py-1 text-xs font-bold text-foreground/80">
                    {it.badge}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

