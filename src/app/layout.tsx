import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { Providers } from "./providers";
import { getSiteUrl } from "@/lib/utils";

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
  title: {
    default: "Agent Cookbook - AI Agent 教程、实战、工具与资讯平台",
    template: "%s | Agent Cookbook",
  },
  description:
    "Agent Cookbook 是专业的 AI Agent 教程与资源平台。提供 Agent 实战案例、Agent 工具推荐、Agent 新闻资讯，包含 OpenCLAW、LangChain、LangGraph 等框架的详细教程。",
  keywords: [
    "AI Agent",
    "Agent 教程",
    "Agent 实战",
    "Agent 工具",
    "Agent 新闻",
    "Agent 资讯",
    "OpenCLAW",
    "OpenClaw",
    "LangChain",
    "LangGraph",
    "Autonomous AI",
    "Multi-Agent Systems",
    "LLM",
    "GPT",
    "Claude",
    "AI 智能体",
    "AI 开发教程",
  ],
  authors: [{ name: "Agent Cookbook Team" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://agent-cookbook.com",
    siteName: "Agent Cookbook",
    title: "Agent Cookbook - AI Agent 教程、实战、工具与资讯平台",
    description:
      "Agent Cookbook 是专业的 AI Agent 教程与资源平台。提供 Agent 实战案例、Agent 工具推荐、Agent 新闻资讯。",
  },
  twitter: {
    card: "summary_large_image",
    title: "Agent Cookbook - AI Agent 教程、实战、工具与资讯平台",
    description:
      "Agent Cookbook 是专业的 AI Agent 教程与资源平台。提供 Agent 实战案例、Agent 工具推荐、Agent 新闻资讯。",
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
