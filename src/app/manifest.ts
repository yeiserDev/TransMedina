import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'TransMedina',
    short_name: 'TransMedina',
    description: 'Viajes, documentos y depósitos de TransMedina.',
    lang: 'es-PE',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#F3F0EE',
    theme_color: '#F3F0EE',
    icons: [
      { src: '/pwa/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/pwa/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/pwa/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    categories: ['business', 'productivity'],
  };
}
