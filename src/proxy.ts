import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

// Rutas que cualquiera puede ver sin iniciar sesión
const PUBLIC_PATHS = ['/', '/reportes', '/login', '/secretaria', '/reporte-cliente'];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;

  // Permitir rutas públicas sin login
  const isPublic = PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'));
  if (isPublic) {
    // Si ya está logueado y va a /login, redirigir al inicio
    if (isLoggedIn && pathname === '/login') {
      return NextResponse.redirect(new URL('/', req.url));
    }
    return NextResponse.next();
  }

  // El resto requiere estar logueado
  if (!isLoggedIn) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
