import Image from "next/image";
import { Activity, ArrowRight, MapPin } from "lucide-react";

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
  metrics: [Metric, Metric, Metric];
}) {
  return (
    <section id="top" className="relative overflow-hidden pt-28">
      <div className="pointer-events-none absolute inset-0 bg-gradient-radial" />

      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-24 sm:px-6 lg:grid-cols-2">
        <div className="animate-fade-up">
          <div className="inline-flex items-center gap-3 text-xs font-semibold text-foreground/70">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            {badge}
          </div>

          <h1 className="mt-5 font-display text-5xl font-extrabold leading-[1.02] tracking-tight text-foreground sm:text-6xl">
            {titleLines[0]}
            <br />
            <span className="block whitespace-pre-line text-gradient-brand">{titleLines[1]}</span>
            {titleLines[2]}
          </h1>

          <p className="mt-6 max-w-xl text-base font-medium leading-relaxed text-muted-foreground">{description}</p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href={primaryCta.href}
              className="group inline-flex items-center gap-2 rounded-full bg-gradient-brand px-6 py-3.5 text-sm font-semibold text-white shadow-glow transition-transform hover:scale-[1.03]"
            >
              <MapPin className="h-4 w-4" aria-hidden="true" />
              {primaryCta.label}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </a>
            <a
              href={secondaryCta.href}
              className="inline-flex items-center gap-2 rounded-full px-4 py-3.5 text-sm font-semibold text-foreground/85 hover:text-foreground"
            >
              {secondaryCta.label}
            </a>
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-6 text-sm font-semibold text-foreground/70">
            <div className="inline-flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" aria-hidden="true" />
              {stat1}
            </div>
            <div className="inline-flex items-center gap-2">
              <MapPin className="h-4 w-4 text-accent" aria-hidden="true" />
              {stat2}
            </div>
          </div>
        </div>

        <div className="animate-fade-up [animation-delay:120ms]">
          <div className="relative">
            <div className="pointer-events-none absolute -inset-16 rounded-[3rem] bg-[radial-gradient(600px_circle_at_55%_40%,oklch(0.62_0.24_295/0.35),transparent_60%),radial-gradient(600px_circle_at_75%_60%,oklch(0.6_0.18_245/0.25),transparent_60%)] blur-2xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-border bg-white shadow-glow">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(700px_circle_at_45%_0%,oklch(0.46_0.21_295/0.20),transparent_62%),radial-gradient(700px_circle_at_75%_80%,oklch(0.6_0.18_245/0.18),transparent_60%)]" />

              <div className="relative p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3 text-xs font-semibold text-foreground/60">
                  <div className="inline-flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    Información actualizada · {metrics[0].value}
                  </div>
                  <div className="flex gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-foreground/15" />
                    <span className="h-2 w-2 rounded-full bg-foreground/15" />
                    <span className="h-2 w-2 rounded-full bg-primary" />
                  </div>
                </div>

                <div className="mt-4 overflow-hidden rounded-[1.5rem] border border-border bg-white">
                  <div className="relative aspect-square">
                    <div className="absolute inset-0 grid place-items-center">
                      <div className="relative h-[76%] w-[76%] animate-float">
                        <Image
                          src={heroImageSrc}
                          alt={productName}
                          fill
                          sizes="(max-width: 768px) 80vw, 460px"
                          className="object-contain"
                          priority
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-3">
                  {metrics.map((m) => (
                    <div key={m.label} className="rounded-2xl border border-border bg-white/70 px-4 py-3 text-center backdrop-blur">
                      <div className="font-display text-lg font-extrabold text-gradient-brand sm:text-xl">{m.value}</div>
                      <div className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-foreground/60">{m.label}</div>
                    </div>
                  ))}
                </div>

                <div className="pointer-events-none absolute left-6 top-20 inline-flex items-center gap-2 rounded-full glass-dark px-3 py-2 text-xs font-semibold text-white">
                  {chip1}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
