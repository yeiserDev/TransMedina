import type { Metadata } from 'next';
import './globals.css';
import { SessionProvider } from 'next-auth/react';
import { Toaster } from 'sonner';

export const metadata: Metadata = {
  title: 'TransMedina',
  description: 'Gestión de viajes de transporte',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full">
      <body className="min-h-full">
        <SessionProvider>{children}</SessionProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#FCFBFA',
              border: '1px solid rgba(20,20,19,.12)',
              color: '#141413',
              fontSize: '13px',
              fontFamily: "'Sofia Sans Variable', Arial, sans-serif",
              fontWeight: '450',
              borderRadius: '20px',
              boxShadow: 'rgba(0,0,0,.08) 0px 24px 48px 0px',
            },
          }}
        />
      </body>
    </html>
  );
}
