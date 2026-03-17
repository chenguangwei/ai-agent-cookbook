import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://agenthub.dev';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations('News');

  // Build canonical URL based on locale
  const canonicalUrl = locale === 'en'
    ? `${siteUrl}/news`
    : `${siteUrl}/${locale}/news`;

  return {
    title: t('seoTitle') || t('title'),
    description: t('seoDescription') || t('description'),
    alternates: {
      canonical: canonicalUrl,
      languages: {
        'en': `${siteUrl}/news`,
        'zh': `${siteUrl}/zh/news`,
        'ja': `${siteUrl}/ja/news`,
      },
    },
  };
}

export default function NewsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
