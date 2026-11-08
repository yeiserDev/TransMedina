'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Check, ChevronDown, Truck } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { isAdminEmail } from '@/lib/admin';

export default function WorkspaceSwitch({ canManage }: { canManage: boolean }) {
  const { data: session } = useSession();
  const external = usePathname().startsWith('/externos');
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); button.current?.focus(); } };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', escape); };
  }, [open]);
  const mark = <><span className="w-8 h-8 rounded-full flex items-center justify-center bg-[var(--ink)] text-white"><Truck size={14} /></span><span><span className="block text-sm font-semibold">TransMedina</span><span className="block text-[11px] text-[var(--slate)]">{external ? 'Viajes externos' : 'Transportes FART'}</span></span></>;
  if (!canManage && !isAdminEmail(session?.user?.email)) return <Link href="/" className="flex items-center gap-2.5">{mark}</Link>;
  return <div ref={root} className="relative" onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false); }}>
    <button ref={button} type="button" aria-expanded={open} aria-controls="workspace-options" onClick={() => setOpen(!open)} className="flex items-center gap-2.5 text-left min-h-11 rounded-xl focus-visible:outline-2 focus-visible:outline-[var(--signal)]">{mark}<ChevronDown size={14} /></button>
    {open && <div id="workspace-options" className="absolute left-0 top-full mt-3 w-64 rounded-2xl bg-white p-2 shadow-xl border border-[var(--dust)]">
      {[{ href: '/', name: 'Transportes FART', active: !external }, { href: '/externos', name: 'Viajes externos', active: external }].map(item => <Link key={item.href} href={item.href} onClick={() => setOpen(false)} aria-current={item.active ? 'page' : undefined} className="flex items-center justify-between rounded-xl px-3 py-3 text-sm hover:bg-[var(--canvas)] focus-visible:outline-2 focus-visible:outline-[var(--signal)]">{item.name}{item.active && <Check size={15} />}</Link>)}
    </div>}
  </div>;
}
