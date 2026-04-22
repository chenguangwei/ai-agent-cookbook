import { getLocale } from 'next-intl/server';
import { NotFoundState } from '@/components/features/NotFoundState';

export default async function LocalizedNotFound() {
  const locale = await getLocale();

  return <NotFoundState homeHref={`/${locale}`} locale={locale} />;
}
