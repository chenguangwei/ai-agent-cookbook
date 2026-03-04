import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    // Disable image optimization for external domains that may have CORS restrictions
    // This is useful for social media images (Twitter/X, etc.)
    unoptimized: true,
  },
};

export default withNextIntl(nextConfig);
