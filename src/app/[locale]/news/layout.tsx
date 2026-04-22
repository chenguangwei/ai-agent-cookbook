import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { buildLocaleAlternates, getCanonicalUrl } from '@/lib/utils';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations('News');

  return {
    title: t('seoTitle') || t('title'),
    description: t('seoDescription') || t('description'),
    alternates: {
      canonical: getCanonicalUrl(locale, 'news'),
      languages: buildLocaleAlternates('news'),
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
