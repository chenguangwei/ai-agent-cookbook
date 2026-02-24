import Link from 'next/link';
import Image from 'next/image';
import { Search, ArrowUpRight, Terminal, Activity, Database, Sparkles, Command } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { TutorialBadge } from '@/components/features/TutorialBadge';
import { getFeaturedTutorials } from '@/lib/tina';
import { getTranslations } from 'next-intl/server';

const repositorySegments = [
  {
    titleKey: 'categories.foundation',
    icon: Activity,
    descKey: 'categories.foundation',
    href: '/explore?cat=llms',
  },
  {
    titleKey: 'categories.workflows',
    icon: Terminal,
    descKey: 'categories.workflows',
    href: '/explore?cat=workflows',
  },
  {
    titleKey: 'categories.practice',
    icon: Database,
    descKey: 'categories.practice',
    href: '/practice',
  },
  {
    titleKey: 'categories.showcase',
    icon: Sparkles,
    descKey: 'categories.showcase',
    href: '/showcase',
  },
];

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations('Home');
  const tCat = await getTranslations('Home.categories');

  const featuredTutorials = await getFeaturedTutorials(4, locale);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <Header />

      <main className="flex-1">
        <div className="max-w-[1200px] mx-auto px-6 py-16 lg:py-24">
          {/* Hero Section */}
          <div className="flex flex-col items-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 text-primary-600 dark:text-primary-400 text-[10px] font-bold mb-8 tracking-[0.2em] uppercase shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-500"></span>
              </span>
              {t('systemStatus')}
            </div>
            <h1 className="text-slate-900 dark:text-white tracking-tighter text-5xl md:text-7xl lg:text-8xl font-bold leading-[1.1] text-center max-w-5xl mb-8 font-display">
              {t.rich('title', {
                span: (chunks) => (
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-indigo-600">
                    {chunks}
                  </span>
                )
              })}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-lg md:text-xl text-center max-w-2xl leading-relaxed font-light">
              {t('subtitle')}
            </p>
          </div>

          {/* Search Box */}
          <div className="max-w-2xl mx-auto mb-32">
            <div className="group relative">
              <div className="flex w-full items-center rounded-2xl h-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] hover:shadow-lg transition-shadow">
                <div className="pl-6 text-slate-400">
                  <Search className="w-6 h-6" />
                </div>
                <input
                  className="flex-1 w-full bg-transparent border-none text-lg text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none px-4"
                  placeholder={t('searchPlaceholder')}
                />
                <div className="pr-6">
                  <kbd className="hidden md:inline-flex items-center gap-1 px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs text-slate-400 font-bold font-mono">
                    <Command className="w-3 h-3" /> K
                  </kbd>
                </div>
              </div>
            </div>
          </div>

          {/* Hot Topics Section */}
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-4">
              <div className="h-6 w-1 bg-primary-600 rounded-full"></div>
              <h2 className="text-slate-900 dark:text-white text-xl font-bold tracking-widest uppercase font-display">
                {t('hotTopics')}
              </h2>
            </div>
            <Link
              href="/explore"
              className="text-primary-600 dark:text-primary-400 text-xs font-bold uppercase tracking-widest hover:underline transition-all flex items-center gap-2"
            >
              {t('viewAll')} <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Featured Tutorials Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-32">
            {featuredTutorials.map((tutorial) => (
              <Link
                href={`/tutorial/${tutorial?.slug}`}
                key={tutorial?.id}
                className="group flex flex-col gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 hover:shadow-xl hover:shadow-primary-500/5 hover:border-primary-200 dark:hover:border-primary-800 transition-all duration-300"
              >
                <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800">
                  {tutorial?.thumbnail && (
                    <Image
                      src={tutorial.thumbnail}
                      alt={tutorial?.title || ''}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                    />
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <TutorialBadge type="difficulty" value={tutorial?.difficulty || 'Beginner'} />
                  </div>
                  <h3 className="text-slate-900 dark:text-white font-bold leading-tight group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                    {tutorial?.title}
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 text-xs line-clamp-2 leading-relaxed">
                    {tutorial?.description}
                  </p>
                </div>
              </Link>
            ))}
          </div>

          {/* Repository Segments Section */}
          <div className="flex items-center gap-4 mt-24 mb-12">
            <div className="h-6 w-1 bg-primary-600 rounded-full"></div>
            <h2 className="text-slate-900 dark:text-white text-xl font-bold tracking-widest uppercase font-display">
              {t('repositorySegments')}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {repositorySegments.map((item) => (
              <Link
                href={item.href}
                key={item.titleKey}
                className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-2xl hover:border-primary-600 dark:hover:border-primary-600 hover:shadow-lg transition-all cursor-pointer"
              >
                <div className="w-14 h-14 rounded-xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center mb-6 group-hover:bg-primary-600 transition-colors duration-300">
                  <item.icon className="text-primary-600 dark:text-primary-400 group-hover:text-white w-7 h-7 transition-colors duration-300" />
                </div>
                <h3 className="font-bold text-lg mb-2 text-slate-900 dark:text-white uppercase tracking-wider font-display">
                  {item.titleKey === 'categories.foundation' ? tCat('foundation') :
                    item.titleKey === 'categories.workflows' ? tCat('workflows') :
                      item.titleKey === 'categories.practice' ? tCat('practice') :
                        tCat('showcase')}
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed uppercase tracking-tight">
                  {item.titleKey === 'categories.foundation' ? tCat('foundation') :
                    item.titleKey === 'categories.workflows' ? tCat('workflows') :
                      item.titleKey === 'categories.practice' ? tCat('practice') :
                        tCat('showcase')}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
