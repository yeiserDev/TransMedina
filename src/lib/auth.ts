import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: [
            'openid',
            'email',
            'profile',
            'https://www.googleapis.com/auth/drive.file',
          ].join(' '),
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      // Solo permite el acceso al administrador
      return user.email === 'yeiseravilamedina48@gmail.com';
    },
    async jwt({ token, account }) {
      // Primer login: guardar tokens y expiración
      if (account) {
        // Persistir refresh_token del admin para usarlo server-side sin sesión activa
        if (account.refresh_token) {
          try {
            const { createClient } = await import('@supabase/supabase-js');
            const sb = createClient(
              process.env.NEXT_PUBLIC_SUPABASE_URL!,
              process.env.SUPABASE_SERVICE_ROLE_KEY!
            );
            await sb.from('reporte_tokens').delete().eq('cliente_nombre', '__drive_admin');
            await sb.from('reporte_tokens').insert({
              cliente_nombre: '__drive_admin',
              token: account.refresh_token,
              activo: true,
            });
          } catch { /* silent */ }
        }
        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          accessTokenExpires: account.expires_at ? account.expires_at * 1000 : Date.now() + 3600_000,
        };
      }

      // Token vigente (con 2 min de margen)
      if (Date.now() < (token.accessTokenExpires as number) - 120_000) {
        return token;
      }

      // Token expirado → refrescar
      try {
        const res = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID!,
            client_secret: process.env.GOOGLE_CLIENT_SECRET!,
            grant_type: 'refresh_token',
            refresh_token: token.refreshToken as string,
          }),
        });
        const refreshed = await res.json();
        if (!res.ok) throw refreshed;
        return {
          ...token,
          accessToken: refreshed.access_token,
          accessTokenExpires: Date.now() + refreshed.expires_in * 1000,
          refreshToken: refreshed.refresh_token ?? token.refreshToken,
        };
      } catch (err) {
        console.error('[auth] Error al refrescar token:', err);
        return { ...token, error: 'RefreshAccessTokenError' };
      }
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string;
      if (token.error) session.error = token.error as string;
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
});
