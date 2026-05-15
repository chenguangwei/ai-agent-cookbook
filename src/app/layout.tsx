import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { Providers } from "./providers";
import { getSiteUrl, SITE_NAME } from "@/lib/utils";
import { defaultSiteSeo } from "@/lib/seo";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  applicationName: SITE_NAME,
  title: {
    default: `${defaultSiteSeo.title} | ${SITE_NAME}`,
    template: `%s | ${SITE_NAME}`,
  },
  description: defaultSiteSeo.description,
  keywords: defaultSiteSeo.keywords,
  authors: [{ name: `${SITE_NAME} Team` }],
  openGraph: {
    type: "website",
    locale: defaultSiteSeo.openGraphLocale,
    url: getSiteUrl(),
    siteName: SITE_NAME,
    title: `${defaultSiteSeo.title} | ${SITE_NAME}`,
    description: defaultSiteSeo.description,
  },
  twitter: {
    card: "summary_large_image",
    title: `${defaultSiteSeo.title} | ${SITE_NAME}`,
    description: defaultSiteSeo.description,
  },
  robots: {
    index: true,
    follow: true,
  },
};

interface RootLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale?: string }>;
}

export default async function RootLayout({
  children,
  params,
}: RootLayoutProps) {
  const resolvedParams = await params;
  const locale = resolvedParams?.locale || 'en';

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        {/* Google Analytics */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-W9ST50GCP0"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-W9ST50GCP0');
          `}
        </Script>
      </head>
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} font-sans antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
