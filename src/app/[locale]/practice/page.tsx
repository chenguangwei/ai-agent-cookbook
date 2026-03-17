import { Suspense } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Sidebar } from '@/components/layout/Sidebar';
import { LabCard } from '@/components/features/LabCard';
import { getAllPracticeLabs } from '@/lib/content';
import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://agenthub.dev';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations('Practice');
  const path = 'practice';
  const canonicalUrl = locale === 'en' ? `${siteUrl}/${path}` : `${siteUrl}/${locale}/${path}`;

  return {
    title: t('title'),
    description: t('description'),
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

// ISR: Revalidate every 60 seconds
export const revalidate = 60;

interface PracticePageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ env?: string; difficulty?: string }>;
}

export default async function PracticePage({ params, searchParams }: PracticePageProps) {
  const { locale } = await params;
  const { env, difficulty } = await searchParams;
  let labs = getAllPracticeLabs(locale);
  const t = await getTranslations('Practice');

  if (env) {
    labs = labs.filter(l => l?.environment === env);
  }
  if (difficulty) {
    labs = labs.filter(l => l?.difficulty === difficulty);
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <Header />

      <main className="flex-1">
        <div className="max-w-[1400px] mx-auto px-6 py-8 lg:py-12">
          <div className="flex gap-8">
            {/* Sidebar */}
            <Suspense fallback={<div className="w-64 flex-shrink-0 hidden lg:block" />}>
              <Sidebar />
            </Suspense>

            {/* Main Content */}
            <div className="flex-1 min-w-0">
              {/* Header */}
              <div className="mb-8">
                <h1 className="text-slate-900 dark:text-white text-3xl font-bold mb-2 font-display">
                  {t('title')}
                </h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm max-w-2xl">
                  {t('description')}
                </p>
              </div>

              {/* Labs Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {labs.map((lab) => (
                  <LabCard
                    key={lab?.title}
                    lab={{
                      title: lab?.title || '',
                      description: lab?.description,
                      environment: lab?.environment,
                      difficulty: lab?.difficulty,
                      status: lab?.status,
                      usersOnline: lab?.usersOnline,
                      thumbnail: lab?.thumbnail,
                      launchUrl: lab?.launchUrl,
                      launchMode: lab?.launchMode,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
