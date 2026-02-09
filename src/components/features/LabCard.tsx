'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Play, Users, Wrench, X, ExternalLink, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TutorialBadge } from '@/components/features/TutorialBadge';
import { useTranslations } from 'next-intl';

interface LabCardProps {
  lab: {
    id?: string | null;
    title: string;
    description?: string | null;
    environment?: string | null;
    difficulty?: string | null;
    status?: string | null;
    usersOnline?: number | null;
    thumbnail?: string | null;
    launchUrl?: string | null;
    launchMode?: string | null;
  };
}

// Resolve URL template variables, e.g. {GITHUB_REPO} → env value
function resolveUrl(url: string): { url: string; hasError: boolean; errorMessage?: string } {
  const repo = process.env.NEXT_PUBLIC_GITHUB_REPO;

  // Check if URL contains placeholder
  if (url.includes('{GITHUB_REPO}')) {
    if (!repo || repo === 'your-username/ai-agent-cookbook') {
      return {
        url,
        hasError: true,
        errorMessage: 'GitHub repository not configured. Please set NEXT_PUBLIC_GITHUB_REPO in .env.local'
      };
    }
    return {
      url: url.replace(/\{GITHUB_REPO\}/g, repo),
      hasError: false
    };
  }

  return { url, hasError: false };
}

export function LabCard({ lab }: LabCardProps) {
  const [iframeOpen, setIframeOpen] = useState(false);
  const t = useTranslations('Practice');

  const resolved = lab.launchUrl ? resolveUrl(lab.launchUrl) : null;
  const launchUrl = resolved?.url || null;
  const hasConfigError = resolved?.hasError || false;
  const configErrorMessage = resolved?.errorMessage;
  const isOnline = lab.status === 'Online';
  const hasUrl = !!launchUrl && !hasConfigError;

  const handleLaunch = () => {
    if (!isOnline || !hasUrl || hasConfigError) return;

    if (lab.launchMode === 'iframe') {
      setIframeOpen(true);
    } else {
      window.open(launchUrl!, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <>
      <div className="flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden hover:shadow-xl hover:shadow-primary-500/5 transition-all duration-300">
        {/* Thumbnail */}
        <div className="relative w-full aspect-video bg-slate-100 dark:bg-slate-800">
          {lab.thumbnail && (
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
              {lab.environment}
            </span>
          </div>
          {/* Status Indicator */}
          <div className="absolute top-3 right-3">
            <span
              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-bold ${
                isOnline
                  ? 'bg-emerald-500/20 text-emerald-400 backdrop-blur-sm'
                  : 'bg-orange-500/20 text-orange-400 backdrop-blur-sm'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isOnline ? 'bg-emerald-400' : 'bg-orange-400'
                }`}
              />
              {lab.status}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-col gap-4 p-5">
          <div className="flex items-center justify-between">
            <TutorialBadge type="difficulty" value={lab.difficulty || 'Beginner'} />
            {isOnline && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <Users className="w-3.5 h-3.5" />
                {lab.usersOnline} {t('online')}
              </div>
            )}
          </div>

          <div>
            <h3 className="text-slate-900 dark:text-white font-bold text-lg mb-2">
              {lab.title}
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm line-clamp-2">
              {lab.description}
            </p>
          </div>

          <Button
            className={`w-full ${
              isOnline && hasUrl && !hasConfigError
                ? 'bg-primary-600 hover:bg-primary-700'
                : 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed'
            }`}
            disabled={!isOnline || !hasUrl || hasConfigError}
            onClick={handleLaunch}
            title={hasConfigError ? configErrorMessage : undefined}
          >
            {!isOnline ? (
              <>
                <Wrench className="w-4 h-4 mr-2" />
                {t('underMaintenance')}
              </>
            ) : hasConfigError ? (
              <>
                <Wrench className="w-4 h-4 mr-2" />
                Config Required
              </>
            ) : (
              <>
                {lab.launchMode === 'iframe' ? (
                  <Maximize2 className="w-4 h-4 mr-2" />
                ) : (
                  <Play className="w-4 h-4 mr-2" />
                )}
                {t('launchEnvironment')}
                {lab.launchMode === 'external' && (
                  <ExternalLink className="w-3 h-3 ml-1.5 opacity-60" />
                )}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Iframe Modal */}
      {iframeOpen && launchUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIframeOpen(false)}
          />
          {/* Modal */}
          <div className="relative w-[95vw] h-[90vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col z-10">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
              <div className="flex items-center gap-3">
                <span className="px-2 py-0.5 rounded bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-xs font-bold">
                  {lab.environment}
                </span>
                <h3 className="text-slate-900 dark:text-white font-bold text-sm">
                  {lab.title}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={launchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
                  title="Open in new tab"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  onClick={() => setIframeOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            {/* Iframe */}
            <iframe
              src={launchUrl}
              className="flex-1 w-full border-0"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals allow-downloads"
              allow="clipboard-read; clipboard-write; cross-origin-isolated"
              title={lab.title}
            />
          </div>
        </div>
      )}
    </>
  );
}
