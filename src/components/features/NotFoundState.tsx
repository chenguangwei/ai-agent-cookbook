import Link from 'next/link';
import { ArrowLeft, BookOpen, SearchX } from 'lucide-react';
import { defaultLocale, type Locale } from '@/i18n/config';
import { SITE_NAME } from '@/lib/utils';

const copy: Record<Locale, {
  eyebrow: string;
  title: string;
  description: string;
  backHome: string;
  browseTutorials: string;
}> = {
  en: {
    eyebrow: '404 error',
    title: 'Page not found',
    description: 'The page may have been moved, deleted, or never existed.',
    backHome: 'Back to home',
    browseTutorials: 'Browse tutorials',
  },
  zh: {
    eyebrow: '404 错误',
    title: '页面未找到',
    description: '这个页面可能已被移动、删除，或从未存在过。',
    backHome: '返回首页',
    browseTutorials: '浏览教程',
  },
  ja: {
    eyebrow: '404 エラー',
    title: 'ページが見つかりません',
    description: 'ページが移動されたか、削除されたか、最初から存在しなかった可能性があります。',
    backHome: 'ホームに戻る',
    browseTutorials: 'チュートリアルを見る',
  },
  ko: {
    eyebrow: '404 오류',
    title: '페이지를 찾을 수 없습니다',
    description: '페이지가 이동되었거나 삭제되었거나, 처음부터 존재하지 않았을 수 있습니다.',
    backHome: '홈으로 돌아가기',
    browseTutorials: '튜토리얼 보기',
  },
};

interface NotFoundStateProps {
  homeHref: string;
  locale?: string;
}

export function NotFoundState({
  homeHref,
  locale = defaultLocale,
}: NotFoundStateProps) {
  const resolvedLocale = (locale in copy ? locale : defaultLocale) as Locale;
  const t = copy[resolvedLocale];
  const tutorialsHref =
    homeHref === '/' ? '/tutorials' : `${homeHref.replace(/\/$/, '')}/tutorials`;

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-16 text-slate-900 dark:bg-slate-950 dark:text-white">
      <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-3xl items-center justify-center">
        <section className="w-full overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_30px_80px_-40px_rgba(15,23,42,0.35)] dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-200 bg-gradient-to-br from-primary-50 via-white to-slate-100 px-8 py-8 dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 sm:px-10">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary-200 bg-white/80 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-primary-700 dark:border-primary-900 dark:bg-slate-900/80 dark:text-primary-300">
              <SearchX className="h-4 w-4" />
              {t.eyebrow}
            </div>
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
              {SITE_NAME}
            </p>
            <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
              {t.title}
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-slate-600 dark:text-slate-400 sm:text-lg">
              {t.description}
            </p>
          </div>

          <div className="flex flex-col gap-4 px-8 py-8 sm:flex-row sm:px-10">
            <Link
              href={homeHref}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-primary-700"
            >
              <ArrowLeft className="h-4 w-4" />
              {t.backHome}
            </Link>
            <Link
              href={tutorialsHref}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 transition-colors hover:border-primary-300 hover:text-primary-700 dark:border-slate-700 dark:text-slate-200 dark:hover:border-primary-700 dark:hover:text-primary-300"
            >
              <BookOpen className="h-4 w-4" />
              {t.browseTutorials}
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
