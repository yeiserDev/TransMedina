import type { Metadata, Viewport } from 'next';
import './globals.css';
import { SessionProvider } from 'next-auth/react';
import { Toaster } from 'sonner';
import PwaRuntime from '@/components/PwaRuntime';

export const metadata: Metadata = {
  title: 'TransMedina',
  description: 'Gestión de viajes de transporte',
  applicationName: 'TransMedina',
  appleWebApp: { capable: true, title: 'TransMedina', statusBarStyle: 'default' },
  other: { 'apple-mobile-web-app-capable': 'yes' },
  icons: {
    icon: [{ url: '/pwa/favicon-32.png', sizes: '32x32', type: 'image/png' }],
    apple: [{ url: '/pwa/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#F3F0EE',
  colorScheme: 'light',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full">
      <body className="min-h-full">
        <PwaRuntime />
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
