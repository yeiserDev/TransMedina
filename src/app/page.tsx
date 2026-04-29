import { auth } from '@/lib/auth';
import Navbar from '@/components/Navbar';
import ViajesTable from '@/components/ViajesTable';
import ClockWidget from '@/components/ClockWidget';
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
      <Navbar />
      <main className="max-w-screen-2xl mx-auto px-4 sm:px-0 pt-8">
        <div className="lg:grid lg:grid-cols-[165px_1fr_200px] lg:gap-4 lg:items-start">

          {/* Panel izquierdo — Finanzas */}
          <aside className="hidden lg:block lg:sticky lg:top-24">
            <FinancialPanel isAdmin={isAdmin} initialViajes={initialViajes} />
          </aside>

          {/* Contenido principal */}
          <div className="min-w-0">
            <ViajesTable readOnly={!isAdmin} initialViajes={initialViajes} />
          </div>

          {/* Panel derecho — Reloj y calendario */}
          <aside className="hidden lg:block lg:sticky lg:top-24">
            <ClockWidget />
          </aside>

        </div>
      </main>
    </>
  );
}
