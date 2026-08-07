import Navbar from '@/components/Navbar';

/**
 * Esqueleto que aparece al instante al navegar a /reportes, mientras el servidor
 * consulta los viajes. Sin esto la navegación se queda congelada en la página
 * anterior hasta que termina la query — que es el "delay" que se siente.
 */
export default function LoadingReportes() {
  return (
    <>
      <Navbar />
      <main className="max-w-5xl mx-auto px-3 sm:px-6 pt-5 sm:pt-8">
        <div className="space-y-5 pb-16">

          {/* Header */}
          <div className="flex items-end justify-between gap-4 pt-2">
            <div>
              <p className="eyebrow mb-1.5 sm:mb-2">Análisis</p>
              <h1 className="text-3xl sm:text-4xl" style={{ fontWeight: 500, letterSpacing: '-0.02em' }}>
                Reportes
              </h1>
            </div>
            <div className="skeleton" style={{ height: 36, width: 96, borderRadius: 'var(--r-pill)' }} />
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="skeleton rounded-2xl sm:rounded-3xl" style={{ height: 86 }} />
            ))}
          </div>

          {/* Estado de cuenta */}
          <p className="eyebrow">Estado de cuenta</p>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="skeleton rounded-3xl" style={{ height: 64 }} />
            ))}
          </div>

        </div>
      </main>
    </>
  );
}
