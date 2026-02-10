'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  Grid, Cpu, GitMerge, Briefcase, Database, MessageSquare,
  Code, Terminal, Monitor, Tag, BarChart3, Package,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import { TUTORIAL_CATEGORIES, categoryValueToId } from '@/lib/categories';
import { TOOL_CATEGORIES, toolCategoryValueToId } from '@/lib/tool-categories';
import { LAB_ENVIRONMENTS, LAB_DIFFICULTIES } from '@/lib/practice-filters';
import { locales, defaultLocale } from '@/i18n/config';

// --- Icon maps ---

const categoryIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  'grid': Grid,
  'cpu': Cpu,
  'git-merge': GitMerge,
  'briefcase': Briefcase,
  'database': Database,
  'message-square': MessageSquare,
};

const envIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  'code': Code,
  'terminal': Terminal,
  'monitor': Monitor,
};

// --- Shared types ---

interface SearchDoc {
  type: string;
  category?: string;
  tags?: string[];
  environment?: string;
  difficulty?: string;
  locale?: string;
}

// --- Style helpers ---

const ACTIVE_CLASS = 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 border-primary-200 dark:border-primary-800';
const DEFAULT_CLASS = 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 border-transparent';
const ACTIVE_BADGE = 'bg-primary-100 dark:bg-primary-800/30 text-primary-700 dark:text-primary-300';
const DEFAULT_BADGE = 'bg-slate-200/50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300';

// ============================================================
// Main Sidebar — dispatches to context-specific sub-component
// ============================================================

export function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [docs, setDocs] = useState<SearchDoc[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/search-index');
        setDocs(await res.json());
      } catch {
        // fallback to empty
      }
    }
    loadData();
  }, []);

  // Extract locale from pathname, e.g. "/zh/showcase" → "zh"
  // With localePrefix: 'as-needed', English URLs don't have /en/ prefix
  const locale = useMemo(() => {
    const firstSegment = pathname.split('/').filter(Boolean)[0] || '';
    return (locales as readonly string[]).includes(firstSegment) ? firstSegment : defaultLocale;
  }, [pathname]);

  // Filter docs by current locale so counts don't mix languages
  const localeDocs = useMemo(() => {
    return docs.filter(d => !d.locale || d.locale === locale);
  }, [docs, locale]);

  const pageContext = useMemo(() => {
    if (pathname.includes('/practice')) return 'practice';
    if (pathname.includes('/showcase')) return 'showcase';
    if (pathname.includes('/tools')) return 'tools';
    return 'explore';
  }, [pathname]);

  return (
    <aside className="w-64 flex-shrink-0 hidden lg:block">
      <div className="sticky top-24 flex flex-col gap-8">
        {pageContext === 'explore' && (
          <ExploreSidebar docs={localeDocs} searchParams={searchParams} />
        )}
        {pageContext === 'practice' && (
          <PracticeSidebar docs={localeDocs} searchParams={searchParams} />
        )}
        {pageContext === 'showcase' && (
          <ShowcaseSidebar docs={localeDocs} searchParams={searchParams} />
        )}
        {pageContext === 'tools' && (
          <ToolsSidebar docs={localeDocs} searchParams={searchParams} />
        )}
      </div>
    </aside>
  );
}

// ============================================================
// Explore Sidebar — tutorial categories (existing behavior)
// ============================================================

