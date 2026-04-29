import Image from "next/image";
import { Activity, ArrowRight, MapPin, Sparkles } from "lucide-react";

type Metric = { value: string; label: string };

export function Hero({
  productName,
  badge,
  titleLines,
  description,
  primaryCta,
  secondaryCta,
  stat1,
  stat2,
  heroImageSrc,
  chip1,
  chip2,
  metrics,
}: {
  productName: string;
  badge: string;
  titleLines: [string, string, string];
  description: string;
  primaryCta: { label: string; href: string };
  secondaryCta: { label: string; href: string };
  stat1: string;
  stat2: string;
  heroImageSrc: string;
  chip1: string;
  chip2: string;
  metrics: [Metric, Metric, Metric];
}) {
  return (
    <section id="top" className="relative overflow-hidden pt-28">
      <div className="pointer-events-none absolute inset-0 bg-gradient-radial" />
      <div className="pointer-events-none absolute -left-24 top-20 h-[420px] w-[420px] rounded-full bg-primary/30 blur-3xl animate-blob" />
      <div className="pointer-events-none absolute -right-24 top-48 h-[420px] w-[420px] rounded-full bg-accent/30 blur-3xl animate-blob [animation-delay:-6s]" />

      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 sm:px-6 md:grid-cols-2">
        <div className="animate-fade-up">
          <div className="inline-flex items-center gap-3 rounded-full glass px-4 py-2 text-xs font-semibold text-foreground/80">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent/80 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
            </span>
            {badge}
          </div>

          <h1 className="mt-6 font-display text-5xl font-extrabold leading-[1.02] tracking-tight text-foreground sm:text-6xl md:text-7xl">
            {titleLines[0]}
            <br />
            <span className="text-gradient-brand">{titleLines[1]}</span>
            <br />
            {titleLines[2]}
          </h1>

          <p className="mt-6 max-w-lg text-base font-medium leading-relaxed text-muted-foreground">{description}</p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href={primaryCta.href}
              className="group inline-flex items-center gap-2 rounded-full bg-gradient-brand px-6 py-3 text-sm font-semibold text-white shadow-glow transition-transform hover:scale-[1.03]"
            >
              {primaryCta.label}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </a>
            <a
              href={secondaryCta.href}
              className="inline-flex items-center gap-2 rounded-full glass px-6 py-3 text-sm font-semibold text-foreground/90 shadow-soft"
            >
              {secondaryCta.label}
            </a>
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-6 text-sm font-semibold text-foreground/80">
            <div className="inline-flex items-center gap-2">
              <Activity className="h-4 w-4 text-accent" aria-hidden="true" />
              {stat1}
            </div>
            <div className="inline-flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" aria-hidden="true" />
              {stat2}
            </div>
          </div>
        </div>

        <div className="animate-fade-up [animation-delay:120ms]">
          <div className="relative rounded-[2rem] glass p-6 shadow-glow">
            <div className="pointer-events-none absolute inset-0 -z-10 rounded-[2rem] bg-gradient-brand blur-3xl opacity-40 animate-glow-pulse" />

            <div className="flex items-center justify-between gap-3 text-xs font-semibold text-foreground/70">
              <div className="inline-flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                IA · online
              </div>
              <div className="flex gap-1.5">
                <span className="h-2 w-2 rounded-full bg-foreground/15" />
                <span className="h-2 w-2 rounded-full bg-foreground/15" />
                <span className="h-2 w-2 rounded-full bg-foreground/25" />
              </div>
            </div>

            <div className="relative mt-5 overflow-hidden rounded-[1.5rem] bg-white">
              <Image
                src={heroImageSrc}
                alt={productName}
                width={820}
                height={820}
                className="h-auto w-full object-cover animate-float"
                priority
              />

              <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full glass-dark px-3 py-2 text-xs font-semibold text-white">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                {chip1}
              </div>

              <div className="absolute bottom-4 right-4 inline-flex items-center gap-2 rounded-full glass-dark px-3 py-2 text-xs font-semibold text-white">
                <MapPin className="h-4 w-4" aria-hidden="true" />
                {chip2}
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {metrics.map((m) => (
                <div key={m.label} className="rounded-2xl bg-white/50 p-4 backdrop-blur">
                  <div className="font-display text-xl font-extrabold text-gradient-brand">{m.value}</div>
                  <div className="mt-1 text-[11px] font-bold uppercase tracking-wider text-foreground/70">{m.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

