'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signIn, signOut, useSession } from 'next-auth/react';
import { CalendarDays, FolderOpen, Wallet, X, Lock, LogOut, Truck, FileSpreadsheet, Plus, ArrowDownCircle, ClipboardList } from 'lucide-react';
import type { Viaje } from '@/types';
import FinancialPanel from './FinancialPanel';
import ClockWidget from './ClockWidget';
import ConsejosSunat from './ConsejosSunat';
import PwaInstallHelp from './PwaInstallHelp';
import styles from './MobileSidebar.module.css';

export default function MobileSidebar({ initialViajes, canManage, onClose }: {
  initialViajes?: Viaje[]; canManage: boolean; onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const id = useId();
  const pathname = usePathname();
  const { data: session } = useSession();
  const [section, setSection] = useState<'cuenta' | 'documentos' | 'calendario'>('cuenta');

  useEffect(() => {
    const element = dialog.current;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    element?.showModal();
    document.body.style.overflow = 'hidden';
    const goToViaje = () => onClose();
    const desktop = window.matchMedia('(min-width: 1024px)');
    const resize = () => { if (desktop.matches && document.querySelectorAll('dialog[open]').length === 1) onClose(); };
    window.addEventListener('goto-viaje-date', goToViaje);
    desktop.addEventListener('change', resize);
    return () => {
      window.removeEventListener('goto-viaje-date', goToViaje);
      desktop.removeEventListener('change', resize);
      element?.close();
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus({ preventScroll: true });
    };
  }, [onClose]);

  const action = (name: string) => {
    onClose();
    window.dispatchEvent(new CustomEvent('mobile-viajes-action', { detail: name }));
  };

  const sections = [
    { value: 'cuenta', label: 'Cuenta', icon: Wallet },
    { value: 'documentos', label: 'Documentos', icon: FolderOpen },
    ...(pathname === '/' ? [{ value: 'calendario', label: 'Calendario', icon: CalendarDays }] : []),
  ] as const;

  return createPortal(
    <dialog ref={dialog} className={styles.drawer} aria-labelledby={`${id}-title`}
      onCancel={event => { event.preventDefault(); onClose(); }}
      onClick={event => { if (event.target === event.currentTarget) {
        const rect = event.currentTarget.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose();
      } }}>
      <header className={styles.header}>
        <div><h2 id={`${id}-title`}>TransMedina</h2><p>Tu operación, a la mano</p></div>
        <button type="button" className={styles.close} onClick={onClose} aria-label="Cerrar menú lateral" autoFocus><X size={20} /></button>
      </header>
      <nav className={styles.navigation} aria-label="Navegación principal">
        <Link href="/" onClick={onClose} aria-current={pathname === '/' ? 'page' : undefined}><Truck size={17} />Viajes</Link>
        <Link href="/reportes" onClick={onClose} aria-current={pathname === '/reportes' ? 'page' : undefined}><FileSpreadsheet size={17} />Reportes</Link>
      </nav>
      {pathname === '/' && <div className={styles.actions}>
        {canManage && <>
          <button type="button" onClick={() => action('viaje')}><Plus size={16} />Nuevo viaje</button>
          <button type="button" onClick={() => action('deposito')}><ArrowDownCircle size={16} />Registrar depósito</button>
          <button type="button" onClick={() => action('facturas')}><ClipboardList size={16} />Facturas pendientes</button>
        </>}
        <button type="button" onClick={() => action('exportar')}><FileSpreadsheet size={16} />Exportar Excel</button>
      </div>}
      <div className={styles.sections} role="group" aria-label="Herramientas de la operación">
        {sections.map(({ value, label, icon: Icon }) => <button key={value} type="button" aria-pressed={section === value}
          onClick={() => setSection(value as typeof section)}><Icon size={16} aria-hidden="true" />{label}</button>)}
      </div>
      <div className={styles.content}>
        {section === 'cuenta' && <><FinancialPanel initialViajes={initialViajes} vista="cuenta" /><p className={styles.hint}>Toca el saldo para consultar depósitos, gráficos y el detalle de cada mes.</p></>}
        {section === 'documentos' && <FinancialPanel initialViajes={initialViajes} vista="documentos" />}
        {section === 'calendario' && <><ClockWidget /><div className={styles.advice}><ConsejosSunat /></div></>}
      </div>
      <footer className={styles.footer}>
        <PwaInstallHelp />
        {session ? <button type="button" onClick={() => { onClose(); void signOut({ callbackUrl: '/' }); }}><LogOut size={16} />Cerrar sesión</button>
          : <button type="button" onClick={() => { onClose(); void signIn('google', { callbackUrl: '/' }); }}><Lock size={16} />Acceso administrador</button>}
      </footer>
    </dialog>, document.body,
  );
}
