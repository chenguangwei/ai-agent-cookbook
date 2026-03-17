import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://agenthub.dev';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations('RequestForm');
  const path = 'request';
  const canonicalUrl = locale === 'en' ? `${siteUrl}/${path}` : `${siteUrl}/${locale}/${path}`;

  return {
    title: t('title'),
    alternates: {
      canonical: canonicalUrl,
      languages: {
        'en': `${siteUrl}/${path}`,
        'zh': `${siteUrl}/zh/${path}`,
        'ja': `${siteUrl}/ja/${path}`,
      },
    },
  };
}

export default function RequestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
