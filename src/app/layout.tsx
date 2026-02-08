import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Agent Hub - AI Agent Tutorials & Resources",
    template: "%s | Agent Hub",
  },
  description:
    "The definitive repository for autonomous architectures. Professional workflows built for the next generation of AI developers.",
  keywords: [
    "AI Agent",
    "LangChain",
    "LangGraph",
    "Autonomous AI",
    "Multi-Agent Systems",
    "LLM",
    "GPT",
    "Claude",
  ],
  authors: [{ name: "Agent Hub Team" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://agenthub.dev",
    siteName: "Agent Hub",
    title: "Agent Hub - AI Agent Tutorials & Resources",
    description:
      "The definitive repository for autonomous architectures. Professional workflows built for the next generation of AI developers.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Agent Hub - AI Agent Tutorials & Resources",
    description:
      "The definitive repository for autonomous architectures. Professional workflows built for the next generation of AI developers.",
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
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} font-sans antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
