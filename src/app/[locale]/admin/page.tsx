'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Newspaper, Globe, Settings } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function AdminPage() {
  const t = useTranslations('Admin');
  const tNav = useTranslations('Navigation');

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link
            href="/news"
            className="block p-6 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-primary-500 dark:hover:border-primary-500 transition-colors"
          >
            <div className="flex items-center gap-3 mb-2">
              <Newspaper className="w-6 h-6 text-primary-600" />
              <h2 className="text-xl font-semibold">News Management</h2>
            </div>
            <p className="text-slate-600 dark:text-slate-400">
              Manage RSS feeds, pending items, and approved news
            </p>
          </Link>

          <Link
            href="/translate"
            className="block p-6 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-primary-500 dark:hover:border-primary-500 transition-colors"
          >
            <div className="flex items-center gap-3 mb-2">
              <Globe className="w-6 h-6 text-primary-600" />
              <h2 className="text-xl font-semibold">Translation</h2>
            </div>
            <p className="text-slate-600 dark:text-slate-400">
              Translate content across all languages
            </p>
          </Link>

          <a
            href="/admin"
            className="block p-6 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-primary-500 dark:hover:border-primary-500 transition-colors"
          >
            <div className="flex items-center gap-3 mb-2">
              <Settings className="w-6 h-6 text-primary-600" />
              <h2 className="text-xl font-semibold">TinaCMS</h2>
            </div>
            <p className="text-slate-600 dark:text-slate-400">
              Content management system
            </p>
          </a>
        </div>
      </main>
      <Footer />
    </div>
  );
}
