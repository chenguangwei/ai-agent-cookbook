import { Metadata } from 'next';
import { getSiteUrl } from '@/lib/utils';

export async function generateMetadata({ params }: { params: Promise<{ locale: string; id: string }> }): Promise<Metadata> {
  const { locale, id } = await params;
  const siteUrl = getSiteUrl();

  // Build canonical URL based on locale
  const canonicalUrl = locale === 'en'
    ? `${siteUrl}/news/${id}`
    : `${siteUrl}/${locale}/news/${id}`;

  return {
    alternates: {
      canonical: canonicalUrl,
      languages: {
        'en': `${siteUrl}/news/${id}`,
        'zh': `${siteUrl}/zh/news/${id}`,
        'ja': `${siteUrl}/ja/news/${id}`,
      },
    },
  };
}

export default function NewsDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
