'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Grid, Cpu, GitMerge, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';

const categoryMeta = [
  { id: 'frameworks', name: 'Frameworks', icon: Grid },
  { id: 'llms', name: 'LLM Models', icon: Cpu },
  { id: 'workflows', name: 'Workflows', icon: GitMerge },
  { id: 'cases', name: 'Real-world Cases', icon: Briefcase },
];

export function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    async function loadCounts() {
      try {
        const res = await fetch('/api/search-index');
        const docs = await res.json();
        const tutorials = docs.filter((d: { type: string }) => d.type === 'tutorial');
        const categoryMap: Record<string, string> = {
          'Frameworks': 'frameworks',
          'LLM Models': 'llms',
          'Agentic Workflows': 'workflows',
          'Real-world Cases': 'cases',
        };
        const newCounts: Record<string, number> = {};
        for (const t of tutorials) {
          const catId = categoryMap[t.category] || t.category;
          newCounts[catId] = (newCounts[catId] || 0) + 1;
        }
        setCounts(newCounts);
      } catch {
        // fallback to empty counts
      }
    }
    loadCounts();
  }, []);

  const getLinkClass = (cat: string) => {
    const currentCat = searchParams.get('cat');
    if (pathname === '/explore' && currentCat === cat) {
      return 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 border-primary-200 dark:border-primary-800';
    }
    return 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 border-transparent';
  };

  return (
    <aside className="w-64 flex-shrink-0 hidden lg:block">
      <div className="sticky top-24 flex flex-col gap-8">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col">
            <h3 className="text-slate-900 dark:text-slate-200 text-xs font-bold uppercase tracking-wider mb-1">
              Categories
            </h3>
            <p className="text-slate-500 dark:text-slate-500 text-[10px]">
              Explore agentic AI landscape
            </p>
          </div>
          <nav className="flex flex-col gap-1">
            {categoryMeta.map((category) => {
              const Icon = category.icon;
              const count = counts[category.id] || 0;
              return (
                <Link
                  key={category.id}
                  href={`/explore?cat=${category.id}`}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg border transition-all ${getLinkClass(category.id)}`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{category.name}</span>
                  </div>
                  <span
                    className={`text-xs font-medium px-1.5 py-0.5 rounded-md ${
                      searchParams.get('cat') === category.id
                        ? 'bg-primary-100 dark:bg-primary-800/30 text-primary-700 dark:text-primary-300'
                        : 'bg-slate-200/50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300'
                    }`}
                  >
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
              Request Tutorial
            </Button>
          </Link>
        </div>
      </div>
    </aside>
  );
}
