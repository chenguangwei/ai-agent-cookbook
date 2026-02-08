'use client';

import Link from 'next/link';
import { Sparkles, FileText, ImageIcon, Tags, Globe, ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export default function CreatorStudioPage() {
  const t = useTranslations('CreatorStudio');

  const features = [
    {
      icon: FileText,
      title: 'Rich Text Editor',
      description: 'Write tutorials with a full-featured rich text editor supporting headings, code blocks, lists, and more.',
    },
    {
      icon: ImageIcon,
      title: 'Media Manager',
      description: 'Drag and drop images directly into your content. Built-in media library for easy asset management.',
    },
    {
      icon: Tags,
      title: 'Metadata Forms',
      description: 'Auto-generated forms for title, category, tags, difficulty, and all tutorial properties.',
    },
    {
      icon: Globe,
      title: 'Multi-language',
      description: 'Create tutorials in English, Chinese, Japanese, and more with locale-aware content management.',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <Header />

      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-6 py-16 lg:py-24">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center justify-center size-16 bg-primary-100 dark:bg-primary-900/30 rounded-2xl mb-6">
              <Sparkles className="w-8 h-8 text-primary-600 dark:text-primary-400" />
            </div>
            <h1 className="text-slate-900 dark:text-white text-4xl font-bold mb-4 font-display">
              {t('title')}
            </h1>
            <p className="text-slate-600 dark:text-slate-400 text-lg max-w-2xl mx-auto mb-8">
              Create and manage tutorials with our powerful admin interface. Rich text editing, media upload, metadata forms, and instant preview — all in one place.
            </p>
            <Link href="/admin">
              <Button size="lg" className="bg-primary-600 hover:bg-primary-700 text-white font-bold text-base px-8 py-6 rounded-xl shadow-lg shadow-primary-500/20">
                Open Admin Panel
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 size-10 bg-primary-50 dark:bg-primary-900/20 rounded-xl flex items-center justify-center">
                      <Icon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div>
                      <h3 className="text-slate-900 dark:text-white font-bold mb-1">{feature.title}</h3>
                      <p className="text-slate-500 dark:text-slate-400 text-sm">{feature.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Additional Info */}
          <div className="mt-12 p-6 bg-primary-50 dark:bg-primary-900/20 rounded-2xl border border-primary-100 dark:border-primary-800/50 text-center">
            <p className="text-primary-900 dark:text-primary-100 text-sm font-medium mb-2">
              Powered by TinaCMS
            </p>
            <p className="text-primary-700 dark:text-primary-300 text-xs">
              All content is stored as Git-backed MDX and JSON files, fully version-controlled and portable.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
