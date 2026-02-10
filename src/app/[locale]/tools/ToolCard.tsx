'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Star, ExternalLink, BookOpen, Github } from 'lucide-react';

interface ToolCardProps {
  tool: {
    id: string;
    title: string;
    slug: string;
    description: string;
    category?: string | null | undefined;
    tags?: (string | null)[] | null | undefined;
    logoUrl?: string | null | undefined;
    websiteUrl?: string | null | undefined;
    repoUrl?: string | null | undefined;
    docsUrl?: string | null | undefined;
    pricing?: string | null | undefined;
    stars?: number | null | undefined;
    featured?: boolean | null | undefined;
  };
  locale: string;
  categoryLabel?: string;
  websiteLabel: string;
  githubLabel: string;
  docsLabel: string;
}

function isValidUrl(url: string | null | undefined): url is string {
  return !!url && url !== '#' && url.startsWith('http');
}

export function ToolCard({
  tool,
  locale,
  categoryLabel,
  websiteLabel,
  githubLabel,
  docsLabel,
}: ToolCardProps) {
  return (
    <div className="group flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden hover:shadow-xl hover:shadow-primary-500/5 hover:border-primary-200 dark:hover:border-primary-800 transition-all duration-300">
      {/* Logo / Header */}
      <div className="relative w-full aspect-[2/1] bg-gradient-to-br from-primary-50 to-slate-50 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center p-6">
        {tool.logoUrl ? (
          <Image
            src={tool.logoUrl}
            alt={tool.title}
            width={120}
            height={120}
            className="object-contain max-h-24"
          />
        ) : (
          <div className="w-24 h-24 rounded-2xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
            <span className="text-3xl font-bold text-primary-600 dark:text-primary-400">
              {tool.title?.charAt(0) || '?'}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-slate-900 dark:text-white font-bold text-lg leading-tight group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
            <Link href={`/${locale}/tools/${tool.slug}`}>
              {tool.title}
            </Link>
          </h3>
          {tool.stars != null && tool.stars > 0 && (
            <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 flex-shrink-0">
              <Star className="w-3.5 h-3.5 text-yellow-500" />
              <span className="font-medium">{tool.stars.toLocaleString()}</span>
            </div>
          )}
        </div>

        <p className="text-slate-500 dark:text-slate-400 text-sm line-clamp-2">
          {tool.description}
        </p>

        {/* Badges */}
        <div className="flex flex-wrap gap-2">
          {tool.pricing && (
            <span className="px-2 py-0.5 rounded bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-[10px] font-bold uppercase tracking-wider">
              {tool.pricing}
            </span>
          )}
          {categoryLabel && (
            <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
              {categoryLabel}
            </span>
          )}
          {(tool.tags || []).filter((t): t is string => t !== null).slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Quick Links */}
        <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          {isValidUrl(tool.websiteUrl) && (
            <a
              href={tool.websiteUrl!}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 hover:border-primary-300 dark:hover:border-primary-700 transition-colors"
              title={websiteLabel}
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
          {isValidUrl(tool.repoUrl) && (
            <a
              href={tool.repoUrl!}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 hover:border-primary-300 dark:hover:border-primary-700 transition-colors"
              title={githubLabel}
            >
              <Github className="w-3.5 h-3.5" />
            </a>
          )}
          {isValidUrl(tool.docsUrl) && (
            <a
              href={tool.docsUrl!}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 hover:border-primary-300 dark:hover:border-primary-700 transition-colors"
              title={docsLabel}
            >
              <BookOpen className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
