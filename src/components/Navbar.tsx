'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signIn, signOut, useSession } from 'next-auth/react';
import { Truck, LogOut, Menu, Lock } from 'lucide-react';
import { useCallback, useState } from 'react';
import type { Viaje } from '@/types';
import MobileSidebar from './MobileSidebar';

const navLinks = [
  { href: '/',         label: 'Viajes'   },
  { href: '/reportes', label: 'Reportes' },
];

export default function Navbar({ initialViajes, canManage = false }: { initialViajes?: Viaje[]; canManage?: boolean }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  return (
    /* Floating pill — 24px below viewport top, never flush */
    <div className="app-navigation sticky top-0 z-40 pointer-events-none">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-3 sm:pt-4">
        <nav
          className="pointer-events-auto flex items-center justify-between px-4 sm:px-6 h-14"
          style={{
            background: 'var(--white)',
            borderRadius: 'var(--r-pill)',
            boxShadow: 'var(--shadow-float)',
            border: '1px solid rgba(20,20,19,.06)',
          }}
        >
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: 'var(--ink)' }}
            >
              <Truck size={14} style={{ color: 'var(--canvas)' }} />
            </div>
            <span className="text-sm font-semibold tracking-tight" style={{ color: 'var(--ink)', letterSpacing: '-0.02em' }}>
              TransMedina
            </span>
          </Link>

          {/* Desktop links — centered */}
          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map(({ href, label }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className="px-4 py-2 text-sm transition-all duration-150"
                  style={{
                    borderRadius: 'var(--r-pill)',
                    fontWeight: active ? 500 : 450,
                    background: active ? 'var(--ink)' : 'transparent',
                    color: active ? 'var(--canvas)' : 'var(--slate)',
                    letterSpacing: '-0.02em',
                  }}
                >
                  {label}
                </Link>
              );
            })}
          </div>

          {/* Right — admin indicator or login */}
          <div className="hidden lg:flex items-center gap-3">
            {session ? (
              <>
                {session.user?.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={session.user.image}
                    alt="avatar"
                    className="w-7 h-7 rounded-full"
                    style={{ border: '1.5px solid var(--dust)' }}
                  />
                )}
                <button
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs transition-all duration-150"
                  style={{ borderRadius: 'var(--r-pill)', color: 'var(--slate)', fontWeight: 450, border: '1px solid transparent' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(20,20,19,.15)'; (e.currentTarget as HTMLElement).style.color = 'var(--signal)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--slate)'; }}
                >
                  <LogOut size={13} />
                  Salir
                </button>
              </>
            ) : (
              <button
                onClick={() => signIn('google', { callbackUrl: '/' })}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs transition-all duration-150"
                style={{ borderRadius: 'var(--r-pill)', color: 'var(--slate)', fontWeight: 450, border: '1px solid rgba(20,20,19,.12)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(20,20,19,.25)'; (e.currentTarget as HTMLElement).style.color = 'var(--ink)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(20,20,19,.12)'; (e.currentTarget as HTMLElement).style.color = 'var(--slate)'; }}
              >
                <Lock size={12} />
                Admin
              </button>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="lg:hidden h-11 px-3 flex items-center justify-center gap-2 rounded-full transition-colors"
            style={{ color: 'var(--ink)' }}
            aria-label="Abrir menú y herramientas"
            aria-haspopup="dialog"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
          >
            <Menu size={18} /><span className="text-xs">Menú</span>
          </button>
        </nav>

        {menuOpen && <MobileSidebar initialViajes={initialViajes} canManage={canManage} onClose={closeMenu} />}
      </div>
    </div>
  );
}
