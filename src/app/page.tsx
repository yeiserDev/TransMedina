import { auth } from '@/lib/auth';
import Navbar from '@/components/Navbar';
import ViajesTable from '@/components/ViajesTable';
import ClockWidget from '@/components/ClockWidget';
import DetraccionesWidget from '@/components/DetraccionesWidget';
import FinancialPanel from '@/components/FinancialPanel';
import { createAdminClient } from '@/lib/supabase/server';
import { Viaje } from '@/types';

const ADMIN_EMAIL = 'yeiseravilamedina48@gmail.com';

export default async function HomePage() {
  const [session, supabase] = await Promise.all([auth(), createAdminClient()]);
  const isAdmin = session?.user?.email === ADMIN_EMAIL;

  const { data } = await supabase
    .from('viajes')
    .select('*')
    .order('fecha_traslado', { ascending: false });

  const initialViajes: Viaje[] = data ?? [];

  return (
    <>
      <Navbar initialViajes={initialViajes} canManage={isAdmin} />
      <main className="max-w-screen-2xl mx-auto px-4 sm:px-0 pt-4 lg:pt-8">
        <div className="lg:grid lg:grid-cols-[220px_minmax(0,1fr)_200px] xl:grid-cols-[240px_minmax(0,1fr)_200px] lg:gap-4 lg:items-start">

          {/* Panel izquierdo — Finanzas */}
          <aside className="dashboard-sidebar hidden lg:block lg:sticky lg:top-24 lg:max-h-[calc(100dvh-120px)] lg:overflow-hidden">
            <FinancialPanel initialViajes={initialViajes} showStorage={isAdmin} />
          </aside>

          {/* Contenido principal */}
          <div className="min-w-0">
            <ViajesTable readOnly={!isAdmin} initialViajes={initialViajes} />
          </div>

          {/* Panel derecho — Reloj y calendario */}
          <aside aria-label="Calendario y detracciones" tabIndex={0} className="dashboard-sidebar scrollbar-hidden hidden lg:block lg:sticky lg:top-24 lg:max-h-[calc(100dvh-120px)] lg:overflow-y-auto lg:overscroll-contain focus-visible:outline-2 focus-visible:outline-[var(--signal)]">
            <ClockWidget initialViajes={initialViajes} />
            <DetraccionesWidget initialViajes={initialViajes} canManage={isAdmin} />
          </aside>

        </div>
      </main>
    </>
  );
}
