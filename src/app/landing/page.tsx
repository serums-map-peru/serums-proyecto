import Image from "next/image";
import Link from "next/link";

type Feature = {
  title: string;
  description: string;
  icon: React.ReactNode;
};

type Step = {
  title: string;
  description: string;
};

type Faq = {
  q: string;
  a: string;
};

function SectionTitle({ eyebrow, title, subtitle }: { eyebrow?: string; title: string; subtitle?: string }) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      {eyebrow ? (
        <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/70 px-4 py-2 text-xs font-semibold text-slate-700 shadow-[0_10px_30px_-22px_rgba(0,0,0,0.25)] backdrop-blur">
          {eyebrow}
        </div>
      ) : null}
      <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">{title}</h2>
      {subtitle ? <p className="mt-4 text-base font-medium leading-relaxed text-slate-600">{subtitle}</p> : null}
    </div>
  );
}

export default function LandingPage() {
  const features: Feature[] = [
    {
      title: "Encuentra mejores plazas",
      description: "Filtra por institución, categoría y región. Compara opciones sin perderte en listas.",
      icon: (
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden="true">
          <path d="M4 6h16M7 12h10M10 18h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      title: "Explora en mapa",
      description: "Navega rápido con clusters y zoom. Visualiza alrededor y ubica mejor cada establecimiento.",
      icon: (
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden="true">
          <path
            d="M9 20l-5-2V6l5 2 6-2 5 2v12l-5-2-6 2Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path d="M9 8v12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M15 6v12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      title: "Detalle y favoritos",
      description: "Abre el establecimiento, revisa información clave y guarda tus candidatos en favoritos.",
      icon: (
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden="true">
          <path
            d="M20.3 7.6a4.6 4.6 0 0 0-6.5 0L12 9.4l-1.8-1.8a4.6 4.6 0 0 0-6.5 6.5l1.8 1.8L12 21l6.5-5.1 1.8-1.8a4.6 4.6 0 0 0 0-6.5Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    {
      title: "Mejor contexto",
      description: "Ubicación del establecimiento y señales visuales para entender instituciones de un vistazo.",
      icon: (
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden="true">
          <path
            d="M12 21s7-8.6 7-13a7 7 0 1 0-14 0c0 4.4 7 13 7 13Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path d="M12 10.5v5M9.5 13h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      ),
    },
  ];

  const steps: Step[] = [
    { title: "Busca", description: "Escribe distrito, provincia o establecimiento para encontrar rápido." },
    { title: "Filtra", description: "Ajusta institución, categoría y periodo para quedarte con lo relevante." },
    { title: "Compara", description: "Abre detalles, guarda favoritos y decide con mayor claridad." },
  ];

  const faqs: Faq[] = [
    {
      q: "¿Esto reemplaza la información oficial?",
      a: "No. LISA te ayuda a visualizar y comparar en mapa; usa siempre fuentes oficiales como referencia final.",
    },
    {
      q: "¿Qué significan los colores de los marcadores?",
      a: "Representan la institución: EsSalud, MINSA, FF.AA y Otros. Así puedes ubicar grupos en segundos.",
    },
    {
      q: "¿La plataforma es gratis?",
      a: "Sí, para el uso principal. Algunas funciones futuras podrían estar sujetas a cambios, pero la base seguirá accesible.",
    },
  ];

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <header className="sticky top-0 z-50 border-b border-black/5 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link
            href="/"
            className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-black/[0.04]"
            aria-label="Ir al mapa"
          >
            <Image src="/Lisa%20personaje.png" alt="LISA" width={44} height={44} className="h-10 w-auto object-contain" priority />
            <Image src="/lisanombre.png" alt="LISA" width={160} height={44} className="h-8 w-auto object-contain" priority />
          </Link>

          <nav className="hidden items-center gap-1 sm:flex">
            <a
              href="#funciones"
              className="rounded-full px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-black/[0.04]"
            >
              Funciones
            </a>
            <a
              href="#marcadores"
              className="rounded-full px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-black/[0.04]"
            >
              Marcadores
            </a>
            <a href="#faq" className="rounded-full px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-black/[0.04]">
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#6d28d9] to-[#06b6d4] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_18px_50px_-22px_rgba(6,182,212,0.65)] transition-transform hover:scale-[1.02] active:scale-[0.99]"
            >
              Ir al mapa
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_circle_at_15%_-20%,rgba(109,40,217,0.22),transparent_55%),radial-gradient(900px_circle_at_85%_10%,rgba(6,182,212,0.18),transparent_55%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.35] [background-image:radial-gradient(rgba(15,23,42,0.18)_1px,transparent_1px)] [background-size:18px_18px]" />

        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 md:grid-cols-2 md:py-20">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/70 px-4 py-2 text-xs font-semibold text-slate-700 shadow-[0_10px_30px_-22px_rgba(0,0,0,0.25)] backdrop-blur">
              Plataforma SERUMS · Perú 2026
            </div>
            <h1 className="mt-5 text-4xl font-semibold leading-[1.05] tracking-tight text-slate-900 sm:text-5xl">
              El futuro de las{" "}
              <span className="bg-gradient-to-r from-[#6d28d9] to-[#06b6d4] bg-clip-text text-transparent">plazas SERUMS</span>{" "}
              está aquí.
            </h1>
            <p className="mt-5 max-w-xl text-base font-medium leading-relaxed text-slate-600">
              LISA es un mapa interactivo para visualizar establecimientos donde realizar el SERUMS en Perú. Filtra, compara y decide con más
              claridad.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#6d28d9] to-[#06b6d4] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_20px_60px_-30px_rgba(109,40,217,0.55)] transition-transform hover:scale-[1.02] active:scale-[0.99]"
              >
                Ir al mapa
              </Link>
              <a
                href="#funciones"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-black/10 bg-white/70 px-6 py-3.5 text-sm font-semibold text-slate-900 shadow-[0_18px_55px_-35px_rgba(0,0,0,0.28)] backdrop-blur transition-colors hover:bg-white"
              >
                Ver funciones
              </a>
            </div>

            <div className="mt-10 grid grid-cols-3 gap-3 max-w-xl">
              <div className="rounded-2xl border border-black/10 bg-white/75 p-4 shadow-[0_18px_60px_-50px_rgba(0,0,0,0.35)] backdrop-blur">
                <div className="text-xl font-semibold tracking-tight text-slate-900">Mapa</div>
                <div className="mt-1 text-xs font-semibold text-slate-600">Visual y rápido</div>
              </div>
              <div className="rounded-2xl border border-black/10 bg-white/75 p-4 shadow-[0_18px_60px_-50px_rgba(0,0,0,0.35)] backdrop-blur">
                <div className="text-xl font-semibold tracking-tight text-slate-900">Filtros</div>
                <div className="mt-1 text-xs font-semibold text-slate-600">Institución y más</div>
              </div>
              <div className="rounded-2xl border border-black/10 bg-white/75 p-4 shadow-[0_18px_60px_-50px_rgba(0,0,0,0.35)] backdrop-blur">
                <div className="text-xl font-semibold tracking-tight text-slate-900">Favoritos</div>
                <div className="mt-1 text-xs font-semibold text-slate-600">Tu shortlist</div>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 -z-10 rounded-[2.25rem] bg-gradient-to-r from-[#6d28d9] to-[#06b6d4] blur-3xl opacity-30" />

            <div className="relative overflow-hidden rounded-[2.25rem] border border-black/10 bg-white/70 p-5 shadow-[0_22px_70px_-45px_rgba(0,0,0,0.40)] backdrop-blur">
              <div className="flex items-center justify-between gap-3 text-xs font-semibold text-slate-600">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Información actualizada 2026-I
                </div>
                <div className="flex gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-black/10" />
                  <span className="h-2 w-2 rounded-full bg-black/10" />
                  <span className="h-2 w-2 rounded-full bg-[#6d28d9]" />
                </div>
              </div>

              <div className="relative mt-4 overflow-hidden rounded-[1.75rem] border border-black/10 bg-white">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(700px_circle_at_30%_-20%,rgba(109,40,217,0.10),transparent_55%),radial-gradient(700px_circle_at_75%_10%,rgba(6,182,212,0.08),transparent_55%)]" />
                <div className="relative aspect-square">
                  <Image
                    src="/lisafinal.png"
                    alt="Lisa"
                    fill
                    sizes="(max-width: 768px) 92vw, 520px"
                    className="object-contain px-10 py-10"
                    priority
                  />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-black/10 bg-white/80 px-4 py-3">
                  <div className="text-xs font-semibold text-slate-600">Señales visuales</div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">Institución por marcador</div>
                </div>
                <div className="rounded-2xl border border-black/10 bg-white/80 px-4 py-3">
                  <div className="text-xs font-semibold text-slate-600">Exploración</div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">Clusters y zoom</div>
                </div>
              </div>
            </div>

            <div className="pointer-events-none absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-[#6d28d9]/15 blur-2xl" />
            <div className="pointer-events-none absolute -top-10 -right-10 h-44 w-44 rounded-full bg-[#06b6d4]/15 blur-2xl" />
          </div>
        </div>
      </section>

      <section id="funciones" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <SectionTitle
          eyebrow="Diseñado para decidir mejor"
          title="Funciones que sí ayudan"
          subtitle="Una experiencia centrada en comparar plazas sin fricción: buscar, filtrar, abrir detalle, guardar y volver al mapa."
        />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="group rounded-[1.75rem] border border-black/10 bg-white p-6 shadow-[0_18px_60px_-50px_rgba(0,0,0,0.45)] transition-transform hover:-translate-y-0.5"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-50 text-slate-900 transition-colors group-hover:bg-slate-100">
                {f.icon}
              </div>
              <div className="mt-4 text-base font-semibold text-slate-900">{f.title}</div>
              <div className="mt-2 text-sm font-medium leading-relaxed text-slate-600">{f.description}</div>
            </div>
          ))}
        </div>

        <div className="mt-10 flex justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#6d28d9] to-[#06b6d4] px-7 py-3.5 text-sm font-semibold text-white shadow-[0_20px_60px_-30px_rgba(6,182,212,0.45)] transition-transform hover:scale-[1.02] active:scale-[0.99]"
          >
            Ir al mapa
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <div className="relative overflow-hidden rounded-[2rem] border border-black/10 bg-white shadow-[0_18px_60px_-50px_rgba(0,0,0,0.45)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1000px_circle_at_10%_-20%,rgba(109,40,217,0.12),transparent_55%),radial-gradient(900px_circle_at_95%_0%,rgba(6,182,212,0.10),transparent_55%)]" />
          <div className="relative grid gap-8 p-8 sm:p-10 lg:grid-cols-2 lg:items-center">
            <div>
              <div className="text-2xl font-semibold tracking-tight text-slate-900">Cómo funciona</div>
              <div className="mt-3 text-base font-medium leading-relaxed text-slate-600">
                LISA está pensada para iterar rápido: buscas, filtras, comparas y vuelves al mapa sin perder contexto.
              </div>
              <div className="mt-7 grid gap-3">
                {steps.map((s, idx) => (
                  <div key={s.title} className="flex items-start gap-4 rounded-2xl border border-black/10 bg-white/80 px-5 py-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                      {idx + 1}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{s.title}</div>
                      <div className="mt-1 text-sm font-medium text-slate-600">{s.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4">
              <div className="rounded-[1.75rem] border border-black/10 bg-white/85 p-6">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-slate-900">Búsqueda + Filtros</div>
                  <div className="text-xs font-semibold text-slate-600">Menos ruido</div>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50 px-5 py-4 text-sm font-semibold text-slate-800">
                    Institución (EsSalud, MINSA, FF.AA, Otros)
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-5 py-4 text-sm font-semibold text-slate-800">Categoría (I-1 a I-4)</div>
                  <div className="rounded-2xl bg-slate-50 px-5 py-4 text-sm font-semibold text-slate-800">Región / Departamento</div>
                  <div className="rounded-2xl bg-slate-50 px-5 py-4 text-sm font-semibold text-slate-800">Periodo SERUMS</div>
                </div>
              </div>

              <div className="rounded-[1.75rem] border border-black/10 bg-white/85 p-6">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-slate-900">Guardado</div>
                  <div className="text-xs font-semibold text-slate-600">Tu shortlist</div>
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white">
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
                      <path
                        d="M20.3 7.6a4.6 4.6 0 0 0-6.5 0L12 9.4l-1.8-1.8a4.6 4.6 0 0 0-6.5 6.5l1.8 1.8L12 21l6.5-5.1 1.8-1.8a4.6 4.6 0 0 0 0-6.5Z"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900">Favoritos</div>
                    <div className="mt-1 text-sm font-medium text-slate-600">Marca establecimientos para revisarlos luego sin repetir búsquedas.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="marcadores" className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <SectionTitle
          eyebrow="Señales en el mapa"
          title="Marcadores por institución"
          subtitle="Reconoce el tipo de establecimiento al instante. Los marcadores del mapa ya usan estos íconos."
        />

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "EsSalud", src: "/EsSalud.png" },
            { label: "MINSA", src: "/MINSA.png" },
            { label: "FF.AA", src: "/FF.AA.png" },
            { label: "Otros", src: "/Otros.png" },
          ].map((m) => (
            <div
              key={m.label}
              className="rounded-[1.75rem] border border-black/10 bg-white p-6 shadow-[0_18px_60px_-50px_rgba(0,0,0,0.45)]"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50">
                  <Image src={m.src} alt={m.label} width={40} height={54} className="h-12 w-auto object-contain" />
                </div>
                <div className="min-w-0">
                  <div className="text-base font-semibold text-slate-900">{m.label}</div>
                  <div className="mt-1 text-sm font-medium text-slate-600">Marcador del mapa</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="faq" className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <SectionTitle eyebrow="Respuestas rápidas" title="Preguntas frecuentes" subtitle="Lo esencial sobre el uso de LISA y lo que ves en el mapa." />
        <div className="mt-10 grid gap-4">
          {faqs.map((f) => (
            <details
              key={f.q}
              className="group rounded-[1.75rem] border border-black/10 bg-white p-6 shadow-[0_18px_60px_-50px_rgba(0,0,0,0.45)]"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                <div className="text-base font-semibold text-slate-900">{f.q}</div>
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-50 text-slate-900 transition-transform group-open:rotate-45">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
                    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </div>
              </summary>
              <div className="mt-3 text-sm font-medium leading-relaxed text-slate-600">{f.a}</div>
            </details>
          ))}
        </div>
      </section>

      <footer className="border-t border-black/5 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 sm:px-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Image src="/Lisa%20personaje.png" alt="LISA" width={44} height={44} className="h-9 w-auto object-contain" />
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-900">LISA</div>
              <div className="text-xs font-semibold text-slate-600">Mapa interactivo SERUMS · Perú</div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#6d28d9] to-[#06b6d4] px-6 py-3 text-sm font-semibold text-white shadow-[0_20px_60px_-30px_rgba(6,182,212,0.45)] transition-transform hover:scale-[1.02] active:scale-[0.99]"
            >
              Ir al mapa
            </Link>
            <a
              href="#funciones"
              className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white px-6 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-50"
            >
              Volver arriba
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
