import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'VANTA',
    short_name: 'VANTA',
    start_url: '/',
    display: 'standalone',
    background_color: '#081d17',
    theme_color: '#081d17',
    description: 'Plateforme premium de comptes eFootball vérifiés.',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
  };
}
