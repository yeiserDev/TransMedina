import Navbar from '@/components/Navbar';
import ReportesView from '@/components/ReportesView';
import { createAdminClient } from '@/lib/supabase/server';
import { Viaje } from '@/types';

export default async function ReportesPage() {
  const supabase = await createAdminClient();
  const { data } = await supabase
    .from('viajes')
    .select('*')
    .order('fecha_traslado', { ascending: false });

  const initialViajes: Viaje[] = data ?? [];

  return (
    <>
      <Navbar />
      <main className="max-w-5xl mx-auto px-6 pt-8">
        <ReportesView initialViajes={initialViajes} />
      </main>
    </>
  );
}
