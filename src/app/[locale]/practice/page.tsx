import { Suspense } from 'react';
import Image from 'next/image';
import { Play, Users, Wrench } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Sidebar } from '@/components/layout/Sidebar';
import { TutorialBadge } from '@/components/features/TutorialBadge';
import { Button } from '@/components/ui/button';
import { getAllPracticeLabs } from '@/lib/tina';
import { getTranslations } from 'next-intl/server';

export default async function PracticePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const labs = await getAllPracticeLabs(locale);
  const t = await getTranslations('Practice');

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
                  <div
                    key={lab?.id}
                    className="flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden hover:shadow-xl hover:shadow-primary-500/5 transition-all duration-300"
                  >
                    {/* Thumbnail */}
                    <div className="relative w-full aspect-video bg-slate-100 dark:bg-slate-800">
                      {lab?.thumbnail && (
                        <Image
                          src={lab.thumbnail}
                          alt={lab.title}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        />
                      )}
                      {/* Environment Badge */}
                      <div className="absolute top-3 left-3">
                        <span className="px-2 py-1 rounded-lg bg-black/50 backdrop-blur-sm text-white text-xs font-bold">
                          {lab?.environment}
                        </span>
                      </div>
                      {/* Status Indicator */}
                      <div className="absolute top-3 right-3">
                        <span
                          className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-bold ${
                            lab?.status === 'Online'
                              ? 'bg-emerald-500/20 text-emerald-400 backdrop-blur-sm'
                              : 'bg-orange-500/20 text-orange-400 backdrop-blur-sm'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              lab?.status === 'Online' ? 'bg-emerald-400' : 'bg-orange-400'
                            }`}
                          />
                          {lab?.status}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex flex-col gap-4 p-5">
                      <div className="flex items-center justify-between">
                        <TutorialBadge type="difficulty" value={lab?.difficulty || 'Beginner'} />
                        {lab?.status === 'Online' && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                            <Users className="w-3.5 h-3.5" />
                            {lab?.usersOnline} {t('online')}
                          </div>
                        )}
                      </div>

                      <div>
                        <h3 className="text-slate-900 dark:text-white font-bold text-lg mb-2">
                          {lab?.title}
                        </h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm line-clamp-2">
                          {lab?.description}
                        </p>
                      </div>

                      <Button
                        className={`w-full ${
                          lab?.status === 'Online'
                            ? 'bg-primary-600 hover:bg-primary-700'
                            : 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed'
                        }`}
                        disabled={lab?.status !== 'Online'}
                      >
                        {lab?.status === 'Online' ? (
                          <>
                            <Play className="w-4 h-4 mr-2" />
                            {t('launchEnvironment')}
                          </>
                        ) : (
                          <>
                            <Wrench className="w-4 h-4 mr-2" />
                            {t('underMaintenance')}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
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
