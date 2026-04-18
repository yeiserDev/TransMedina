import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Navbar from '@/components/Navbar';
import ViajesTable from '@/components/ViajesTable';
import ClockWidget from '@/components/ClockWidget';
import FinancialPanel from '@/components/FinancialPanel';

export default async function HomePage() {
  const session = await auth();
  if (!session) redirect('/login');

  return (
    <>
      <Navbar />
      <main className="max-w-screen-2xl mx-auto px-4 sm:px-0 pt-8">
        <div className="lg:grid lg:grid-cols-[220px_1fr_240px] lg:gap-5 lg:items-start">

          {/* Panel izquierdo — Finanzas */}
          <aside className="hidden lg:block lg:sticky lg:top-24">
            <FinancialPanel />
          </aside>

          {/* Contenido principal */}
          <div className="min-w-0">
            <ViajesTable />
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