function ExploreSidebar({
  docs,
  searchParams,
}: {
  docs: SearchDoc[];
  searchParams: ReturnType<typeof useSearchParams>;
}) {
  const tCat = useTranslations('Categories');
  const tSidebar = useTranslations('Sidebar');

  const counts = useMemo(() => {
    const tutorials = docs.filter(d => d.type === 'tutorial');
    const c: Record<string, number> = {};
    for (const t of tutorials) {
      const catId = categoryValueToId[t.category || ''] || t.category || '';
      c[catId] = (c[catId] || 0) + 1;
    }
    return c;
  }, [docs]);

  const currentCat = searchParams.get('cat');

  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col">
          <h3 className="text-slate-900 dark:text-slate-200 text-xs font-bold uppercase tracking-wider mb-1">
            {tSidebar('categories')}
          </h3>
          <p className="text-slate-500 dark:text-slate-500 text-[10px]">
            {tSidebar('explore')}
          </p>
        </div>
        <nav className="flex flex-col gap-1">
          {TUTORIAL_CATEGORIES.map((category) => {
            const Icon = categoryIconMap[category.icon] || Grid;
            const count = counts[category.id] || 0;
            const isActive = currentCat === category.id;
            return (
              <Link
                key={category.id}
                href={`/explore?cat=${category.id}`}
                className={`flex items-center justify-between px-3 py-2 rounded-lg border transition-all ${isActive ? ACTIVE_CLASS : DEFAULT_CLASS}`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{tCat(category.i18nKey)}</span>
                </div>
                <span className={`text-xs font-medium px-1.5 py-0.5 rounded-md ${isActive ? ACTIVE_BADGE : DEFAULT_BADGE}`}>
                  {count}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex flex-col gap-4">
        <Link href="/request">
          <Button className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold">
            <span className="text-lg mr-1">+</span>
            {tSidebar('requestTutorial')}
          </Button>
        </Link>
      </div>
    </>
  );
}

// ============================================================
// Practice Sidebar — environment + difficulty filters
// ============================================================

function PracticeSidebar({
  docs,
  searchParams,
}: {
  docs: SearchDoc[];
  searchParams: ReturnType<typeof useSearchParams>;
}) {
  const tSidebar = useTranslations('Sidebar');

  const labs = useMemo(() => docs.filter(d => d.type === 'lab'), [docs]);

  const envCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const lab of labs) {
      if (lab.environment) c[lab.environment] = (c[lab.environment] || 0) + 1;
    }
    return c;
  }, [labs]);

  const difficultyCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const lab of labs) {
      if (lab.difficulty) c[lab.difficulty] = (c[lab.difficulty] || 0) + 1;
    }
    return c;
  }, [labs]);

  const currentEnv = searchParams.get('env');
  const currentDifficulty = searchParams.get('difficulty');

  const buildHref = (paramName: string, value: string) => {
    const params = new URLSearchParams();
    if (paramName === 'env') {
      params.set('env', value);
      if (currentDifficulty) params.set('difficulty', currentDifficulty);
    } else {
      params.set('difficulty', value);
      if (currentEnv) params.set('env', currentEnv);
    }
    return `/practice?${params.toString()}`;
  };

  return (
    <>
      {/* Environment Section */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col">
          <h3 className="text-slate-900 dark:text-slate-200 text-xs font-bold uppercase tracking-wider mb-1">
            {tSidebar('environment')}
          </h3>
          <p className="text-slate-500 dark:text-slate-500 text-[10px]">
            {tSidebar('browseByEnv')}
          </p>
        </div>
        <nav className="flex flex-col gap-1">
          {LAB_ENVIRONMENTS.map((env) => {
            const Icon = envIconMap[env.icon] || Code;
            const count = envCounts[env.value] || 0;
            const isActive = currentEnv === env.value;
            return (
              <Link
                key={env.id}
                href={buildHref('env', env.value)}
                className={`flex items-center justify-between px-3 py-2 rounded-lg border transition-all ${isActive ? ACTIVE_CLASS : DEFAULT_CLASS}`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{env.value}</span>
                </div>
                <span className={`text-xs font-medium px-1.5 py-0.5 rounded-md ${isActive ? ACTIVE_BADGE : DEFAULT_BADGE}`}>
                  {count}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-slate-200 dark:border-slate-800" />

      {/* Difficulty Section */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col">
          <h3 className="text-slate-900 dark:text-slate-200 text-xs font-bold uppercase tracking-wider mb-1">
            {tSidebar('difficulty')}
          </h3>
          <p className="text-slate-500 dark:text-slate-500 text-[10px]">
            {tSidebar('browseByDifficulty')}
          </p>
        </div>
        <nav className="flex flex-col gap-1">
          {LAB_DIFFICULTIES.map((diff) => {
            const count = difficultyCounts[diff] || 0;
            const isActive = currentDifficulty === diff;
            return (
              <Link
                key={diff}
                href={buildHref('difficulty', diff)}
                className={`flex items-center justify-between px-3 py-2 rounded-lg border transition-all ${isActive ? ACTIVE_CLASS : DEFAULT_CLASS}`}
              >
                <div className="flex items-center gap-3">
                  <BarChart3 className="w-4 h-4" />
                  <span className="text-sm font-medium">{diff}</span>
                </div>
                <span className={`text-xs font-medium px-1.5 py-0.5 rounded-md ${isActive ? ACTIVE_BADGE : DEFAULT_BADGE}`}>
                  {count}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}

// ============================================================
// Showcase Sidebar — dynamic tag filters
// ============================================================

function ShowcaseSidebar({
  docs,
  searchParams,
}: {
  docs: SearchDoc[];
  searchParams: ReturnType<typeof useSearchParams>;
}) {
  const tSidebar = useTranslations('Sidebar');

  const tagCounts = useMemo(() => {
    const showcases = docs.filter(d => d.type === 'showcase');
    const c: Record<string, number> = {};
    for (const s of showcases) {
      for (const tag of s.tags || []) {
        c[tag] = (c[tag] || 0) + 1;
      }
    }
    return Object.entries(c)
      .sort((a, b) => b[1] - a[1])
      .map(([tag, count]) => ({ tag, count }));
  }, [docs]);

  const currentTag = searchParams.get('tag');

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col">
        <h3 className="text-slate-900 dark:text-slate-200 text-xs font-bold uppercase tracking-wider mb-1">
          {tSidebar('tags')}
        </h3>
        <p className="text-slate-500 dark:text-slate-500 text-[10px]">
          {tSidebar('browseByTag')}
        </p>
      </div>
      <nav className="flex flex-col gap-1">
        {tagCounts.map(({ tag, count }) => {
          const isActive = currentTag === tag;
          return (
            <Link
              key={tag}
              href={`/showcase?tag=${encodeURIComponent(tag)}`}
              className={`flex items-center justify-between px-3 py-2 rounded-lg border transition-all ${isActive ? ACTIVE_CLASS : DEFAULT_CLASS}`}
            >
              <div className="flex items-center gap-3">
                <Tag className="w-4 h-4" />
                <span className="text-sm font-medium">{tag}</span>
              </div>
              <span className={`text-xs font-medium px-1.5 py-0.5 rounded-md ${isActive ? ACTIVE_BADGE : DEFAULT_BADGE}`}>
                {count}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

// ============================================================
// Tools Sidebar — category + pricing filters
// ============================================================

function ToolsSidebar({
  docs,
  searchParams,
}: {
  docs: SearchDoc[];
  searchParams: ReturnType<typeof useSearchParams>;
}) {
  const tCat = useTranslations('ToolCategories');
  const tSidebar = useTranslations('Sidebar');

  const tools = useMemo(() => docs.filter(d => d.type === 'tool'), [docs]);

  const categoryCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const t of tools) {
      const catId = toolCategoryValueToId[t.category || ''] || t.category || '';
      c[catId] = (c[catId] || 0) + 1;
    }
    return c;
  }, [tools]);

  const currentCat = searchParams.get('cat');
  const currentPricing = searchParams.get('pricing');

  const buildHref = (paramName: string, value: string) => {
    const params = new URLSearchParams();
    if (paramName === 'cat') {
      params.set('cat', value);
      if (currentPricing) params.set('pricing', currentPricing);
    } else {
      params.set('pricing', value);
      if (currentCat) params.set('cat', currentCat);
    }
    return `/tools?${params.toString()}`;
  };

  return (
    <>
      {/* Categories Section */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col">
          <h3 className="text-slate-900 dark:text-slate-200 text-xs font-bold uppercase tracking-wider mb-1">
            {tSidebar('categories')}
          </h3>
          <p className="text-slate-500 dark:text-slate-500 text-[10px]">
            {tSidebar('browseByCategory')}
          </p>
        </div>
        <nav className="flex flex-col gap-1">
          {TOOL_CATEGORIES.map((category) => {
            const count = categoryCounts[category.id] || 0;
            const isActive = currentCat === category.id;
            return (
              <Link
                key={category.id}
                href={buildHref('cat', category.id)}
                className={`flex items-center justify-between px-3 py-2 rounded-lg border transition-all ${isActive ? ACTIVE_CLASS : DEFAULT_CLASS}`}
              >
                <div className="flex items-center gap-3">
                  <Package className="w-4 h-4" />
                  <span className="text-sm font-medium">{tCat(category.i18nKey)}</span>
                </div>
                <span className={`text-xs font-medium px-1.5 py-0.5 rounded-md ${isActive ? ACTIVE_BADGE : DEFAULT_BADGE}`}>
                  {count}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-slate-200 dark:border-slate-800" />

      {/* Pricing Section */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col">
          <h3 className="text-slate-900 dark:text-slate-200 text-xs font-bold uppercase tracking-wider mb-1">
            {tSidebar('pricing')}
          </h3>
          <p className="text-slate-500 dark:text-slate-500 text-[10px]">
            {tSidebar('browseByPricing')}
          </p>
        </div>
        <nav className="flex flex-col gap-1">
          {['Open Source', 'Free', 'Freemium', 'Paid'].map((pricing) => {
            const count = tools.filter(t => (t as SearchDoc & { pricing?: string }).pricing === pricing).length;
            const isActive = currentPricing === pricing;
            return (
              <Link
                key={pricing}
                href={buildHref('pricing', pricing)}
                className={`flex items-center justify-between px-3 py-2 rounded-lg border transition-all ${isActive ? ACTIVE_CLASS : DEFAULT_CLASS}`}
              >
                <div className="flex items-center gap-3">
                  <Tag className="w-4 h-4" />
                  <span className="text-sm font-medium">{pricing}</span>
                </div>
                <span className={`text-xs font-medium px-1.5 py-0.5 rounded-md ${isActive ? ACTIVE_BADGE : DEFAULT_BADGE}`}>
                  {count}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}
