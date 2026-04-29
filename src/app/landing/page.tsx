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
        primaryCta="Acceso Early Bird"
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
          heroImageSrc="/lisafinal.png"
          chip1="Plazas SERUMS"
          chip2="Ir al mapa"
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
            title: "Búsqueda inteligente",
            tags: ["Distrito", "Provincia", "Establecimiento"],
            query: "“Hospital regional…”",
          }}
          feature2={{
            title: "Mapa por institución",
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
        <Team
          eyebrow="El Equipo"
          title="Hecho por personas"
          titleHighlight="obsesionadas"
          titleEnd="con claridad"
          members={[
            { name: "Mathías", role: "Producto · SERUMS", photoSrc: "/lisafinal.png", social: { type: "linkedin", href: "#" } },
            { name: "Andrea", role: "UX/UI", photoSrc: "/lisafinal.png", social: { type: "instagram", href: "#" } },
            { name: "Carlos", role: "Frontend", photoSrc: "/lisafinal.png", social: { type: "github", href: "#" } },
            { name: "Valeria", role: "Datos", photoSrc: "/lisafinal.png", social: { type: "twitter", href: "#" } },
            { name: "Luis", role: "Backend", photoSrc: "/lisafinal.png", social: { type: "github", href: "#" } },
          ]}
        />
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
