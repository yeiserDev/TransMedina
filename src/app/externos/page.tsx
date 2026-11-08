import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { isAdminEmail } from '@/lib/admin';
import Navbar from '@/components/Navbar';
import ExternosWorkspace from '@/components/ExternosWorkspace';

export default async function ExternosPage() {
  if (!isAdminEmail((await auth())?.user?.email)) redirect('/login');
  return <><Navbar canManage /><ExternosWorkspace /></>;
}
