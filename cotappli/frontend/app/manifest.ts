import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "COT'APPLI — Gestion de cotisations et caisses communes",
    short_name: "COT'APPLI",
    description:
      "Centralisez et suivez en temps réel les cotisations de votre association, tontine ou collecte d'événement.",
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#F7F4EE',
    theme_color: '#0D3733',
    orientation: 'portrait',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      {
        src: '/icon-512-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}