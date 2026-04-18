'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { Truck, BarChart2, LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';

const navLinks = [
  { href: '/',         label: 'Viajes'   },
  { href: '/reportes', label: 'Reportes' },
];

export default function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    /* Floating pill — 24px below viewport top, never flush */
    <div className="sticky top-0 z-40 pointer-events-none">
      <div className="max-w-5xl mx-auto px-6 pt-4">
        <nav
          className="pointer-events-auto flex items-center justify-between px-6 h-14"
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
            <span className="text-sm font-semibold tracking-tight hidden sm:block" style={{ color: 'var(--ink)', letterSpacing: '-0.02em' }}>
              TransMedina
            </span>
          </Link>

          {/* Desktop links — centered */}
          <div className="hidden sm:flex items-center gap-1">
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

          {/* Right — user + logout */}
          <div className="hidden sm:flex items-center gap-3">
            {session?.user?.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={session.user.image}
                alt="avatar"
                className="w-7 h-7 rounded-full"
                style={{ border: '1.5px solid var(--dust)' }}
              />
            )}
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs transition-all duration-150"
              style={{
                borderRadius: 'var(--r-pill)',
                color: 'var(--slate)',
                fontWeight: 450,
                border: '1px solid transparent',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(20,20,19,.15)';
                (e.currentTarget as HTMLElement).style.color = 'var(--signal)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.borderColor = 'transparent';
                (e.currentTarget as HTMLElement).style.color = 'var(--slate)';
              }}
            >
              <LogOut size={13} />
              Salir
            </button>
          </div>

          {/* Mobile hamburger */}
          <button
            className="sm:hidden w-9 h-9 flex items-center justify-center rounded-full transition-colors"
            style={{ color: 'var(--ink)' }}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </nav>

        {/* Mobile dropdown — also pill-shaped */}
        {menuOpen && (
          <div
            className="sm:hidden mt-2 px-4 py-3 space-y-1 anim-scale-in pointer-events-auto"
            style={{
              background: 'var(--white)',
              borderRadius: 'var(--r-hero)',
              boxShadow: 'var(--shadow-card)',
              border: '1px solid rgba(20,20,19,.06)',
            }}
          >
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                className="flex items-center px-4 py-3 text-sm transition-colors"
                style={{
                  borderRadius: 'var(--r-btn)',
                  fontWeight: pathname === href ? 500 : 450,
                  background: pathname === href ? 'var(--ink)' : 'transparent',
                  color: pathname === href ? 'var(--canvas)' : 'var(--ink)',
                  letterSpacing: '-0.02em',
                }}
              >
                {label}
              </Link>
            ))}
            <div style={{ height: '1px', background: 'rgba(20,20,19,.08)', margin: '4px 0' }} />
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="flex items-center gap-2 px-4 py-3 text-sm w-full"
              style={{ borderRadius: 'var(--r-btn)', color: 'var(--signal)', fontWeight: 450 }}
            >
              <LogOut size={14} />
              Cerrar sesión
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
