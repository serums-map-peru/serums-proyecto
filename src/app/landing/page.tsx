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
          titleLines={["Encuentra tu plaza SERUMS", "con claridad", "y en mapa."]}
          description="Explora establecimientos en un mapa interactivo, filtra por institución y categoría, y arma tu shortlist en minutos."
          primaryCta={{ label: "Acceso Early Bird", href: "#early" }}
          secondaryCta={{ label: "Ver funciones", href: "#features" }}
          stat1="Actualizado 2026-I"
          stat2="Miles de establecimientos"
          heroImageSrc="/lisafinal.png"
          chip1="Decisiones más rápidas"
          chip2="Mapa + filtros"
          metrics={[
            { value: "4", label: "Instituciones" },
            { value: "I-1 → I-4", label: "Categorías" },
            { value: "2026-I", label: "Periodo" },
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
        <DashboardTeaser
          eyebrow="Plataforma"
          title="Un dashboard"
          titleHighlight="premium"
          description="Un vistazo claro: región, establecimiento, categoría y vacantes. Visual, consistente y rápido."
          rows={[
            { region: "Lima", establecimiento: "Hospital X", categoria: "I-3", vacantes: "12", badge: "Activo" },
            { region: "Arequipa", establecimiento: "Centro de Salud Y", categoria: "I-2", vacantes: "7", badge: "Nuevo" },
            { region: "Cusco", establecimiento: "Hospital Z", categoria: "I-4", vacantes: "3", badge: "Top" },
            { region: "Piura", establecimiento: "Puesto A", categoria: "I-1", vacantes: "9", badge: "Activo" },
          ]}
        />
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
