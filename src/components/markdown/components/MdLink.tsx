import React from 'react';
import NextLink from 'next/link';
import { ExternalLink } from 'lucide-react';

export function MdLink({ url, children }: { url: string; children: React.ReactNode }) {
  const isExternal = url.startsWith('http');

  if (isExternal) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary-600 dark:text-primary-400 hover:underline inline-flex items-center gap-1"
      >
        {children}
        <ExternalLink className="w-3.5 h-3.5 inline flex-shrink-0" />
      </a>
    );
  }

  return (
    <NextLink href={url} className="text-primary-600 dark:text-primary-400 hover:underline">
      {children}
    </NextLink>
  );
}
