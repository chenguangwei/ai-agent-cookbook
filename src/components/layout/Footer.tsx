import Link from 'next/link';
import { Zap, Globe, Layout } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { SITE_NAME } from '@/lib/utils';

export function Footer() {
  const t = useTranslations('Footer');
  const tNav = useTranslations('Navigation');

  return (
    <footer className="mt-auto border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-12 px-10 transition-colors">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start gap-12">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 text-primary-600 font-bold">
            <Zap className="w-6 h-6" />
            <span className="font-display">{SITE_NAME} - Agent 教程 | 实战 | 工具 | 资讯</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed uppercase tracking-wider">
            {t('repoDescription')}
          </p>
        </div>

        <div className="flex gap-16 text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
          <div className="flex flex-col gap-4">
            <span className="text-slate-900 dark:text-slate-200">{t('platform')}</span>
            <Link
              href="/tutorials"
              className="hover:text-primary-600 dark:hover:text-primary-400"
            >
              {tNav('tutorials')}
            </Link>
            <Link
              href="/practice"
              className="hover:text-primary-600 dark:hover:text-primary-400"
            >
              {t('practice')}
            </Link>
          </div>
        </div>

        <div className="flex gap-4">
          <button className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors">
            <Globe className="w-5 h-5" />
          </button>
          <button className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors">
            <Layout className="w-5 h-5" />
          </button>
        </div>
      </div>
    </footer>
  );
}
