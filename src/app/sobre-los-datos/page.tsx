export default function SobreLosDatosPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-12 text-foreground sm:px-6">
      <div className="mx-auto max-w-4xl rounded-3xl border border-border bg-white p-6 shadow-soft sm:p-10">
        <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Sobre los datos de LISA</h1>

        <div className="mt-6 grid gap-5 text-sm font-medium leading-relaxed text-muted-foreground sm:text-base">
          <p>
            LISA utiliza información publicada por el Ministerio de Salud (MINSA) y otras fuentes oficiales del Estado
            peruano para mostrar las plazas SERUMS disponibles. Esta información se presenta tal como fue publicada por
            dichas entidades.
          </p>

          <p>
            <span className="font-semibold text-foreground">Precisión de ubicaciones.</span> Las coordenadas geográficas
            de los establecimientos de salud provienen de registros oficiales (RENIPRESS, Anexo 3, entre otros). Algunos
            de estos registros contienen coordenadas inexactas, incompletas o desactualizadas, lo que puede provocar que
            ciertos establecimientos aparezcan en una ubicación diferente a la real en el mapa.
          </p>

          <p>
            LISA no genera, modifica ni garantiza la exactitud de los datos de ubicación. La información se muestra con
            fines orientativos y referenciales. Cualquier decisión basada en esta información es responsabilidad exclusiva
            del usuario.
          </p>

          <p>
            <span className="font-semibold text-foreground">Recomendación.</span> Antes de postular a una plaza, verifica
            la ubicación y condiciones del establecimiento directamente con la Dirección Regional de Salud (DIRESA) o la
            Red de Salud correspondiente.
          </p>

          <p>
            <span className="font-semibold text-foreground">Mejora continua.</span> Trabajamos activamente para mejorar la
            precisión de los datos. Si encuentras un error, puedes reportarlo usando el botón “Reportar error” disponible
            en cada plaza. Tu reporte nos ayuda a mejorar la herramienta para todos.
          </p>
        </div>

        <div className="mt-8">
          <a
            href="/map"
            className="inline-flex items-center rounded-full bg-black px-5 py-3 text-sm font-semibold text-white hover:bg-black/90"
          >
            Volver al mapa
          </a>
        </div>
      </div>
    </main>
  );
}

