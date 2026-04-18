import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Navbar from '@/components/Navbar';
import ReportesView from '@/components/ReportesView';

export default async function ReportesPage() {
  const session = await auth();
  if (!session) redirect('/login');

  return (
    <>
      <Navbar />
      <main className="max-w-5xl mx-auto px-6 pt-8">
        <ReportesView />
      </main>
    </>
  );
}
