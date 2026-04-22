import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { buildLocaleAlternates, getCanonicalUrl } from '@/lib/utils';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations('RequestForm');

  return {
    title: t('title'),
    alternates: {
      canonical: getCanonicalUrl(locale, 'request'),
      languages: buildLocaleAlternates('request'),
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
