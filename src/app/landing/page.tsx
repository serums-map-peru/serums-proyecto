import Image from "next/image";
import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white">
      <header className="sticky top-0 z-50 border-b border-black/5 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-black/[0.04]" aria-label="Ir al mapa">
            <Image src="/Lisa%20personaje.png" alt="LISA" width={44} height={44} className="h-10 w-auto object-contain" priority />
            <Image src="/lisanombre.png" alt="LISA" width={160} height={44} className="h-8 w-auto object-contain" priority />
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#6d28d9] to-[#06b6d4] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_18px_50px_-22px_rgba(6,182,212,0.65)] transition-transform hover:scale-[1.02] active:scale-[0.99]"
            >
              Ir al mapa
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_circle_at_15%_-20%,rgba(109,40,217,0.22),transparent_55%),radial-gradient(900px_circle_at_85%_10%,rgba(6,182,212,0.18),transparent_55%)]" />
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 md:grid-cols-2 md:py-20">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/70 px-4 py-2 text-xs font-semibold text-slate-700 shadow-[0_10px_30px_-22px_rgba(0,0,0,0.25)] backdrop-blur">
              Plataforma SERUMS · Perú 2026
            </div>
            <h1 className="mt-5 text-4xl font-semibold leading-[1.05] tracking-tight text-slate-900 sm:text-5xl">
              El futuro de las <span className="bg-gradient-to-r from-[#6d28d9] to-[#06b6d4] bg-clip-text text-transparent">plazas SERUMS</span> está aquí.
            </h1>
            <p className="mt-5 max-w-xl text-base font-medium leading-relaxed text-slate-600">
              LISA es un mapa interactivo para visualizar establecimientos donde realizar el SERUMS en Perú. Filtra, compara y decide de forma más visual.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#6d28d9] to-[#06b6d4] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_20px_60px_-30px_rgba(109,40,217,0.55)] transition-transform hover:scale-[1.02] active:scale-[0.99]"
              >
                Ir al mapa
              </Link>
              <a
                href="#funciones"
                className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/70 px-6 py-3.5 text-sm font-semibold text-slate-900 shadow-[0_18px_55px_-35px_rgba(0,0,0,0.28)] backdrop-blur hover:bg-white"
              >
                Ver funciones
              </a>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 -z-10 rounded-[2rem] bg-gradient-to-r from-[#6d28d9] to-[#06b6d4] blur-3xl opacity-30" />
            <div className="relative overflow-hidden rounded-[2rem] border border-black/10 bg-white/70 p-5 shadow-[0_22px_70px_-45px_rgba(0,0,0,0.40)] backdrop-blur">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
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
              <div className="relative mt-4 aspect-square overflow-hidden rounded-[1.5rem] bg-white">
                <Image
                  src="/Lisa%20personaje.png"
                  alt="Lisa"
                  fill
                  sizes="(max-width: 768px) 92vw, 520px"
                  className="object-contain px-10 py-10"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="funciones" className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <div className="grid gap-4 rounded-[2rem] border border-black/10 bg-white p-7 shadow-[0_18px_60px_-50px_rgba(0,0,0,0.40)]">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Funciones</h2>
          <div className="grid gap-3 text-sm font-medium text-slate-600 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 px-5 py-4">Filtros por institución, categoría y región</div>
            <div className="rounded-2xl bg-slate-50 px-5 py-4">Vista en mapa con clusters para navegar rápido</div>
            <div className="rounded-2xl bg-slate-50 px-5 py-4">Detalle por establecimiento y favoritos</div>
            <div className="rounded-2xl bg-slate-50 px-5 py-4">Búsqueda por distrito, provincia o establecimiento</div>
          </div>
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#6d28d9] to-[#06b6d4] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_20px_60px_-30px_rgba(6,182,212,0.45)] transition-transform hover:scale-[1.02] active:scale-[0.99]"
            >
              Ir al mapa
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
