import { DashboardTeaser } from "@/components/DashboardTeaser";
import { EarlyBird } from "@/components/EarlyBird";
import { Features } from "@/components/Features";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/Hero";
import { Navbar } from "@/components/Navbar";
import { Team } from "@/components/Team";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar
        productName="LISA"
        primaryCta="Ir al mapa"
        links={[
          { label: "Funciones", href: "#features" },
          { label: "Plataforma", href: "#dashboard" },
          { label: "Equipo", href: "#team" },
        ]}
      />
      <main>
        <Hero
          productName="LISA"
          badge="Plataforma SERUMS · Perú 2026"
          titleLines={["El futuro de las", "plazas\nSERUMS", "está aquí."]}
          description="LocalLisa es una herramienta que busca facilitar a los serumistas del Perú a tomar una decisión más eficiente y de manera más visual."
          primaryCta={{ label: "Ir al mapa", href: "/" }}
          secondaryCta={{ label: "Ver cómo funciona", href: "#features" }}
          stat1="+20,093 plazas indexadas"
          stat2="25 regiones del Perú"
          heroImageSrc="/Lisa personaje.png"
          chip1="Plazas SERUMS"
          metrics={[
            { value: "2026-1", label: "Actualizado" },
            { value: "17", label: "Carreras" },
            { value: "+5mil", label: "Establecimientos" },
          ]}
        />
        <Features
          eyebrow="Funciones"
          title="Todo lo esencial para"
          titleHighlight="decidir mejor"
          description="Diseñado para comparar plazas de manera visual: buscar, filtrar, revisar detalle y volver al mapa sin perder contexto."
          feature1={{
            title: "Filtra por intereses",
            tags: ["Distrito", "Provincia", "Establecimiento"],
            query: "“Hospital regional…”",
          }}
          feature2={{
            title: "Mapa interactivo",
            chip: "Señales visuales",
          }}
          feature3={{
            title: "Checklist de plazas",
            items: [
              { name: "I-3 · Alta demanda", subtitle: "Revisa bonos y categoría", badge: "Top" },
              { name: "I-2 · Balanceado", subtitle: "Compara ubicación y rutas", badge: "Nuevo" },
              { name: "I-1 · Exploración", subtitle: "Opciones rápidas en mapa", badge: "Rápido" },
            ],
          }}
        />
        <DashboardTeaser />
        <Team />
        <EarlyBird
          title="Acceso Early Bird"
          subtitle="Recibe acceso temprano y novedades del periodo. Solo UI por ahora: te avisamos cuando esté listo."
        />
      </main>
      <Footer
        year={new Date().getFullYear()}
        productName="LISA"
        links={[
          { label: "Funciones", href: "#features" },
          { label: "Plataforma", href: "#dashboard" },
          { label: "Equipo", href: "#team" },
          { label: "Early Bird", href: "#early" },
        ]}
      />
    </div>
  );
}
