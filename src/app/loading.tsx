import Navbar from '@/components/Navbar';

/** Esqueleto instantáneo al volver a la lista de viajes desde otra ruta. */
export default function LoadingHome() {
  return (
    <>
      <Navbar />
      <main className="max-w-screen-2xl mx-auto px-4 sm:px-0 pt-8">
        <div className="lg:grid lg:grid-cols-[165px_1fr_200px] lg:gap-4 lg:items-start">

          <aside className="hidden lg:block space-y-4">
            <div className="skeleton rounded-3xl" style={{ height: 80 }} />
            <div className="space-y-1">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="skeleton rounded-lg" style={{ height: 30 }} />
              ))}
            </div>
          </aside>

          <div className="min-w-0 space-y-5">
            <div className="skeleton rounded-3xl" style={{ height: 52 }} />
            <div className="space-y-2">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="skeleton rounded-2xl" style={{ height: 44 }} />
              ))}
            </div>
          </div>

          <aside className="hidden lg:block space-y-4">
            <div className="skeleton rounded-3xl" style={{ height: 120 }} />
            <div className="skeleton rounded-3xl" style={{ height: 220 }} />
          </aside>

        </div>
      </main>
    </>
  );
}
