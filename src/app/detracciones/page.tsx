import { auth } from '@/lib/auth';
import Navbar from '@/components/Navbar';
import DetraccionesView from '@/components/DetraccionesView';
import { createAdminClient } from '@/lib/supabase/server';
import { Viaje } from '@/types';

const ADMIN_EMAIL = 'yeiseravilamedina48@gmail.com';

export const metadata = {
  title: 'Detracciones SUNAT | TransMedina',
  description: 'Control y liquidación de detracciones del 4% SPOT SUNAT',
};

export default async function DetraccionesPage() {
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
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-5 sm:pt-8">
        <DetraccionesView initialViajes={initialViajes} readOnly={!isAdmin} />
      </main>
    </>
  );
}
