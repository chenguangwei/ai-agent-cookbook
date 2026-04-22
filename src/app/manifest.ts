import { MetadataRoute } from 'next';
import { SITE_NAME } from '@/lib/utils';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} - AI Agent Tutorials & Resources`,
    short_name: SITE_NAME,
    description: 'The definitive repository for autonomous architectures. Professional workflows built for the next generation of AI developers.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0f172a',
    theme_color: '#2563eb',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  };
}
