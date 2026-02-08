import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Agent Hub - AI Agent Tutorials & Resources',
    short_name: 'Agent Hub',
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
